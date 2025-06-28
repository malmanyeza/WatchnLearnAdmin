/*
  # Storage Setup for WatchnLearn Admin System
  
  1. Create storage buckets for file uploads
  2. Set up storage policies for secure access
*/

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('content-files', 'content-files', false),
  ('past-papers', 'past-papers', false),
  ('marking-schemes', 'marking-schemes', false),
  ('textbook-covers', 'textbook-covers', true),
  ('syllabus-files', 'syllabus-files', false),
  ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for content files
CREATE POLICY "Authenticated users can upload content files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'content-files' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can view content files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'content-files' AND
    auth.role() = 'authenticated'
  );

-- Storage policies for past papers
CREATE POLICY "Admins can upload past papers" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'past-papers' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can view past papers" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'past-papers' AND
    auth.role() = 'authenticated'
  );

-- Storage policies for marking schemes
CREATE POLICY "Admins can upload marking schemes" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'marking-schemes' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can view marking schemes" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'marking-schemes' AND
    auth.role() = 'authenticated'
  );

-- Storage policies for textbook covers (public)
CREATE POLICY "Anyone can view textbook covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'textbook-covers');

CREATE POLICY "Admins can upload textbook covers" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'textbook-covers' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- Storage policies for syllabus files
CREATE POLICY "Admins can upload syllabus files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'syllabus-files' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can view syllabus files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'syllabus-files' AND
    auth.role() = 'authenticated'
  );

-- Storage policies for user avatars (public)
CREATE POLICY "Anyone can view user avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can upload their own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated'
  );