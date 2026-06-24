-- User profiles linked to Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  venmo_handle TEXT,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automatically create a profile row when a new auth user signs up.
-- The display_name defaults to the part of the email address before the "@".
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, updated_at)
  VALUES (
    NEW.id,
    COALESCE(SPLIT_PART(NEW.email, '@', 1), ''),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
