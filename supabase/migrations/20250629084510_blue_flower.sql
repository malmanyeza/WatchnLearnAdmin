/*
  # Fix RLS Policy Infinite Recursion
  
  This migration fixes the infinite recursion error in the profiles table
  RLS policies by updating the is_admin_user function to use SECURITY DEFINER
  with SQL language instead of PL/pgSQL.
*/

-- Drop and recreate the is_admin_user function with proper SECURITY DEFINER
DROP FUNCTION IF EXISTS is_admin_user(UUID);

CREATE OR REPLACE FUNCTION public.is_admin_user(uid uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role = ANY (ARRAY['admin', 'super_admin'])
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Recreate the policies using the fixed function
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  );