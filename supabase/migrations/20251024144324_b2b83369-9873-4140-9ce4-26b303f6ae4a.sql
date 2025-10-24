-- Fix the search_path security issue by using schema-qualified names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'accounts@reaadvertising.com' THEN
    user_role := 'estimator'::public.app_role;
  ELSIF NEW.email IN ('anand@reaadvertising.com', 'reena@reaadvertising.com') THEN
    user_role := 'admin'::public.app_role;
  ELSE
    -- Default to estimator for any other email
    user_role := 'estimator'::public.app_role;
  END IF;

  -- Insert the user role
  INSERT INTO public.user_roles (user_id, email, role)
  VALUES (NEW.id, NEW.email, user_role);

  RETURN NEW;
END;
$$;