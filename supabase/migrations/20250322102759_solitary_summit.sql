/*
  # Update faculty profiles policies

  1. Changes
    - Remove existing policies
    - Add new policies that allow:
      - Public insert during registration
      - Authenticated users to read/update their own profiles
  
  2. Security
    - Maintains RLS
    - Ensures users can only access their own data
    - Allows initial profile creation during registration
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Faculty can read own profile" ON faculty_profiles;
DROP POLICY IF EXISTS "Faculty can insert own profile" ON faculty_profiles;
DROP POLICY IF EXISTS "Faculty can update own profile" ON faculty_profiles;
DROP POLICY IF EXISTS "Enable insert for registration" ON faculty_profiles;
DROP POLICY IF EXISTS "Enable read access to own profile" ON faculty_profiles;
DROP POLICY IF EXISTS "Enable update access to own profile" ON faculty_profiles;

-- Create new policies
CREATE POLICY "Enable public insert for registration"
ON faculty_profiles
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable read access for own profile"
ON faculty_profiles
FOR SELECT
TO public
USING (auth.uid() = id);

CREATE POLICY "Enable update for own profile"
ON faculty_profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);