-- Migration: Create ta_services table
-- Purpose: Store service types (session types) for trainers/studios

CREATE TABLE IF NOT EXISTS ta_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES bs_studios(id),
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- minutes (30, 45, 60, 75, 90)
  type TEXT NOT NULL DEFAULT '1-2-1', -- '1-2-1', 'duet', 'group'
  max_capacity INTEGER DEFAULT 1,
  credits_required NUMERIC(4,2) NOT NULL DEFAULT 1,
  color TEXT DEFAULT '#12229D',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_services_studio ON ta_services(studio_id);
CREATE INDEX IF NOT EXISTS idx_services_created_by ON ta_services(created_by);
CREATE INDEX IF NOT EXISTS idx_services_active ON ta_services(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE ta_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view services in their studio" ON ta_services
  FOR SELECT USING (
    studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Trainers can create services" ON ta_services
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "Trainers can update their own services" ON ta_services
  FOR UPDATE USING (
    created_by = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid() AND staff_type IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete services" ON ta_services
  FOR DELETE USING (
    created_by = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid() AND staff_type IN ('owner', 'admin')
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ta_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ta_services_updated_at
  BEFORE UPDATE ON ta_services
  FOR EACH ROW
  EXECUTE FUNCTION update_ta_services_updated_at();
