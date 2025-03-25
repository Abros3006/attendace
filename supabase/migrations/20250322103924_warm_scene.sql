/*
  # Remove day_of_week from classes table

  1. Changes
    - Remove the day_of_week column from classes table as it should only exist in timetable_slots
*/

DO $$ 
BEGIN
  -- Remove day_of_week column from classes if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'classes' 
    AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE classes DROP COLUMN day_of_week;
  END IF;
END $$;