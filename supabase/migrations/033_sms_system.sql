-- SMS Queue table for Telnyx-based SMS notifications
CREATE TABLE IF NOT EXISTS sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'transactional', -- transactional | marketing
  status TEXT NOT NULL DEFAULT 'pending',     -- pending | sent | failed
  send_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  error_message TEXT,
  external_id TEXT,                            -- Telnyx message ID
  booking_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_queue_pending ON sms_queue(status, send_at) WHERE status = 'pending';

-- Add SMS opt-in columns to fc_clients
ALTER TABLE fc_clients ADD COLUMN IF NOT EXISTS sms_transactional_opt_in BOOLEAN DEFAULT true;
ALTER TABLE fc_clients ADD COLUMN IF NOT EXISTS sms_marketing_opt_in BOOLEAN DEFAULT false;
ALTER TABLE fc_clients ADD COLUMN IF NOT EXISTS sms_opted_out_at TIMESTAMPTZ;
