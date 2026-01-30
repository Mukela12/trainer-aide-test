-- Migration: Create ta_client_invitations table
-- Purpose: Store client invitation records for email-based client onboarding

CREATE TABLE IF NOT EXISTS ta_client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_invitations_studio ON ta_client_invitations(studio_id);
CREATE INDEX IF NOT EXISTS idx_client_invitations_email ON ta_client_invitations(email);
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON ta_client_invitations(token);
CREATE INDEX IF NOT EXISTS idx_client_invitations_status ON ta_client_invitations(status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE ta_client_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Studio staff can view their invitations" ON ta_client_invitations
  FOR SELECT USING (
    invited_by = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid()
    )
  );

CREATE POLICY "Studio staff can create invitations" ON ta_client_invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid()
  );

CREATE POLICY "Inviters can update their invitations" ON ta_client_invitations
  FOR UPDATE USING (
    invited_by = auth.uid()
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_client_invitations_updated_at
  BEFORE UPDATE ON ta_client_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_client_invitations_updated_at();
