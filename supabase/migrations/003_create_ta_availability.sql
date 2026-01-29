-- Migration: Create ta_availability table
-- Purpose: Store trainer availability and blocked time periods

CREATE TABLE IF NOT EXISTS ta_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) NOT NULL,
  studio_id UUID REFERENCES bs_studios(id),

  -- Block definition
  block_type TEXT NOT NULL, -- 'available', 'blocked'
  recurrence TEXT NOT NULL DEFAULT 'weekly', -- 'once', 'weekly'

  -- Weekly recurring
  day_of_week INTEGER, -- 0=Sun, 1=Mon, ... 6=Sat
  start_hour INTEGER,
  start_minute INTEGER DEFAULT 0,
  end_hour INTEGER,
  end_minute INTEGER DEFAULT 0,

  -- One-time blocks
  specific_date DATE,
  end_date DATE, -- For multi-day blocks

  -- Metadata
  reason TEXT, -- 'personal', 'admin', 'break', 'other'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_availability_trainer ON ta_availability(trainer_id);
CREATE INDEX IF NOT EXISTS idx_availability_studio ON ta_availability(studio_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON ta_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_date ON ta_availability(specific_date);

-- Enable RLS
ALTER TABLE ta_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can view their own availability" ON ta_availability
  FOR SELECT USING (
    trainer_id = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid()
    )
  );

CREATE POLICY "Trainers can create their own availability" ON ta_availability
  FOR INSERT WITH CHECK (
    trainer_id = auth.uid()
  );

CREATE POLICY "Trainers can update their own availability" ON ta_availability
  FOR UPDATE USING (
    trainer_id = auth.uid()
  );

CREATE POLICY "Trainers can delete their own availability" ON ta_availability
  FOR DELETE USING (
    trainer_id = auth.uid()
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ta_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ta_availability_updated_at
  BEFORE UPDATE ON ta_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_ta_availability_updated_at();
