/*
  # Add room number to classes

  1. Changes
    - Add `room_number` column to `classes` table
    - Make it nullable since not all classes may have a room number
*/

ALTER TABLE classes
ADD COLUMN IF NOT EXISTS room_number text;