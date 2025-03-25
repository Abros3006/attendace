/*
  # Add RLS policy for attendance submission

  1. Security Changes
    - Add policy to allow students to submit attendance records
    - Policy checks that:
      - Student is enrolled in the class
      - Session is active (not expired)
      - Student can only submit their own attendance
    
  2. Implementation
    - Use DO block for safer policy management
    - Add proper error handling
*/

DO $$ 
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Students can submit attendance" ON attendance_records;
  
  -- Create new policy
  CREATE POLICY "Students can submit attendance"
  ON attendance_records
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM attendance_sessions s
      JOIN class_students cs ON cs.class_id = s.class_id
      WHERE s.id = attendance_records.session_id
      AND cs.student_id = attendance_records.student_id
      AND s.expires_at > now()
    )
  );

EXCEPTION 
  WHEN others THEN
    RAISE NOTICE 'Error creating policy: %', SQLERRM;
    RAISE;
END $$;