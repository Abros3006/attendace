/*
  # Add attendance tracking tables

  1. New Tables
    - `attendance_sessions`
      - `id` (uuid, primary key)
      - `class_id` (uuid, references classes)
      - `code` (text, unique, 6 characters)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
    - `attendance_records`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references attendance_sessions)
      - `student_id` (uuid, references students)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for faculty to manage sessions
    - Add policies for students to mark attendance

  3. Views
    - Create student_attendance_summary view for attendance statistics
*/

-- Drop view first since it depends on the tables
DROP VIEW IF EXISTS student_attendance_summary;

-- Drop tables in correct order (dependent table first)
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS attendance_sessions;

-- Create attendance sessions table
CREATE TABLE attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id),
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create attendance records table
CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES attendance_sessions(id),
  student_id uuid NOT NULL REFERENCES students(id),
  created_at timestamptz DEFAULT now(),
  -- Ensure a student can only mark attendance once per session
  UNIQUE(session_id, student_id)
);

-- Create indexes
CREATE INDEX idx_attendance_sessions_class_date ON attendance_sessions(class_id, created_at);
CREATE INDEX idx_attendance_records_student_session ON attendance_records(student_id, session_id);

-- Enable RLS
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Faculty can manage attendance sessions" ON attendance_sessions;
DROP POLICY IF EXISTS "Faculty can view attendance records" ON attendance_records;

-- Create new policies
CREATE POLICY "Faculty can manage attendance sessions"
  ON attendance_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance_sessions.class_id
      AND classes.faculty_id = auth.uid()
    )
  );

CREATE POLICY "Faculty can view attendance records"
  ON attendance_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM attendance_sessions s
      JOIN classes c ON s.class_id = c.id
      WHERE s.id = attendance_records.session_id
      AND c.faculty_id = auth.uid()
    )
  );

-- Create view for student attendance summary
CREATE VIEW student_attendance_summary AS
SELECT 
  cs.student_id,
  cs.class_id,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT ar.id) as attended_sessions,
  CASE 
    WHEN COUNT(DISTINCT s.id) = 0 THEN 0
    ELSE ROUND((COUNT(DISTINCT ar.id)::numeric / COUNT(DISTINCT s.id)::numeric) * 100, 2)
  END as attendance_percentage
FROM class_students cs
LEFT JOIN attendance_sessions s ON cs.class_id = s.class_id
LEFT JOIN attendance_records ar ON s.id = ar.session_id AND cs.student_id = ar.student_id
GROUP BY cs.student_id, cs.class_id;