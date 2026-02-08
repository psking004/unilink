
-- Enable Row Level Security on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add is_approved column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

-- Drop existing administrative policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles 
FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy: Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles 
FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- NEW: Refined policy to allow admins to delete other profiles
-- Uses the specific subquery check requested by the user
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy: Users can always view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- SCHEMA UPDATE: Configure foreign keys for submissions to support cascading deletes
-- This ensures that when a profile is removed, their submissions are purged automatically
ALTER TABLE public.submissions 
DROP CONSTRAINT IF EXISTS submissions_student_id_fkey;

ALTER TABLE public.submissions
ADD CONSTRAINT submissions_student_id_fkey 
  FOREIGN KEY (student_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Also ensure assignments cascade delete to submissions for total data hygiene
ALTER TABLE public.submissions 
DROP CONSTRAINT IF EXISTS submissions_assignment_id_fkey;

ALTER TABLE public.submissions
ADD CONSTRAINT submissions_assignment_id_fkey 
  FOREIGN KEY (assignment_id) 
  REFERENCES public.assignments(id) 
  ON DELETE CASCADE;

-- Secure backend function to purge identity from both auth.users and public.profiles
-- This function uses SECURITY DEFINER to bypass standard user limitations when deleting from auth.users
CREATE OR REPLACE FUNCTION purge_user_identity(target_id UUID)
RETURNS void AS $$
BEGIN
  -- Security Check: Ensure the executor is an administrator
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Access level 3 required for identity purge.';
  END IF;

  -- Delete from auth.users
  -- Because profiles(id) references auth.users(id) ON DELETE CASCADE, 
  -- and submissions(student_id) now references profiles(id) ON DELETE CASCADE,
  -- this single delete will wipe the user's entire footprint.
  DELETE FROM auth.users WHERE id = target_id;
  
  -- Explicitly delete from profiles just in case the FK from auth.users 
  -- to public.profiles isn't set to cascade in all environments.
  DELETE FROM public.profiles WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
