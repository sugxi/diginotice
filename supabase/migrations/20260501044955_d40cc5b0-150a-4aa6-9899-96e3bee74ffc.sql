-- 1. Extend profiles with role-specific identifiers
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS register_number TEXT,
  ADD COLUMN IF NOT EXISTS roll_number TEXT,
  ADD COLUMN IF NOT EXISTS faculty_id TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT;

-- 2. Replace handle_new_user to persist new metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _year INT;
  _section TEXT;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student');
  _year := NULLIF(NEW.raw_user_meta_data->>'year','')::INT;
  _section := NULLIF(NEW.raw_user_meta_data->>'section','');

  INSERT INTO public.profiles (id, name, email, year, section, register_number, roll_number, faculty_id, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    _year,
    _section,
    NULLIF(NEW.raw_user_meta_data->>'register_number',''),
    NULLIF(NEW.raw_user_meta_data->>'roll_number',''),
    NULLIF(NEW.raw_user_meta_data->>'faculty_id',''),
    NULLIF(NEW.raw_user_meta_data->>'department','')
  );

  -- Public signup is restricted to student/teacher; admin role can only be granted by an existing admin
  IF _role = 'admin' THEN
    _role := 'student';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$function$;

-- 3. Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();