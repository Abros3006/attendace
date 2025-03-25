/*
  # Create faculty profiles table and policies

  1. New Tables
    - `faculty_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text, not null)
      - `email` (text, not null, unique)
      - `created_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on `faculty_profiles` table
    - Add policies for faculty to manage their own profile
*/

-- Create the faculty_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.faculty_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faculty_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Faculty can read own profile" ON public.faculty_profiles;
    DROP POLICY IF EXISTS "Faculty can insert own profile" ON public.faculty_profiles;
    DROP POLICY IF EXISTS "Faculty can update own profile" ON public.faculty_profiles;

    -- Create new policies
    CREATE POLICY "Faculty can read own profile"
        ON public.faculty_profiles
        FOR SELECT
        TO authenticated
        USING (auth.uid() = id);

    CREATE POLICY "Faculty can insert own profile"
        ON public.faculty_profiles
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = id);

    CREATE POLICY "Faculty can update own profile"
        ON public.faculty_profiles
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
END $$;