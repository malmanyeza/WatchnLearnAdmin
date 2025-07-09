/*
  # Add quiz_data column to content table

  1. Changes
    - Add `quiz_data` column to `content` table to store quiz configuration and questions
    - Column is JSONB type to store structured quiz data
    - Column is nullable to support non-quiz content types

  2. Security
    - No changes to RLS policies needed as this is just adding a column
*/

-- Add quiz_data column to content table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'quiz_data'
  ) THEN
    ALTER TABLE content ADD COLUMN quiz_data JSONB;
  END IF;
END $$;