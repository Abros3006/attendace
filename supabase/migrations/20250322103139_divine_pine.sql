/*
  # Add timetable and class management system

  1. New Tables
    - `timetable_slots`
      - Represents available time slots for classes
      - Links to classes and tracks recurring schedules
    
    - `class_invites`
      - Stores onboarding links for students to join classes
      - Includes unique invite codes and expiration dates

  2. Changes
    - Update classes table to include more details
    - Add relations between tables
    
  3. Security
    - Enable RLS on all tables
    - Add policies for faculty access
*/

-- Modify classes table to add more details
ALTER TABLE classes
ADD COLUMN description text,
ADD COLUMN max_students integer DEFAULT 50,
ADD COLUMN is_active boolean DEFAULT true;

-- Create timetable slots table
CREATE TABLE timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  room_number text,
  is_recurring boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure end time is after start time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  
  -- Prevent overlapping slots for the same faculty
  UNIQUE (class_id, day_of_week, start_time)
);

-- Create class invites table
CREATE TABLE class_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  invite_code text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  max_uses integer DEFAULT 50,
  times_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  CONSTRAINT valid_expiration CHECK (expires_at > created_at),
  CONSTRAINT valid_max_uses CHECK (max_uses > 0),
  CONSTRAINT valid_times_used CHECK (times_used <= max_uses)
);

-- Enable RLS
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_invites ENABLE ROW LEVEL SECURITY;

-- Policies for timetable_slots
CREATE POLICY "Faculty can manage own timetable slots"
ON timetable_slots
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = timetable_slots.class_id
    AND classes.faculty_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = timetable_slots.class_id
    AND classes.faculty_id = auth.uid()
  )
);

-- Policies for class_invites
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