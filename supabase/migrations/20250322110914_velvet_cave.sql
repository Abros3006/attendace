/*
  # Add attendance tracking

  1. New Views
    - `student_attendance_summary` - Aggregates attendance data per student per class
      - Total sessions
      - Attended sessions
      - Attendance percentage

  2. Changes
    - Add indexes for performance optimization
*/

-- Create a view for student attendance summary
CREATE OR REPLACE VIEW student_attendance_summary AS
WITH class_sessions AS (
  SELECT 
    class_id,
    COUNT(*) as total_sessions
  FROM attendance_sessions
  GROUP BY class_id
),
student_attendance AS (
  SELECT 
    cs.student_id,
    cs.class_id,
    COUNT(ar.id) as attended_sessions
  FROM class_students cs
  LEFT JOIN attendance_records ar ON 
    ar.student_id = cs.student_id
  LEFT JOIN attendance_sessions "session" ON 
    ar.session_id = "session".id AND
    "session".class_id = cs.class_id
  GROUP BY cs.student_id, cs.class_id
)
SELECT 
  sa.student_id,
  sa.class_id,
  COALESCE(cs.total_sessions, 0) as total_sessions,
  COALESCE(sa.attended_sessions, 0) as attended_sessions,
  CASE 
    WHEN cs.total_sessions > 0 
    THEN ROUND((COALESCE(sa.attended_sessions, 0)::numeric / cs.total_sessions) * 100, 2)
    ELSE 0
  END as attendance_percentage
FROM student_attendance sa
LEFT JOIN class_sessions cs ON cs.class_id = sa.class_id;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_session 
ON attendance_records(student_id, session_id);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_date 
ON attendance_sessions(class_id, created_at);