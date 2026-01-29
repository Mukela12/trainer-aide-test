-- Migration: Create team invitations table
-- Purpose: Enable studio owners to invite trainers via email

CREATE TABLE IF NOT EXISTS ta_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES bs_studios(id) NOT NULL,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,

  -- Invitee details
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'trainer', -- trainer, manager, receptionist

  -- Token for accepting invitation
  token TEXT UNIQUE NOT NULL,

  -- Status: pending, accepted, expired, revoked
  status TEXT DEFAULT 'pending',

  -- Dates
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),

  -- Permissions (JSON object for flexible permissions)
  permissions JSONB DEFAULT '{}',
  commission_percent INTEGER DEFAULT 70, -- Default trainer commission (70%)

  -- Optional personal message from inviter
  message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_token ON ta_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON ta_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_studio ON ta_invitations(studio_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON ta_invitations(status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE ta_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Studio owners can view their invitations" ON ta_invitations
  FOR SELECT USING (
    studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid() AND staff_type IN ('owner', 'admin')
    )
    OR invited_by = auth.uid()
  );

CREATE POLICY "Studio owners can create invitations" ON ta_invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid() AND
    studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid() AND staff_type IN ('owner', 'admin')
    )
  );

CREATE POLICY "Studio owners can update invitations" ON ta_invitations
  FOR UPDATE USING (
    invited_by = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid() AND staff_type IN ('owner', 'admin')
    )
  );

CREATE POLICY "Studio owners can delete invitations" ON ta_invitations
  FOR DELETE USING (
    invited_by = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid() AND staff_type IN ('owner', 'admin')
    )
  );

-- Allow public read of invitation by token (for acceptance page)
CREATE POLICY "Anyone can view invitation by token" ON ta_invitations
  FOR SELECT USING (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_ta_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ta_invitations_updated_at
  BEFORE UPDATE ON ta_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_ta_invitations_updated_at();

-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE ta_invitations IS 'Team member invitations for studio owners';
COMMENT ON COLUMN ta_invitations.token IS 'Unique token for accepting the invitation';
COMMENT ON COLUMN ta_invitations.commission_percent IS 'Trainer commission percentage (trainer keeps this %, studio gets rest)';
COMMENT ON COLUMN ta_invitations.permissions IS 'JSON object with permission flags';
