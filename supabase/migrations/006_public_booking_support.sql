-- Migration: Add public booking support fields
-- Purpose: Enable public booking pages and guest clients

-- Add public booking fields to services
ALTER TABLE ta_services ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE ta_services ADD COLUMN IF NOT EXISTS price_cents INTEGER;
ALTER TABLE ta_services ADD COLUMN IF NOT EXISTS is_intro_session BOOLEAN DEFAULT false;
ALTER TABLE ta_services ADD COLUMN IF NOT EXISTS booking_buffer_minutes INTEGER DEFAULT 60;

-- Add guest client support to fc_clients
ALTER TABLE fc_clients ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;
ALTER TABLE fc_clients ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
-- source values: 'manual', 'public_booking', 'referral'

-- Add index for public services lookup
CREATE INDEX IF NOT EXISTS idx_services_public ON ta_services(created_by, is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_services_intro ON ta_services(created_by, is_intro_session) WHERE is_intro_session = true;

-- RLS policy to allow public viewing of public services
DROP POLICY IF EXISTS "Public can view public services" ON ta_services;
CREATE POLICY "Public can view public services" ON ta_services
  FOR SELECT USING (
    is_public = true
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- Comments
COMMENT ON COLUMN ta_services.is_public IS 'Whether this service appears on public booking page';
COMMENT ON COLUMN ta_services.price_cents IS 'Price in cents (null = free or use credits)';
COMMENT ON COLUMN ta_services.is_intro_session IS 'Whether this is a free intro/consultation session';
COMMENT ON COLUMN ta_services.booking_buffer_minutes IS 'Minimum time before session can be booked';
COMMENT ON COLUMN fc_clients.is_guest IS 'Whether this is a guest client from public booking';
COMMENT ON COLUMN fc_clients.source IS 'How this client was acquired: manual, public_booking, referral';
