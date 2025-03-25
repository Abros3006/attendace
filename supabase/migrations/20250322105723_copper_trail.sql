/*
  # Add faculty relationship to classes table

  1. Changes
    - Add foreign key constraint between classes.faculty_id and faculty_profiles.id
    - Add index on faculty_id for better query performance

  2. Security
    - No changes to RLS policies needed as they are already properly configured
*/

-- Add foreign key constraint
ALTER TABLE classes
ADD CONSTRAINT classes_faculty_id_fkey
FOREIGN KEY (faculty_id)
REFERENCES faculty_profiles(id)
ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS classes_faculty_id_idx ON classes(faculty_id);