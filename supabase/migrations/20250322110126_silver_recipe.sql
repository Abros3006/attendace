/*
  # Add public access policy for student registration

  1. Security Changes
    - Add RLS policy to allow public access for creating new students
    - Add RLS policy to allow students to update their own information
    - Add RLS policy to allow students to view their own information
*/

-- Enable RLS on students table if not already enabled
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Allow public access for creating new students
CREATE POLICY "Allow public to create students"
ON students
FOR INSERT
TO public
WITH CHECK (true);

-- Allow students to update their own information
CREATE POLICY "Students can update own information"
ON students
FOR UPDATE
TO public
USING (auth.uid() IN (
  SELECT cs.student_id 
  FROM class_students cs 
  WHERE cs.student_id = id
))
WITH CHECK (auth.uid() IN (
  SELECT cs.student_id 
  FROM class_students cs 
  WHERE cs.student_id = id
));

-- Allow students to view their own information
CREATE POLICY "Students can view own information"
ON students
FOR SELECT
TO public
USING (auth.uid() IN (
  SELECT cs.student_id 
  FROM class_students cs 
  WHERE cs.student_id = id
));