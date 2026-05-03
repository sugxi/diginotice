
-- Trigger to create notifications when a notice is inserted, based on visibility/targeting
CREATE OR REPLACE FUNCTION public.notify_users_on_notice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id uuid;
  msg text;
BEGIN
  msg := 'A new notice has been posted.' ||
    CASE WHEN NEW.deadline IS NOT NULL
         THEN ' Deadline: ' || to_char(NEW.deadline, 'Mon DD, YYYY HH24:MI')
         ELSE '' END;

  FOR recipient_id IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id <> COALESCE(NEW.author_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        NEW.visibility = 'general'
        OR (NEW.visibility = 'faculty' AND ur.role IN ('teacher','admin'))
        OR (NEW.visibility = 'targeted' AND (
             (COALESCE(array_length(NEW.target_years,1),0) = 0 OR p.year = ANY(NEW.target_years))
             AND
             (COALESCE(array_length(NEW.target_sections,1),0) = 0 OR p.section = ANY(NEW.target_sections))
           ))
      )
  LOOP
    INSERT INTO public.notifications (user_id, notice_id, type, title, message, read)
    VALUES (recipient_id, NEW.id, NEW.notice_type::text,
            'New Notice: ' || NEW.title, msg, false);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_notice_insert_notify ON public.notices;
CREATE TRIGGER on_notice_insert_notify
AFTER INSERT ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.notify_users_on_notice();
