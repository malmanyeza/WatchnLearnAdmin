/*
  # Quiz Enhancements Migration
  
  This migration adds support for enhanced quiz functionality:
  1. Add quiz_data column to content table for storing quiz information
  2. Create quiz_questions table for manual quiz questions
  3. Create quiz_question_images table for question images
  4. Create quiz_answer_images table for answer images
  5. Add storage bucket for quiz images
  6. Set up proper RLS policies
*/

-- Add quiz_data column to content table
ALTER TABLE content 
ADD COLUMN IF NOT EXISTS quiz_data JSONB;

-- Create quiz_questions table for manual quiz creation
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  answer_a TEXT NOT NULL,
  answer_b TEXT NOT NULL,
  answer_c TEXT,
  answer_d TEXT,
  answer_a_image_url TEXT,
  answer_b_image_url TEXT,
  answer_c_image_url TEXT,
  answer_d_image_url TEXT,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  order_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, order_number)
);

-- Create indexes for quiz_questions
CREATE INDEX IF NOT EXISTS idx_quiz_questions_content_id ON quiz_questions(content_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(content_id, order_number);

-- Enable RLS on quiz_questions
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quiz_questions
CREATE POLICY "Admins can insert quiz questions" ON quiz_questions
  FOR INSERT WITH CHECK (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can select quiz questions" ON quiz_questions
  FOR SELECT USING (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can update quiz questions" ON quiz_questions
  FOR UPDATE USING (
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can delete quiz questions" ON quiz_questions
  FOR DELETE USING (
    is_admin_user(auth.uid())
  );

-- Add storage bucket for quiz images
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('quiz-images', 'quiz-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for quiz images
CREATE POLICY "Admins can upload quiz images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'quiz-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can view quiz images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'quiz-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can update quiz images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'quiz-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete quiz images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'quiz-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- Add trigger to update updated_at timestamp for quiz_questions
DROP TRIGGER IF EXISTS update_quiz_questions_updated_at ON quiz_questions;
CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get quiz statistics
CREATE OR REPLACE FUNCTION get_quiz_statistics(content_id_param UUID)
RETURNS TABLE (
  total_questions INTEGER,
  has_images BOOLEAN,
  avg_answers_per_question DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_questions,
    BOOL_OR(question_image_url IS NOT NULL OR 
            answer_a_image_url IS NOT NULL OR 
            answer_b_image_url IS NOT NULL OR 
            answer_c_image_url IS NOT NULL OR 
            answer_d_image_url IS NOT NULL) as has_images,
    AVG(
      CASE WHEN answer_a IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN answer_b IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN answer_c IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN answer_d IS NOT NULL THEN 1 ELSE 0 END
    ) as avg_answers_per_question
  FROM quiz_questions 
  WHERE content_id = content_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update content table comment to document quiz_data structure
COMMENT ON COLUMN content.quiz_data IS 'JSON structure for quiz data:
{
  "method": "ai|upload|manual",
  "prompt": "AI generation prompt (for ai method)",
  "fileUrl": "URL to uploaded PDF (for upload method)", 
  "questions": [...] (for manual method),
  "generated": boolean (for ai method),
  "totalQuestions": number,
  "hasImages": boolean
}';