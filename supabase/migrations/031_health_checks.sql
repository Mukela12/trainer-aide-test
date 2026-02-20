-- Health check (PAR-Q) table for client onboarding
CREATE TABLE IF NOT EXISTS ta_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES fc_clients(id) ON DELETE CASCADE,
  studio_id UUID,
  responses JSONB NOT NULL DEFAULT '{}',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  has_conditions BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '6 months'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_checks_client ON ta_health_checks(client_id);

-- Add health_check_completed_at to fc_clients for quick lookup
ALTER TABLE fc_clients ADD COLUMN IF NOT EXISTS health_check_completed_at TIMESTAMPTZ;
