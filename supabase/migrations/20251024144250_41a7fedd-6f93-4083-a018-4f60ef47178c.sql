-- Drop the existing RLS policy for user_roles INSERT
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

-- Create new RLS policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (true);

-- Create function to automatically assign roles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'accounts@reaadvertising.com' THEN
    user_role := 'estimator';
  ELSIF NEW.email IN ('anand@reaadvertising.com', 'reena@reaadvertising.com') THEN
    user_role := 'admin';
  ELSE
    -- Default to estimator for any other email
    user_role := 'estimator';
  END IF;

  -- Insert the user role
  INSERT INTO public.user_roles (user_id, email, role)
  VALUES (NEW.id, NEW.email, user_role);

  RETURN NEW;
END;
$$;

-- Create trigger to automatically assign roles on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();