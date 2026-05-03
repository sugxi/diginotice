-- Attach handle_new_user trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users that are missing profiles/roles
INSERT INTO public.profiles (id, name, email, year, section, register_number, roll_number, faculty_id, department)
SELECT u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email,'@',1)),
  u.email,
  NULLIF(u.raw_user_meta_data->>'year','')::INT,
  NULLIF(u.raw_user_meta_data->>'section',''),
  NULLIF(u.raw_user_meta_data->>'register_number',''),
  NULLIF(u.raw_user_meta_data->>'roll_number',''),
  NULLIF(u.raw_user_meta_data->>'faculty_id',''),
  NULLIF(u.raw_user_meta_data->>'department','')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
  CASE WHEN COALESCE(u.raw_user_meta_data->>'role','student') IN ('teacher') THEN 'teacher'::app_role
       ELSE 'student'::app_role END
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;