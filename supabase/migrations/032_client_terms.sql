-- Add client_terms JSONB to bs_studios
ALTER TABLE bs_studios
  ADD COLUMN IF NOT EXISTS client_terms JSONB DEFAULT '{"active": false, "content": "", "version": 1}';

-- Snapshot table: immutable record of terms a client agreed to at booking time
CREATE TABLE IF NOT EXISTS ta_booking_terms_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES ta_bookings(id) ON DELETE SET NULL,
  booking_request_id UUID REFERENCES ta_booking_requests(id) ON DELETE SET NULL,
  studio_id UUID NOT NULL,
  terms_content TEXT NOT NULL,
  terms_version INTEGER NOT NULL DEFAULT 1,
  terms_hash TEXT NOT NULL,
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_terms_snapshots_booking ON ta_booking_terms_snapshots(booking_id);
CREATE INDEX IF NOT EXISTS idx_terms_snapshots_studio ON ta_booking_terms_snapshots(studio_id);
