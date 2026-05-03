-- 1. Add attachments column
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Storage bucket for notice attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('notice-attachments', 'notice-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for notice-attachments bucket
DROP POLICY IF EXISTS "Notice attachments public read" ON storage.objects;
CREATE POLICY "Notice attachments public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'notice-attachments');

DROP POLICY IF EXISTS "Staff upload notice attachments" ON storage.objects;
CREATE POLICY "Staff upload notice attachments" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'notice-attachments' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff update notice attachments" ON storage.objects;
CREATE POLICY "Staff update notice attachments" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'notice-attachments' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff delete notice attachments" ON storage.objects;
CREATE POLICY "Staff delete notice attachments" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'notice-attachments' AND public.is_staff(auth.uid()));

-- 3. Demo notices (only seed if no notices exist yet)
DO $$
DECLARE
  demo_author uuid;
BEGIN
  SELECT user_id INTO demo_author FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF demo_author IS NULL THEN
    RETURN;
  END IF;

  IF (SELECT COUNT(*) FROM public.notices) > 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.notices (title, content, category, deadline, base_urgency, visibility, notice_type, author_id, author_name) VALUES
  -- Task-based
  ('Cloud Computing Assignment', 'Submit your assignment on Cloud Service Models (IaaS / PaaS / SaaS) with at least 4 pages of explanation and architecture diagrams.', 'Academic', now() + interval '5 days', 'important', 'general', 'task', demo_author, 'Demo Administrator'),
  ('AI Record Submission', 'Complete and submit your AI laboratory record covering all 10 listed experiments. Late submissions will be marked as missed.', 'Academic', now() + interval '3 days', 'urgent', 'general', 'task', demo_author, 'Demo Administrator'),
  ('Mini Project Review Submission', 'Upload your mini project review-2 documents — abstract, design, and implementation status — for evaluation.', 'Academic', now() + interval '7 days', 'normal', 'general', 'task', demo_author, 'Demo Administrator'),
  ('Internal Exam Preparation Task', 'Solve and submit the practice question bank shared in class for the upcoming internal exam.', 'Academic', now() + interval '4 days', 'important', 'general', 'task', demo_author, 'Demo Administrator'),
  ('Database Systems Assignment', 'Implement the given ER schema in PostgreSQL and submit the SQL script along with sample queries.', 'Academic', now() + interval '6 days', 'normal', 'general', 'task', demo_author, 'Demo Administrator'),

  -- Informational
  ('Hall Ticket Released', 'Hall tickets for upcoming internal examinations have been released. Collect from your respective department offices before Friday.', 'Alert', now() + interval '6 days', 'important', 'general', 'info', demo_author, 'Demo Administrator'),
  ('Sports Day Schedule', 'Annual Sports Day is scheduled next Saturday. The full event schedule and venue list have been published on the notice board.', 'Event', now() + interval '8 days', 'normal', 'general', 'info', demo_author, 'Demo Administrator'),
  ('Industrial Visit Announcement', 'Industrial visit to TechCorp Bangalore on the 20th. Eligible students must complete the consent form by this Wednesday.', 'Event', now() + interval '10 days', 'important', 'general', 'info', demo_author, 'Demo Administrator'),
  ('Cultural Event Agenda', 'The cultural fest agenda is now live — covering music, dance, drama, and tech-fun events. Register your team at the cultural desk.', 'Social', now() + interval '12 days', 'low', 'general', 'info', demo_author, 'Demo Administrator'),
  ('Bring Passport Size Photo', 'All students are required to bring 2 recent passport-size photographs by Monday for ID card and exam record updates.', 'General', now() + interval '4 days', 'normal', 'general', 'info', demo_author, 'Demo Administrator');
END $$;