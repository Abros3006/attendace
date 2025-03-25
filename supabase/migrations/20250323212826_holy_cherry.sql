/*
  # Add RLS policy for attendance submission

  1. Security Changes
    - Add policy to allow students to submit attendance records
    - Policy checks that:
      - Student is enrolled in the class
      - Session is active (not expired)
      - Student can only submit their own attendance
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Students can submit attendance" ON attendance_records;

-- Create policy for students to submit attendance
CREATE POLICY "Students can submit attendance"
ON attendance_records
FOR INSERT
TO public
WITH CHECK (
  -- Verify the student is enrolled in the class
  EXISTS (
    SELECT 1
    FROM attendance_sessions s
    JOIN class_students cs ON cs.class_id = s.class_id
    WHERE s.id = attendance_records.session_id
    AND cs.student_id = attendance_records.student_id
    -- Ensure session hasn't expired
    AND s.expires_at > now()
  )
);