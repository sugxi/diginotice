CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
  _year integer;
  _section text;
BEGIN
  IF (NEW.raw_user_meta_data->>'role') IN ('teacher', 'student') THEN
    _role := (NEW.raw_user_meta_data->>'role')::public.app_role;
  ELSE
    _role := 'student'::public.app_role;
  END IF;

  _year := NULLIF(NEW.raw_user_meta_data->>'year', '')::integer;
  _section := NULLIF(NEW.raw_user_meta_data->>'section', '');

  INSERT INTO public.profiles (
    id,
    name,
    email,
    year,
    section,
    register_number,
    roll_number,
    faculty_id,
    department
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    _year,
    _section,
    NULLIF(NEW.raw_user_meta_data->>'register_number', ''),
    NULLIF(NEW.raw_user_meta_data->>'roll_number', ''),
    NULLIF(NEW.raw_user_meta_data->>'faculty_id', ''),
    NULLIF(NEW.raw_user_meta_data->>'department', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    year = EXCLUDED.year,
    section = EXCLUDED.section,
    register_number = EXCLUDED.register_number,
    roll_number = EXCLUDED.roll_number,
    faculty_id = EXCLUDED.faculty_id,
    department = EXCLUDED.department;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();