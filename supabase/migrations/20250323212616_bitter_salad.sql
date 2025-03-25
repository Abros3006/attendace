/*
  # Add id column to class_students table

  1. Changes
    - Drop existing primary key constraint
    - Add `id` column to `class_students` table as primary key
    - Add composite unique constraint on class_id and student_id
    - Add indexes for better performance

  2. Security
    - No changes to RLS policies needed
*/

-- First drop the existing primary key constraint
ALTER TABLE class_students 
DROP CONSTRAINT class_students_pkey;

-- Add id column
ALTER TABLE class_students 
ADD COLUMN id uuid DEFAULT gen_random_uuid();

-- Set NOT NULL constraint after adding values for existing rows
UPDATE class_students SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE class_students ALTER COLUMN id SET NOT NULL;

-- Add new primary key constraint
ALTER TABLE class_students 
ADD CONSTRAINT class_students_pkey PRIMARY KEY (id);

-- Ensure we have proper indexes
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON class_students(student_id);

-- Add composite unique constraint
ALTER TABLE class_students 
ADD CONSTRAINT class_students_class_student_unique UNIQUE (class_id, student_id);