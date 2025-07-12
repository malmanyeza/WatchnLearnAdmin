/*
  # Enhanced Quiz System Migration
  
  This migration enhances the quiz functionality to support:
  1. Individual quiz questions with images
  2. Answer options with images
  3. Proper storage bucket for quiz images
  4. Enhanced quiz_data structure in content table
*/

-- Create quiz_questions table for detailed quiz management
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
  explanation TEXT,
  points INTEGER DEFAULT 1,
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
CREATE POLICY "Admins can manage quiz questions" ON quiz_questions
  FOR ALL USING (
    is_admin_user(auth.uid())
  );

-- Create quiz_attempts table for tracking user attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  time_taken INTEGER, -- in seconds
  answers JSONB NOT NULL DEFAULT '{}', -- stores user answers
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, user_id, completed_at)
);

-- Enable RLS on quiz_attempts
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quiz_attempts
CREATE POLICY "Users can view own quiz attempts" ON quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all quiz attempts" ON quiz_attempts
  FOR SELECT USING (is_admin_user(auth.uid()));

-- Add storage bucket for quiz images if not exists
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('quiz-images', 'quiz-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for quiz images
CREATE POLICY "Admins can upload quiz images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'quiz-images' AND
    auth.role() = 'authenticated' AND
    is_admin_user(auth.uid())
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
    is_admin_user(auth.uid())
  );

CREATE POLICY "Admins can delete quiz images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'quiz-images' AND
    auth.role() = 'authenticated' AND
    is_admin_user(auth.uid())
  );

-- Add trigger to update updated_at timestamp for quiz_questions
CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate quiz statistics
CREATE OR REPLACE FUNCTION calculate_quiz_statistics(content_id_param UUID)
RETURNS TABLE (
  total_questions INTEGER,
  has_images BOOLEAN,
  total_points INTEGER,
  avg_completion_time INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_questions,
    BOOL_OR(
      question_image_url IS NOT NULL OR 
      answer_a_image_url IS NOT NULL OR 
      answer_b_image_url IS NOT NULL OR 
      answer_c_image_url IS NOT NULL OR 
      answer_d_image_url IS NOT NULL
    ) as has_images,
    COALESCE(SUM(points), 0)::INTEGER as total_points,
    COALESCE(AVG(qa.time_taken), 0)::INTEGER as avg_completion_time
  FROM quiz_questions qq
  LEFT JOIN quiz_attempts qa ON qq.content_id = qa.content_id
  WHERE qq.content_id = content_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get quiz leaderboard
CREATE OR REPLACE FUNCTION get_quiz_leaderboard(content_id_param UUID, limit_param INTEGER DEFAULT 10)
RETURNS TABLE (
  user_name TEXT,
  score INTEGER,
  percentage DECIMAL,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.full_name as user_name,
    qa.score,
    qa.percentage,
    qa.completed_at
  FROM quiz_attempts qa
  JOIN profiles p ON qa.user_id = p.id
  WHERE qa.content_id = content_id_param
  ORDER BY qa.percentage DESC, qa.completed_at ASC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update content table comment to document enhanced quiz_data structure
COMMENT ON COLUMN content.quiz_data IS 'Enhanced JSON structure for quiz data:
{
  "method": "ai|upload|manual",
  "prompt": "AI generation prompt (for ai method)",
  "fileUrl": "URL to uploaded PDF (for upload method)", 
  "questions": [...] (for manual method - now stored in quiz_questions table),
  "generated": boolean (for ai method),
  "totalQuestions": number,
  "totalPoints": number,
  "hasImages": boolean,
  "timeLimit": number (in minutes),
  "passingScore": number (percentage),
  "allowRetakes": boolean,
  "showCorrectAnswers": boolean,
  "randomizeQuestions": boolean,
  "randomizeAnswers": boolean
}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_content_user ON quiz_attempts(content_id, user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_score ON quiz_attempts(content_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed ON quiz_attempts(completed_at DESC);