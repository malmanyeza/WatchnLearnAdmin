/*
  # Fix Subject Schema to Match UI Requirements
  
  This migration updates the database schema to match what the UI expects:
  1. Add missing columns to subjects table
  2. Update the subject creation and management functions
  3. Ensure consistency between database and UI
*/

-- Add missing columns to subjects table
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS enrolled_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS content_items INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2) DEFAULT 0.0;

-- Create or update the function to calculate subject statistics
CREATE OR REPLACE FUNCTION update_subject_statistics(subject_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Update enrolled students count
  UPDATE subjects 
  SET enrolled_students = (
    SELECT COUNT(*) 
    FROM user_enrollments 
    WHERE subject_id = subject_id_param AND is_active = true
  )
  WHERE id = subject_id_param;
  
  -- Update content items count
  UPDATE subjects 
  SET content_items = (
    SELECT COUNT(c.*) 
    FROM content c
    JOIN chapters ch ON c.chapter_id = ch.id
    JOIN weeks w ON ch.week_id = w.id
    JOIN terms t ON w.term_id = t.id
    WHERE t.subject_id = subject_id_param AND c.status = 'published'
  )
  WHERE id = subject_id_param;
  
  -- Update completion rate (average of all enrolled users' progress)
  UPDATE subjects 
  SET completion_rate = COALESCE((
    SELECT AVG(up.progress_percentage)
    FROM user_progress up
    JOIN content c ON up.content_id = c.id
    JOIN chapters ch ON c.chapter_id = ch.id
    JOIN weeks w ON ch.week_id = w.id
    JOIN terms t ON w.term_id = t.id
    WHERE t.subject_id = subject_id_param
  ), 0)
  WHERE id = subject_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update statistics when enrollments change
CREATE OR REPLACE FUNCTION trigger_update_subject_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle user enrollments
  IF TG_TABLE_NAME = 'user_enrollments' THEN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      PERFORM update_subject_statistics(NEW.subject_id);
    END IF;
    IF TG_OP = 'DELETE' THEN
      PERFORM update_subject_statistics(OLD.subject_id);
    END IF;
  END IF;
  
  -- Handle content changes
  IF TG_TABLE_NAME = 'content' THEN
    DECLARE
      subject_id_var UUID;
    BEGIN
      -- Get subject_id from the content hierarchy
      SELECT t.subject_id INTO subject_id_var
      FROM terms t
      JOIN weeks w ON t.id = w.term_id
      JOIN chapters ch ON w.id = ch.week_id
      WHERE ch.id = COALESCE(NEW.chapter_id, OLD.chapter_id);
      
      IF subject_id_var IS NOT NULL THEN
        PERFORM update_subject_statistics(subject_id_var);
      END IF;
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_subject_stats_on_enrollment ON user_enrollments;
CREATE TRIGGER update_subject_stats_on_enrollment
  AFTER INSERT OR UPDATE OR DELETE ON user_enrollments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_subject_stats();

DROP TRIGGER IF EXISTS update_subject_stats_on_content ON content;
CREATE TRIGGER update_subject_stats_on_content
  AFTER INSERT OR UPDATE OR DELETE ON content
  FOR EACH ROW EXECUTE FUNCTION trigger_update_subject_stats();

-- Add some sample schools if they don't exist
INSERT INTO schools (name, address, contact_email, is_active) VALUES 
  ('Harare High School', 'Harare, Zimbabwe', 'admin@hararehigh.edu.zw', true),
  ('St. Johns College', 'Harare, Zimbabwe', 'admin@stjohns.edu.zw', true),
  ('Prince Edward School', 'Harare, Zimbabwe', 'admin@princeedward.edu.zw', true),
  ('Dominican Convent High School', 'Harare, Zimbabwe', 'admin@dominican.edu.zw', true),
  ('Churchill High School', 'Harare, Zimbabwe', 'admin@churchill.edu.zw', true)
ON CONFLICT (name) DO NOTHING;

-- Update existing subjects to have proper statistics
DO $$
DECLARE
  subject_record RECORD;
BEGIN
  FOR subject_record IN SELECT id FROM subjects LOOP
    PERFORM update_subject_statistics(subject_record.id);
  END LOOP;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_enrollments_subject_id ON user_enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_active ON user_enrollments(is_active);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_user_progress_content_id ON user_progress(content_id);

-- Create a view for subject statistics (optional, for easier querying)
CREATE OR REPLACE VIEW subject_statistics AS
SELECT 
  s.*,
  COALESCE(s.enrolled_students, 0) as total_enrolled,
  COALESCE(s.content_items, 0) as total_content,
  COALESCE(s.completion_rate, 0) as avg_completion_rate,
  COUNT(st.id) as teacher_count
FROM subjects s
LEFT JOIN subject_teachers st ON s.id = st.subject_id
WHERE s.is_active = true
GROUP BY s.id;