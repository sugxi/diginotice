
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE public.notice_visibility AS ENUM ('general', 'faculty', 'targeted');
CREATE TYPE public.task_status AS ENUM ('pending', 'in-progress', 'completed', 'missed');
CREATE TYPE public.urgency_level AS ENUM ('low', 'normal', 'important', 'urgent', 'expired');

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  year INT CHECK (year BETWEEN 1 AND 4),
  section TEXT CHECK (section ~ '^[A-Z]$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','teacher'))
$$;

CREATE POLICY "User roles viewable by authenticated users"
ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own role on signup"
ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============= NOTICES =============
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  deadline TIMESTAMPTZ NOT NULL,
  base_urgency urgency_level NOT NULL DEFAULT 'normal',
  visibility notice_visibility NOT NULL DEFAULT 'general',
  target_years INT[] DEFAULT '{}',
  target_sections TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Helper: can a student see this notice?
CREATE OR REPLACE FUNCTION public.notice_visible_to(_notice_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_staff(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.notices n
      LEFT JOIN public.profiles p ON p.id = _user_id
      WHERE n.id = _notice_id
        AND (
          n.visibility = 'general'
          OR (
            n.visibility = 'targeted'
            AND (cardinality(n.target_years) = 0 OR p.year = ANY(n.target_years))
            AND (cardinality(n.target_sections) = 0 OR p.section = ANY(n.target_sections))
          )
        )
    )
$$;

CREATE POLICY "Notices viewable by relevant users"
ON public.notices FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid())
  OR visibility = 'general'
  OR (
    visibility = 'targeted'
    AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
      AND (cardinality(target_years) = 0 OR p.year = ANY(target_years))
      AND (cardinality(target_sections) = 0 OR p.section = ANY(target_sections))
    )
  )
);

CREATE POLICY "Staff can create notices"
ON public.notices FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = author_id);

CREATE POLICY "Staff can update notices"
ON public.notices FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete notices"
ON public.notices FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX idx_notices_deadline ON public.notices(deadline);

-- ============= STUDENT TASK STATUSES =============
CREATE TABLE public.notice_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status task_status NOT NULL DEFAULT 'pending',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notice_id, student_id)
);
ALTER TABLE public.notice_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see their own statuses, staff see all"
ON public.notice_statuses FOR SELECT TO authenticated
USING (auth.uid() = student_id OR public.is_staff(auth.uid()));

CREATE POLICY "Students manage their own statuses"
ON public.notice_statuses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students update their own statuses"
ON public.notice_statuses FOR UPDATE TO authenticated
USING (auth.uid() = student_id);

-- ============= NOTIFICATIONS =============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notice_id UUID REFERENCES public.notices(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'new_notice', 'urgency_change', 'deadline_approaching', 'missed'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users update their own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System inserts notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

-- ============= AUTO PROFILE TRIGGER =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role app_role;
  _year INT;
  _section TEXT;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student');
  _year := NULLIF(NEW.raw_user_meta_data->>'year','')::INT;
  _section := NULLIF(NEW.raw_user_meta_data->>'section','');

  INSERT INTO public.profiles (id, name, email, year, section)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    _year,
    _section
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= AUTO-DELETE EXPIRED NOTICES (function used by edge fn) =============
CREATE OR REPLACE FUNCTION public.delete_expired_notices()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  deleted_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM public.notices WHERE deadline < now() RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$;

-- ============= REALTIME =============
ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notice_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============= SEED SAMPLE NOTICES (no author_id, system seed) =============
-- Use a staff RLS-bypass via SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public._seed_notices()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notices (title, content, category, deadline, base_urgency, visibility, author_name) VALUES
    ('URGENT: Final Exam Schedule Released','The final exam schedule has been released. All students must check their exam dates immediately. Failure to appear will result in automatic failure.','Academic', now() + interval '3 days','urgent','general','Academic Office'),
    ('Assignment Submission Deadline Extended','The submission deadline for the Database Management assignment has been extended. Please ensure all submissions are uploaded before the deadline.','Academic', now() + interval '6 days','important','targeted','Prof. Smith'),
    ('Workshop on Cloud Computing','A workshop on cloud computing fundamentals will be held in the seminar hall. Topics include AWS, Azure, and Google Cloud.','Event', now() + interval '12 days','normal','general','IT Department'),
    ('Library Hours Update','The library will have extended hours during the exam period. Open from 7 AM to 11 PM on weekdays.','General', now() + interval '20 days','low','general','Library Staff'),
    ('Emergency: Campus Power Outage Alert','Emergency alert! Scheduled power outage on campus today from 2 PM to 5 PM. Please save your work immediately.','Alert', now() + interval '2 days','urgent','general','Facilities Management'),
    ('Social Club Meeting - FYI','The social club will hold a casual meeting this Friday. Open to all students. Come join us for some fun activities and snacks!','Social', now() + interval '18 days','low','general','Student Council');

  -- Update the targeted one to year 3 section B for realism
  UPDATE public.notices
  SET target_years = ARRAY[3], target_sections = ARRAY['B']
  WHERE title = 'Assignment Submission Deadline Extended';
END;
$$;

SELECT public._seed_notices();
DROP FUNCTION public._seed_notices();
