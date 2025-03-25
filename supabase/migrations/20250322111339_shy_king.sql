/*
  # Update class invites system

  1. Changes
    - Add active flag to class_invites table
    - Ensure single active invite per class
    - Update RLS policies

  2. Security
    - Maintain existing RLS policies
    - Add policy for single active invite per class
*/

-- Add active flag to class_invites if it doesn't exist
ALTER TABLE class_invites 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Now that the column exists, update existing records
UPDATE class_invites SET is_active = false;

-- Create a function to ensure only one active invite per class
CREATE OR REPLACE FUNCTION check_single_active_invite()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_active THEN
    -- Deactivate other active invites for the same class
    UPDATE class_invites
    SET is_active = false
    WHERE class_id = NEW.class_id
    AND id != NEW.id
    AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain single active invite
DROP TRIGGER IF EXISTS ensure_single_active_invite ON class_invites;
CREATE TRIGGER ensure_single_active_invite
  BEFORE INSERT OR UPDATE ON class_invites
  FOR EACH ROW
  EXECUTE FUNCTION check_single_active_invite();

-- Drop existing policies
DROP POLICY IF EXISTS "Faculty can manage own class invites" ON class_invites;

-- Create new policies
CREATE POLICY "Faculty can manage own class invites"
ON class_invites
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_invites.class_id
    AND classes.faculty_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_invites.class_id
    AND classes.faculty_id = auth.uid()
  )
);