-- Track reward credit history for cooldown enforcement
CREATE TABLE IF NOT EXISTS ta_credit_rewards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES fc_clients(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL,
  awarded_by uuid NOT NULL,
  reason text NOT NULL,
  credits_awarded integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_rewards_client_id ON ta_credit_rewards(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_rewards_client_created ON ta_credit_rewards(client_id, created_at DESC);

-- Enable RLS
ALTER TABLE ta_credit_rewards ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on ta_credit_rewards"
  ON ta_credit_rewards FOR ALL
  USING (true)
  WITH CHECK (true);
