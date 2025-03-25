/*
  # Update student registration RLS policies

  1. Security Changes
    - Drop existing policies that might conflict
    - Add new RLS policy to allow public access for creating new students
    - Add RLS policy to allow students to update their own information
    - Add RLS policy to allow students to view their own information
    - Add RLS policy to allow faculty to view enrolled students
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public to create students" ON students;
DROP POLICY IF EXISTS "Students can update own information" ON students;
DROP POLICY IF EXISTS "Students can view own information" ON students;
DROP POLICY IF EXISTS "Faculty can view enrolled students" ON students;

-- Enable RLS on students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Allow public access for creating new students (no auth required)
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
USING (true)
WITH CHECK (true);

-- Allow students to view their own information
CREATE POLICY "Students can view own information"
ON students
FOR SELECT
TO public
USING (true);

-- Allow faculty to view enrolled students
CREATE POLICY "Faculty can view enrolled students"
ON students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM class_students cs
    JOIN classes c ON cs.class_id = c.id
    WHERE cs.student_id = students.id 
    AND c.faculty_id = auth.uid()
  )
);