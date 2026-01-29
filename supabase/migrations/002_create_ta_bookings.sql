-- Migration: Create ta_bookings table
-- Purpose: Store calendar bookings/sessions for trainers

CREATE TABLE IF NOT EXISTS ta_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES bs_studios(id),
  trainer_id UUID REFERENCES auth.users(id) NOT NULL,
  client_id UUID REFERENCES fc_clients(id),
  service_id UUID REFERENCES ta_services(id),

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL, -- minutes

  -- Status
  status TEXT NOT NULL DEFAULT 'confirmed',
  -- Values: 'confirmed', 'soft-hold', 'checked-in', 'completed', 'cancelled', 'no-show', 'late'

  -- Soft-hold tracking
  hold_expiry TIMESTAMPTZ,

  -- Session linkage (when converted to training session)
  session_id UUID REFERENCES ta_sessions(id),
  template_id UUID REFERENCES ta_workout_templates(id),
  sign_off_mode TEXT DEFAULT 'full_session',

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_trainer_date ON ta_bookings(trainer_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON ta_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON ta_bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_studio ON ta_bookings(studio_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled ON ta_bookings(scheduled_at);

-- Enable RLS
ALTER TABLE ta_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can view their own bookings" ON ta_bookings
  FOR SELECT USING (
    trainer_id = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid()
    )
  );

CREATE POLICY "Trainers can create bookings" ON ta_bookings
  FOR INSERT WITH CHECK (
    trainer_id = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update their own bookings" ON ta_bookings
  FOR UPDATE USING (
    trainer_id = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid() AND staff_type IN ('owner', 'admin')
    )
  );

CREATE POLICY "Trainers can delete their own bookings" ON ta_bookings
  FOR DELETE USING (
    trainer_id = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid() AND staff_type IN ('owner', 'admin')
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ta_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ta_bookings_updated_at
  BEFORE UPDATE ON ta_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_ta_bookings_updated_at();
