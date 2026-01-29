-- Migration: Create ta_booking_requests table
-- Purpose: Store booking requests from clients to trainers

CREATE TABLE IF NOT EXISTS ta_booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES bs_studios(id),
  trainer_id UUID REFERENCES auth.users(id),
  client_id UUID REFERENCES fc_clients(id) NOT NULL,
  service_id UUID REFERENCES ta_services(id),

  -- Request details
  preferred_times JSONB NOT NULL, -- Array of ISO timestamps
  notes TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'accepted', 'declined', 'expired'

  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL,

  -- Resolution
  accepted_time TIMESTAMPTZ,
  booking_id UUID REFERENCES ta_bookings(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_booking_requests_trainer ON ta_booking_requests(trainer_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_client ON ta_booking_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON ta_booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_expires ON ta_booking_requests(expires_at);

-- Enable RLS
ALTER TABLE ta_booking_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can view requests assigned to them" ON ta_booking_requests
  FOR SELECT USING (
    trainer_id = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid()
    )
  );

CREATE POLICY "Clients can create booking requests" ON ta_booking_requests
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id FROM fc_clients WHERE id = auth.uid()
    )
    OR trainer_id = auth.uid() -- Trainers can create on behalf of clients
  );

CREATE POLICY "Trainers can update requests" ON ta_booking_requests
  FOR UPDATE USING (
    trainer_id = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete requests" ON ta_booking_requests
  FOR DELETE USING (
    trainer_id = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ta_booking_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ta_booking_requests_updated_at
  BEFORE UPDATE ON ta_booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_ta_booking_requests_updated_at();
