/*
  # Update RLS policies for classes table

  1. Security Changes
    - Ensure RLS is enabled on classes table
    - Update faculty management policies
    - Set default faculty_id to authenticated user
*/

-- Enable RLS if not already enabled
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate it
DO $$ 
BEGIN
  -- Drop the existing policy if it exists
  DROP POLICY IF EXISTS "Faculty can manage own classes" ON classes;
  
  -- Create the policy
  CREATE POLICY "Faculty can manage own classes"
  ON classes
  FOR ALL
  TO authenticated
  USING (faculty_id = auth.uid())
  WITH CHECK (faculty_id = auth.uid());
END $$;

-- Set default value for faculty_id if not already set
DO $$
BEGIN
  ALTER TABLE classes 
    ALTER COLUMN faculty_id SET DEFAULT auth.uid();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;