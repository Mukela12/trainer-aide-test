-- Migration: Create payments tables for Stripe integration
-- Purpose: Store Stripe Connect accounts and payment transactions

-- Stripe Connect accounts for trainers
CREATE TABLE IF NOT EXISTS ta_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  stripe_account_id TEXT UNIQUE NOT NULL,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  onboarding_complete BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  default_currency TEXT DEFAULT 'gbp',
  country TEXT DEFAULT 'GB',
  business_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS ta_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) NOT NULL,
  client_id UUID REFERENCES fc_clients(id),
  booking_id UUID REFERENCES ta_bookings(id),
  package_id UUID, -- Will reference ta_packages once created

  -- Stripe fields
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,
  stripe_checkout_session_id TEXT,

  -- Amounts (all in cents)
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER DEFAULT 0, -- 2.5%
  trainer_amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'gbp',

  -- Status: pending, processing, succeeded, failed, refunded, cancelled
  status TEXT DEFAULT 'pending',

  -- Payment type: session, package
  payment_type TEXT DEFAULT 'session',

  description TEXT,
  receipt_url TEXT,
  failure_message TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user ON ta_stripe_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_stripe_id ON ta_stripe_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_trainer ON ta_payments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON ta_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON ta_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON ta_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi ON ta_payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON ta_payments(created_at);

-- Enable RLS
ALTER TABLE ta_stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ta_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Stripe accounts
CREATE POLICY "Users can view their own Stripe account" ON ta_stripe_accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own Stripe account" ON ta_stripe_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own Stripe account" ON ta_stripe_accounts
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for payments
CREATE POLICY "Trainers can view their own payments" ON ta_payments
  FOR SELECT USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can create payments" ON ta_payments
  FOR INSERT WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their own payments" ON ta_payments
  FOR UPDATE USING (trainer_id = auth.uid());

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_ta_stripe_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ta_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ta_stripe_accounts_updated_at
  BEFORE UPDATE ON ta_stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_ta_stripe_accounts_updated_at();

CREATE TRIGGER trigger_ta_payments_updated_at
  BEFORE UPDATE ON ta_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_ta_payments_updated_at();

-- Platform fee constant (2.5%)
COMMENT ON TABLE ta_payments IS 'Payment transactions with 2.5% platform fee';
COMMENT ON COLUMN ta_payments.platform_fee_cents IS 'Platform fee (2.5% of amount)';
COMMENT ON COLUMN ta_payments.trainer_amount_cents IS 'Amount after platform fee deduction';
