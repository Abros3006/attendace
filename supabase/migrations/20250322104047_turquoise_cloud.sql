/*
  # Remove time columns from classes table

  1. Changes
    - Remove start_time and end_time columns from classes table as they should only exist in timetable_slots
*/

DO $$ 
BEGIN
  -- Remove start_time column from classes if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'classes' 
    AND column_name = 'start_time'
  ) THEN
    ALTER TABLE classes DROP COLUMN start_time;
  END IF;

  -- Remove end_time column from classes if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'classes' 
    AND column_name = 'end_time'
  ) THEN
    ALTER TABLE classes DROP COLUMN end_time;
  END IF;
END $$;