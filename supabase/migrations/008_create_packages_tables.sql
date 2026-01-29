-- Migration: Create packages tables
-- Purpose: Store credit packages and client package purchases

-- Credit packages offered by trainers
CREATE TABLE IF NOT EXISTS ta_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) NOT NULL,
  studio_id UUID REFERENCES bs_studios(id),

  name TEXT NOT NULL,
  description TEXT,
  session_count INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  validity_days INTEGER DEFAULT 90, -- Days until credits expire

  -- Savings display
  per_session_price_cents INTEGER, -- Calculated: price_cents / session_count
  savings_percent INTEGER, -- vs single session price

  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- Show on public booking page

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client package purchases (credit balances)
CREATE TABLE IF NOT EXISTS ta_client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES fc_clients(id) NOT NULL,
  package_id UUID REFERENCES ta_packages(id) NOT NULL,
  trainer_id UUID REFERENCES auth.users(id) NOT NULL,
  payment_id UUID REFERENCES ta_payments(id),

  -- Credit tracking
  sessions_total INTEGER NOT NULL,
  sessions_used INTEGER DEFAULT 0,
  sessions_remaining INTEGER GENERATED ALWAYS AS (sessions_total - sessions_used) STORED,

  -- Dates
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Status: active, expired, exhausted
  status TEXT DEFAULT 'active',

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit usage log (for auditing)
CREATE TABLE IF NOT EXISTS ta_credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID REFERENCES ta_client_packages(id) NOT NULL,
  booking_id UUID REFERENCES ta_bookings(id),
  credits_used INTEGER NOT NULL DEFAULT 1,
  balance_after INTEGER NOT NULL,
  reason TEXT, -- 'booking', 'manual_deduction', 'manual_addition', 'refund'
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_packages_trainer ON ta_packages(trainer_id);
CREATE INDEX IF NOT EXISTS idx_packages_active ON ta_packages(is_active, is_public) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_client_packages_client ON ta_client_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_packages_trainer ON ta_client_packages(trainer_id);
CREATE INDEX IF NOT EXISTS idx_client_packages_status ON ta_client_packages(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_client_packages_expiry ON ta_client_packages(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_credit_usage_package ON ta_credit_usage(client_package_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_booking ON ta_credit_usage(booking_id);

-- Enable RLS
ALTER TABLE ta_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ta_client_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ta_credit_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for packages
CREATE POLICY "Trainers can view their own packages" ON ta_packages
  FOR SELECT USING (trainer_id = auth.uid() OR is_public = true);

CREATE POLICY "Trainers can create packages" ON ta_packages
  FOR INSERT WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their own packages" ON ta_packages
  FOR UPDATE USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete their own packages" ON ta_packages
  FOR DELETE USING (trainer_id = auth.uid());

-- RLS Policies for client packages
CREATE POLICY "Trainers can view client packages for their clients" ON ta_client_packages
  FOR SELECT USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can create client packages" ON ta_client_packages
  FOR INSERT WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update client packages" ON ta_client_packages
  FOR UPDATE USING (trainer_id = auth.uid());

-- RLS Policies for credit usage
CREATE POLICY "Trainers can view credit usage" ON ta_credit_usage
  FOR SELECT USING (
    created_by = auth.uid() OR
    client_package_id IN (SELECT id FROM ta_client_packages WHERE trainer_id = auth.uid())
  );

CREATE POLICY "Trainers can log credit usage" ON ta_credit_usage
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- View for client credits summary
CREATE OR REPLACE VIEW v_client_credits AS
SELECT
  cp.client_id,
  cp.trainer_id,
  SUM(cp.sessions_remaining) as total_credits,
  MIN(cp.expires_at) FILTER (WHERE cp.status = 'active' AND cp.sessions_remaining > 0) as nearest_expiry,
  COUNT(*) FILTER (WHERE cp.status = 'active' AND cp.sessions_remaining > 0) as active_packages,
  CASE
    WHEN SUM(cp.sessions_remaining) = 0 THEN 'none'
    WHEN SUM(cp.sessions_remaining) <= 2 THEN 'low'
    WHEN SUM(cp.sessions_remaining) <= 5 THEN 'medium'
    ELSE 'good'
  END as credit_status
FROM ta_client_packages cp
WHERE cp.status = 'active'
GROUP BY cp.client_id, cp.trainer_id;

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_ta_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ta_client_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Auto-update status
  IF NEW.sessions_remaining <= 0 THEN
    NEW.status = 'exhausted';
  ELSIF NEW.expires_at < NOW() THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ta_packages_updated_at
  BEFORE UPDATE ON ta_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_ta_packages_updated_at();

CREATE TRIGGER trigger_ta_client_packages_updated_at
  BEFORE UPDATE ON ta_client_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_ta_client_packages_updated_at();

-- Function to deduct credit from client's packages (FIFO - oldest first)
CREATE OR REPLACE FUNCTION deduct_client_credit(
  p_client_id UUID,
  p_trainer_id UUID,
  p_booking_id UUID,
  p_credits INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  v_package RECORD;
  v_remaining INTEGER := p_credits;
BEGIN
  -- Get active packages ordered by expiry (FIFO)
  FOR v_package IN
    SELECT id, sessions_remaining
    FROM ta_client_packages
    WHERE client_id = p_client_id
      AND trainer_id = p_trainer_id
      AND status = 'active'
      AND sessions_remaining > 0
    ORDER BY expires_at ASC
    FOR UPDATE
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;

    -- Calculate how many to deduct from this package
    DECLARE
      v_to_deduct INTEGER := LEAST(v_remaining, v_package.sessions_remaining);
    BEGIN
      -- Update package
      UPDATE ta_client_packages
      SET sessions_used = sessions_used + v_to_deduct
      WHERE id = v_package.id;

      -- Log usage
      INSERT INTO ta_credit_usage (
        client_package_id,
        booking_id,
        credits_used,
        balance_after,
        reason,
        created_by
      ) VALUES (
        v_package.id,
        p_booking_id,
        v_to_deduct,
        v_package.sessions_remaining - v_to_deduct,
        'booking',
        p_trainer_id
      );

      v_remaining := v_remaining - v_to_deduct;
    END;
  END LOOP;

  RETURN v_remaining = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE ta_packages IS 'Credit packages offered by trainers';
COMMENT ON TABLE ta_client_packages IS 'Client purchases of credit packages';
COMMENT ON TABLE ta_credit_usage IS 'Audit log of credit usage';
COMMENT ON COLUMN ta_packages.validity_days IS 'Number of days until credits expire from purchase date';
