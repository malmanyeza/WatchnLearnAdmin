/*
  # Fix RLS Policies for Terms Table
  
  This migration fixes the Row Level Security policies for the terms table
  to allow admin users to perform CRUD operations when creating subjects.
  
  1. Security Policies
    - Enable RLS on terms table
    - Add INSERT policy for admin users
    - Add SELECT policy for admin users  
    - Add UPDATE policy for admin users
    - Add DELETE policy for admin users
*/

-- Ensure RLS is enabled on terms table
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can insert terms" ON terms;
DROP POLICY IF EXISTS "Admins can select terms" ON terms;
DROP POLICY IF EXISTS "Admins can update terms" ON terms;
DROP POLICY IF EXISTS "Admins can delete terms" ON terms;

-- Create comprehensive RLS policies for terms table
CREATE POLICY "Admins can insert terms" ON terms
  FOR INSERT WITH CHECK (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can select terms" ON terms
  FOR SELECT USING (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can update terms" ON terms
  FOR UPDATE USING (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can delete terms" ON terms
  FOR DELETE USING (
    is_admin_user(auth.uid())
  );

-- Also fix other related tables that might have similar issues
-- Weeks table
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert weeks" ON weeks;
DROP POLICY IF EXISTS "Admins can select weeks" ON weeks;
DROP POLICY IF EXISTS "Admins can update weeks" ON weeks;
DROP POLICY IF EXISTS "Admins can delete weeks" ON weeks;

CREATE POLICY "Admins can insert weeks" ON weeks
  FOR INSERT WITH CHECK (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can select weeks" ON weeks
  FOR SELECT USING (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can update weeks" ON weeks
  FOR UPDATE USING (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can delete weeks" ON weeks
  FOR DELETE USING (
    is_admin_user(auth.uid())
  );

-- Chapters table
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert chapters" ON chapters;
DROP POLICY IF EXISTS "Admins can select chapters" ON chapters;
DROP POLICY IF EXISTS "Admins can update chapters" ON chapters;
DROP POLICY IF EXISTS "Admins can delete chapters" ON chapters;

CREATE POLICY "Admins can insert chapters" ON chapters
  FOR INSERT WITH CHECK (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can select chapters" ON chapters
  FOR SELECT USING (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can update chapters" ON chapters
  FOR UPDATE USING (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can delete chapters" ON chapters
  FOR DELETE USING (
    is_admin_user(auth.uid())
  );

-- Re-enable RLS on subjects table with proper policies
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can select subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can update subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can delete subjects" ON subjects;

CREATE POLICY "Admins can insert subjects" ON subjects
  FOR INSERT WITH CHECK (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can select subjects" ON subjects
  FOR SELECT USING (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can update subjects" ON subjects
  FOR UPDATE USING (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can delete subjects" ON subjects
  FOR DELETE USING (
    is_admin_user(auth.uid())
  );

-- Re-enable RLS on content table with proper policies
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert content" ON content;
DROP POLICY IF EXISTS "Admins can select content" ON content;
DROP POLICY IF EXISTS "Admins can update content" ON content;
DROP POLICY IF EXISTS "Admins can delete content" ON content;

CREATE POLICY "Admins can insert content" ON content
  FOR INSERT WITH CHECK (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can select content" ON content
  FOR SELECT USING (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can update content" ON content
  FOR UPDATE USING (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can delete content" ON content
  FOR DELETE USING (
    is_admin_user(auth.uid())
  );