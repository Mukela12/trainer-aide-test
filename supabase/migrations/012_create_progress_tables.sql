-- Migration: Create client progress tracking tables
-- Purpose: Store body metrics and goals for progress tracking

-- Body metrics history
CREATE TABLE IF NOT EXISTS ta_body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES fc_clients(id) NOT NULL,
  trainer_id UUID REFERENCES auth.users(id),
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Measurements
  weight_kg NUMERIC(5,2),
  body_fat_percent NUMERIC(4,1),
  muscle_mass_kg NUMERIC(5,2),

  -- Body measurements (cm)
  chest_cm NUMERIC(5,1),
  waist_cm NUMERIC(5,1),
  hips_cm NUMERIC(5,1),
  arm_left_cm NUMERIC(4,1),
  arm_right_cm NUMERIC(4,1),
  thigh_left_cm NUMERIC(4,1),
  thigh_right_cm NUMERIC(4,1),

  -- Other metrics
  resting_heart_rate INTEGER,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,

  notes TEXT,
  photo_urls TEXT[], -- Array of photo URLs for progress pics

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client goals
CREATE TABLE IF NOT EXISTS ta_client_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES fc_clients(id) NOT NULL,
  trainer_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),

  -- Goal type: weight_loss, muscle_gain, strength, endurance, flexibility, general_fitness, custom
  goal_type TEXT NOT NULL,

  -- Description and targets
  description TEXT NOT NULL,
  target_value NUMERIC,
  target_unit TEXT, -- kg, %, reps, etc.
  current_value NUMERIC,

  -- Timeline
  start_date DATE DEFAULT CURRENT_DATE,
  target_date DATE,

  -- Status: active, achieved, abandoned, paused
  status TEXT DEFAULT 'active',
  achieved_at TIMESTAMPTZ,

  -- Priority: 1 (highest) to 5 (lowest)
  priority INTEGER DEFAULT 3,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal milestones/checkpoints
CREATE TABLE IF NOT EXISTS ta_goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES ta_client_goals(id) ON DELETE CASCADE NOT NULL,

  title TEXT NOT NULL,
  target_value NUMERIC,
  target_date DATE,

  -- Status: pending, achieved, missed
  status TEXT DEFAULT 'pending',
  achieved_at TIMESTAMPTZ,
  achieved_value NUMERIC,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_body_metrics_client ON ta_body_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_body_metrics_date ON ta_body_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_goals_client ON ta_client_goals(client_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON ta_client_goals(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_goals_trainer ON ta_client_goals(trainer_id);
CREATE INDEX IF NOT EXISTS idx_milestones_goal ON ta_goal_milestones(goal_id);

-- Enable RLS
ALTER TABLE ta_body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ta_client_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ta_goal_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for body metrics
CREATE POLICY "Trainers can view client metrics" ON ta_body_metrics
  FOR SELECT USING (
    trainer_id = auth.uid()
    OR recorded_by = auth.uid()
  );

CREATE POLICY "Trainers can create client metrics" ON ta_body_metrics
  FOR INSERT WITH CHECK (
    recorded_by = auth.uid()
  );

CREATE POLICY "Trainers can update client metrics" ON ta_body_metrics
  FOR UPDATE USING (
    recorded_by = auth.uid()
    OR trainer_id = auth.uid()
  );

-- RLS Policies for goals
CREATE POLICY "Trainers can view client goals" ON ta_client_goals
  FOR SELECT USING (
    trainer_id = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "Trainers can create client goals" ON ta_client_goals
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "Trainers can update client goals" ON ta_client_goals
  FOR UPDATE USING (
    created_by = auth.uid()
    OR trainer_id = auth.uid()
  );

-- RLS Policies for milestones
CREATE POLICY "Trainers can manage milestones" ON ta_goal_milestones
  FOR ALL USING (
    goal_id IN (
      SELECT id FROM ta_client_goals
      WHERE trainer_id = auth.uid() OR created_by = auth.uid()
    )
  );

-- Update timestamp trigger for goals
CREATE OR REPLACE FUNCTION update_ta_client_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ta_client_goals_updated_at
  BEFORE UPDATE ON ta_client_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_ta_client_goals_updated_at();

-- View for client progress summary
-- Note: trainer relationship is derived from body_metrics or goals, not fc_clients
CREATE OR REPLACE VIEW v_client_progress AS
SELECT
  c.id as client_id,
  (SELECT trainer_id FROM ta_body_metrics
   WHERE client_id = c.id ORDER BY recorded_at DESC LIMIT 1) as trainer_id,
  (SELECT weight_kg FROM ta_body_metrics
   WHERE client_id = c.id ORDER BY recorded_at DESC LIMIT 1) as latest_weight,
  (SELECT body_fat_percent FROM ta_body_metrics
   WHERE client_id = c.id ORDER BY recorded_at DESC LIMIT 1) as latest_body_fat,
  (SELECT COUNT(*) FROM ta_client_goals
   WHERE client_id = c.id AND status = 'active') as active_goals,
  (SELECT COUNT(*) FROM ta_client_goals
   WHERE client_id = c.id AND status = 'achieved') as achieved_goals,
  (SELECT recorded_at FROM ta_body_metrics
   WHERE client_id = c.id ORDER BY recorded_at DESC LIMIT 1) as last_measurement_date
FROM fc_clients c;

-- Comments
COMMENT ON TABLE ta_body_metrics IS 'Client body measurements and metrics history';
COMMENT ON TABLE ta_client_goals IS 'Client fitness goals and targets';
COMMENT ON TABLE ta_goal_milestones IS 'Checkpoints/milestones for tracking goal progress';
