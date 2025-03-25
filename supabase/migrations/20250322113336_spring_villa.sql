/*
  # Add unique registration links for classes

  1. Changes
    - Add `registration_code` column to `classes` table
    - Make it unique and non-null with a default random value
    - Add index for faster lookups
*/

-- Add registration_code column
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS registration_code text NOT NULL DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8));

-- Add unique constraint
ALTER TABLE classes
ADD CONSTRAINT unique_registration_code UNIQUE (registration_code);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_classes_registration_code ON classes (registration_code);