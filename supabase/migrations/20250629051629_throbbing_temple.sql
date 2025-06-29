-- ================================
-- SUPABASE MIGRATIONS EXECUTION
-- ================================
-- This file contains the content of both migration files to be run in order
-- Copy and paste this entire content into your Supabase SQL Editor

-- ================================
-- MIGRATION 1: 20250629042445_fierce_mouse.sql
-- ================================

/*
  # Initial Schema for WatchnLearn Admin System

  1. Authentication & Users
    - profiles (extends auth.users)
    - admin_users
  
  2. Educational Structure
    - schools
    - subjects
    - subject_teachers
    - terms
    - weeks
    - chapters
  
  3. Content Management
    - content
    - content_views
  
  4. Past Papers
    - past_papers
    - past_paper_downloads
  
  5. Textbooks
    - textbooks
    - textbook_authors
  
  6. Syllabus
    - syllabi
    - syllabus_papers
    - syllabus_paper_topics
  
  7. User Management
    - user_enrollments
    - user_progress
  
  8. System & Analytics
    - system_settings
    - audit_logs
    - analytics_events
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AUTHENTICATION & USERS
-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin', 'super_admin')),
  school_id UUID,
  level TEXT CHECK (level IN ('JC', 'O-Level', 'A-Level')),
  exam_board TEXT CHECK (exam_board IN ('ZIMSEC', 'Cambridge')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  permissions TEXT[] DEFAULT '{}',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EDUCATIONAL STRUCTURE
-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  principal_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for profiles.school_id
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_school 
  FOREIGN KEY (school_id) REFERENCES schools(id);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL CHECK (level IN ('JC', 'O-Level', 'A-Level')),
  exam_board TEXT NOT NULL CHECK (exam_board IN ('ZIMSEC', 'Cambridge')),
  school_id UUID REFERENCES schools(id),
  icon TEXT DEFAULT 'BookOpen',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, level, exam_board, school_id)
);

-- Subject teachers table
CREATE TABLE IF NOT EXISTS subject_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  qualification TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Terms table
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, order_number)
);

-- Weeks table
CREATE TABLE IF NOT EXISTS weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(term_id, order_number)
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_number INTEGER NOT NULL,
  is_continuation BOOLEAN DEFAULT false,
  original_chapter_id UUID REFERENCES chapters(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_id, order_number)
);

-- 3. CONTENT MANAGEMENT
-- Content/Topics table
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'pdf', 'quiz', 'notes')),
  description TEXT,
  file_url TEXT,
  file_size BIGINT,
  duration TEXT,
  estimated_study_time TEXT,
  order_number INTEGER NOT NULL,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'review', 'archived')),
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chapter_id, order_number)
);

-- Content views tracking
CREATE TABLE IF NOT EXISTS content_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  duration_watched INTEGER,
  completed BOOLEAN DEFAULT false
);

-- 4. PAST PAPERS
-- Past papers table
CREATE TABLE IF NOT EXISTS past_papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  year INTEGER NOT NULL,
  month TEXT NOT NULL,
  paper_type TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('JC', 'O-Level', 'A-Level')),
  exam_board TEXT NOT NULL CHECK (exam_board IN ('ZIMSEC', 'Cambridge')),
  duration_hours DECIMAL(3,1) NOT NULL,
  total_marks INTEGER NOT NULL,
  description TEXT,
  question_paper_url TEXT NOT NULL,
  marking_scheme_url TEXT,
  has_marking_scheme BOOLEAN DEFAULT false,
  file_size TEXT,
  download_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'review', 'archived')),
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Past paper downloads tracking
CREATE TABLE IF NOT EXISTS past_paper_downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  past_paper_id UUID REFERENCES past_papers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_type TEXT CHECK (file_type IN ('question_paper', 'marking_scheme')),
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TEXTBOOKS
-- Textbooks table
CREATE TABLE IF NOT EXISTS textbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  publisher TEXT NOT NULL,
  edition TEXT,
  publication_year INTEGER NOT NULL,
  isbn TEXT,
  subject TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('JC', 'O-Level', 'A-Level')),
  exam_board TEXT NOT NULL CHECK (exam_board IN ('ZIMSEC', 'Cambridge')),
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Textbook authors table
CREATE TABLE IF NOT EXISTS textbook_authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  UNIQUE(textbook_id, order_number)
);

-- 6. SYLLABUS MANAGEMENT
-- Syllabi table
CREATE TABLE IF NOT EXISTS syllabi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('JC', 'O-Level', 'A-Level')),
  exam_board TEXT NOT NULL CHECK (exam_board IN ('ZIMSEC', 'Cambridge')),
  year INTEGER NOT NULL,
  overview TEXT NOT NULL,
  total_topics INTEGER DEFAULT 0,
  syllabus_file_url TEXT,
  assessment_file_url TEXT,
  specimen_file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, level, exam_board, year)
);

-- Syllabus papers table
CREATE TABLE IF NOT EXISTS syllabus_papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  syllabus_id UUID REFERENCES syllabi(id) ON DELETE CASCADE,
  paper_name TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(syllabus_id, order_number)
);

-- Syllabus paper topics table
CREATE TABLE IF NOT EXISTS syllabus_paper_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_id UUID REFERENCES syllabus_papers(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(paper_id, order_number)
);

-- 7. USER ENROLLMENTS & PROGRESS
-- User subject enrollments
CREATE TABLE IF NOT EXISTS user_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, subject_id)
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed_at TIMESTAMPTZ,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

-- 8. SYSTEM & ANALYTICS
-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  event_data JSONB,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_paper_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE textbook_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabi ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_paper_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
-- Profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin access: Super admins and admins can manage all data
CREATE POLICY "Admins can manage all data" ON content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage schools" ON schools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage subjects" ON subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage past papers" ON past_papers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage textbooks" ON textbooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage syllabi" ON syllabi
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- INDEXES FOR PERFORMANCE
-- User and authentication indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);

-- Content hierarchy indexes
CREATE INDEX IF NOT EXISTS idx_subjects_level_board ON subjects(level, exam_board);
CREATE INDEX IF NOT EXISTS idx_terms_subject_id ON terms(subject_id);
CREATE INDEX IF NOT EXISTS idx_weeks_term_id ON weeks(term_id);
CREATE INDEX IF NOT EXISTS idx_chapters_week_id ON chapters(week_id);
CREATE INDEX IF NOT EXISTS idx_content_chapter_id ON content(chapter_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);

-- Past papers indexes
CREATE INDEX IF NOT EXISTS idx_past_papers_subject_level ON past_papers(subject, level);
CREATE INDEX IF NOT EXISTS idx_past_papers_year_month ON past_papers(year, month);
CREATE INDEX IF NOT EXISTS idx_past_papers_exam_board ON past_papers(exam_board);

-- Textbooks indexes
CREATE INDEX IF NOT EXISTS idx_textbooks_subject_level ON textbooks(subject, level);
CREATE INDEX IF NOT EXISTS idx_textbooks_publication_year ON textbooks(publication_year);

-- User activity indexes
CREATE INDEX IF NOT EXISTS idx_content_views_user_id ON content_views(user_id);
CREATE INDEX IF NOT EXISTS idx_content_views_content_id ON content_views(content_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_user_id ON user_enrollments(user_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_date ON analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- FUNCTIONS AND TRIGGERS
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_updated_at ON content;
CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_past_papers_updated_at ON past_papers;
CREATE TRIGGER update_past_papers_updated_at BEFORE UPDATE ON past_papers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_textbooks_updated_at ON textbooks;
CREATE TRIGGER update_textbooks_updated_at BEFORE UPDATE ON textbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_syllabi_updated_at ON syllabi;
CREATE TRIGGER update_syllabi_updated_at BEFORE UPDATE ON syllabi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_content_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content 
  SET view_count = view_count + 1 
  WHERE id = NEW.content_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to increment view count when content is viewed
DROP TRIGGER IF EXISTS increment_view_count_trigger ON content_views;
CREATE TRIGGER increment_view_count_trigger
  AFTER INSERT ON content_views
  FOR EACH ROW EXECUTE FUNCTION increment_content_view_count();

-- Function to increment download count for past papers
CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE past_papers 
  SET download_count = download_count + 1 
  WHERE id = NEW.past_paper_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to increment download count
DROP TRIGGER IF EXISTS increment_download_count_trigger ON past_paper_downloads;
CREATE TRIGGER increment_download_count_trigger
  AFTER INSERT ON past_paper_downloads
  FOR EACH ROW EXECUTE FUNCTION increment_download_count();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'admin'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================
-- MIGRATION 2: 20250629042547_spring_summit.sql
-- ================================

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

-- ================================
-- MIGRATION COMPLETE
-- ================================
-- Your database schema is now set up according to the WatchnLearn Admin System specifications
-- You can now run your Next.js application and it should connect properly to the database