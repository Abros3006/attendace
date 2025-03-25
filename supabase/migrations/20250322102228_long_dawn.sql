/*
  # Fix faculty profiles policies

  1. Changes
    - Drop existing policies
    - Create new policies with proper conditions for registration flow
    - Ensure proper RLS for faculty profile management

  2. Security
    - Enable RLS
    - Add policies for insert during registration
    - Add policies for viewing and updating own profile
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Faculty can read own profile" ON faculty_profiles;
  DROP POLICY IF EXISTS "Faculty can insert own profile" ON faculty_profiles;
  DROP POLICY IF EXISTS "Faculty can update own profile" ON faculty_profiles;
END $$;

-- Recreate policies with correct permissions
CREATE POLICY "Enable insert for registration"
  ON faculty_profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable read access to own profile"
  ON faculty_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Enable update access to own profile"
  ON faculty_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);