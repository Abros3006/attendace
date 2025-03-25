/*
  # Add id column to class_students table

  1. Changes
    - Add `id` column to `class_students` table as primary key
    - Keep existing composite unique constraint on class_id and student_id
    - Add indexes for better performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add id column to class_students table
ALTER TABLE class_students 
ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid();

-- Ensure we have proper indexes
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON class_students(student_id);

-- Ensure we maintain the unique constraint on class_id and student_id
ALTER TABLE class_students 
DROP CONSTRAINT IF EXISTS unique_class_student,
ADD CONSTRAINT unique_class_student UNIQUE (class_id, student_id);