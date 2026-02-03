-- Migration: Create referral signup links table
-- Purpose: Enable studio owners and solo practitioners to create promotional offers and referral links

CREATE TABLE IF NOT EXISTS referral_signup_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES bs_studios(id) NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,

  -- Offer details
  title TEXT NOT NULL,
  description TEXT,
  referral_code TEXT UNIQUE NOT NULL,

  -- Pricing
  payment_amount INTEGER DEFAULT 0, -- Amount in cents
  currency TEXT DEFAULT 'GBP',

  -- Credits/Sessions
  credits INTEGER DEFAULT 0,
  expiry_days INTEGER DEFAULT 90, -- Days until credits expire after redemption

  -- Limits
  max_referrals INTEGER, -- NULL means unlimited
  current_referrals INTEGER DEFAULT 0,

  -- Flags
  is_gift BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Dates
  expires_at TIMESTAMPTZ, -- NULL means never expires
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_signup_links_studio ON referral_signup_links(studio_id);
CREATE INDEX IF NOT EXISTS idx_referral_signup_links_created_by ON referral_signup_links(created_by);
CREATE INDEX IF NOT EXISTS idx_referral_signup_links_code ON referral_signup_links(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_signup_links_active ON referral_signup_links(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE referral_signup_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own offers" ON referral_signup_links
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create their own offers" ON referral_signup_links
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own offers" ON referral_signup_links
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own offers" ON referral_signup_links
  FOR DELETE USING (created_by = auth.uid());

-- Allow public read of active offers by referral code (for signup page)
CREATE POLICY "Anyone can view active offers by code" ON referral_signup_links
  FOR SELECT USING (is_active = true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_referral_signup_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_referral_signup_links_updated_at
  BEFORE UPDATE ON referral_signup_links
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_signup_links_updated_at();

-- Comments
COMMENT ON TABLE referral_signup_links IS 'Promotional offers and referral links for client acquisition';
COMMENT ON COLUMN referral_signup_links.referral_code IS 'Unique 8-character code for the offer';
COMMENT ON COLUMN referral_signup_links.payment_amount IS 'Price in cents (0 for free offers)';
COMMENT ON COLUMN referral_signup_links.credits IS 'Number of session credits included';
COMMENT ON COLUMN referral_signup_links.expiry_days IS 'Days until credits expire after redemption';
COMMENT ON COLUMN referral_signup_links.max_referrals IS 'Maximum redemptions allowed (NULL = unlimited)';
