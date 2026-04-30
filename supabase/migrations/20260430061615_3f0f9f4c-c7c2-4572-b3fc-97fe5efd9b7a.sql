
CREATE OR REPLACE FUNCTION public.notify_new_notice()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.visibility = 'faculty' THEN
    INSERT INTO public.notifications (user_id, notice_id, type, title, message)
    SELECT ur.user_id, NEW.id, 'new_notice',
           'New Faculty Notice: ' || NEW.title,
           'A new faculty-only notice has been posted. Deadline: ' || to_char(NEW.deadline, 'Mon DD, YYYY HH24:MI')
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','teacher');
  ELSIF NEW.visibility = 'general' THEN
    INSERT INTO public.notifications (user_id, notice_id, type, title, message)
    SELECT ur.user_id, NEW.id, 'new_notice',
           'New Notice: ' || NEW.title,
           'A new notice has been posted. Deadline: ' || to_char(NEW.deadline, 'Mon DD, YYYY HH24:MI')
    FROM public.user_roles ur
    WHERE ur.role = 'student';
  ELSE -- targeted
    INSERT INTO public.notifications (user_id, notice_id, type, title, message)
    SELECT p.id, NEW.id, 'new_notice',
           'New Notice: ' || NEW.title,
           'A new notice has been posted for you. Deadline: ' || to_char(NEW.deadline, 'Mon DD, YYYY HH24:MI')
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'student'
    WHERE (cardinality(NEW.target_years) = 0 OR p.year = ANY(NEW.target_years))
      AND (cardinality(NEW.target_sections) = 0 OR p.section = ANY(NEW.target_sections));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_notice
AFTER INSERT ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.notify_new_notice();
