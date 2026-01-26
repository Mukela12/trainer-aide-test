-- ========================================
-- AI PROGRAMS TABLES
-- Run this SQL in Supabase SQL Editor to create the required tables
-- ========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. CLIENT PROFILES (must be created first due to foreign key)
-- ========================================
CREATE TABLE IF NOT EXISTS client_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  trainer_id UUID,
  studio_id UUID,

  -- Personal Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,

  -- Physical
  height_cm DECIMAL,
  weight_kg DECIMAL,
  body_fat_percentage DECIMAL,

  -- Goals
  primary_goal TEXT,
  secondary_goals TEXT[] DEFAULT '{}',
  target_weight_kg DECIMAL,

  -- Experience
  experience_level TEXT,
  training_history TEXT,
  years_training DECIMAL,

  -- Health
  injuries JSONB DEFAULT '[]',
  medical_conditions TEXT[] DEFAULT '{}',
  medications TEXT[] DEFAULT '{}',

  -- Preferences
  available_equipment TEXT[] DEFAULT '{}',
  training_location TEXT,
  preferred_training_days TEXT[] DEFAULT '{}',
  session_duration_preference INTEGER,
  exercise_aversions TEXT[] DEFAULT '{}',

  -- Lifestyle
  occupation TEXT,
  activity_level TEXT,
  sleep_hours DECIMAL,
  stress_level TEXT,

  -- Nutrition
  dietary_restrictions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',

  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for client_profiles
CREATE INDEX IF NOT EXISTS idx_client_profiles_trainer_id ON client_profiles(trainer_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_user_id ON client_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_is_active ON client_profiles(is_active);

-- ========================================
-- 2. AI PROGRAMS (Master Record)
-- ========================================
CREATE TABLE IF NOT EXISTS ai_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL,
  trainer_id UUID NOT NULL,
  studio_id UUID,

  -- Metadata
  program_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),

  -- Generation Status
  generation_status TEXT NOT NULL DEFAULT 'generating' CHECK (generation_status IN ('generating', 'completed', 'failed')),
  generation_error TEXT,

  -- Progress Tracking
  progress_message TEXT,
  current_step INTEGER,
  total_steps INTEGER,
  progress_percentage INTEGER,

  -- Structure
  total_weeks INTEGER NOT NULL,
  sessions_per_week INTEGER NOT NULL,
  session_duration_minutes INTEGER,

  -- Goal Configuration
  primary_goal TEXT NOT NULL,
  secondary_goals TEXT[] DEFAULT '{}',
  experience_level TEXT NOT NULL,

  -- Dates
  start_date DATE,
  end_date DATE,
  actual_completion_date DATE,

  -- AI Generation Metadata
  ai_model TEXT NOT NULL,
  generation_prompt_version TEXT,
  generation_parameters JSONB,
  generated_at TIMESTAMPTZ,

  -- Program Summary
  ai_rationale TEXT,
  movement_balance_summary JSONB,
  weekly_structure_summary TEXT,

  -- Progress
  completion_percentage INTEGER NOT NULL DEFAULT 0,
  sessions_completed INTEGER NOT NULL DEFAULT 0,
  sessions_total INTEGER,

  -- Flags
  is_template BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  allow_client_modifications BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- Indexes for ai_programs
CREATE INDEX IF NOT EXISTS idx_ai_programs_trainer_id ON ai_programs(trainer_id);
CREATE INDEX IF NOT EXISTS idx_ai_programs_client_profile_id ON ai_programs(client_profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_programs_status ON ai_programs(status);
CREATE INDEX IF NOT EXISTS idx_ai_programs_generation_status ON ai_programs(generation_status);
CREATE INDEX IF NOT EXISTS idx_ai_programs_is_template ON ai_programs(is_template);

-- ========================================
-- 2. AI WORKOUTS (Individual Sessions)
-- ========================================
CREATE TABLE IF NOT EXISTS ai_workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link
  program_id UUID NOT NULL REFERENCES ai_programs(id) ON DELETE CASCADE,

  -- Position
  week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 52),
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  session_order INTEGER,

  -- Metadata
  workout_name TEXT NOT NULL,
  workout_focus TEXT,
  session_type TEXT CHECK (session_type IN ('strength', 'hypertrophy', 'conditioning', 'mobility', 'recovery', 'mixed')),

  -- Scheduling
  scheduled_date DATE,
  planned_duration_minutes INTEGER,

  -- Movement Balance
  movement_patterns_covered TEXT[] DEFAULT '{}',
  planes_of_motion_covered TEXT[] DEFAULT '{}',
  primary_muscle_groups TEXT[] DEFAULT '{}',

  -- AI Rationale
  ai_rationale TEXT,
  exercise_selection_criteria JSONB,

  -- Completion
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  actual_duration_minutes INTEGER,
  overall_rpe INTEGER CHECK (overall_rpe >= 1 AND overall_rpe <= 10),
  trainer_notes TEXT,
  client_feedback TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint for program + week + day
  UNIQUE(program_id, week_number, day_number)
);

-- Indexes for ai_workouts
CREATE INDEX IF NOT EXISTS idx_ai_workouts_program_id ON ai_workouts(program_id);
CREATE INDEX IF NOT EXISTS idx_ai_workouts_week_number ON ai_workouts(week_number);
CREATE INDEX IF NOT EXISTS idx_ai_workouts_is_completed ON ai_workouts(is_completed);

-- ========================================
-- 3. AI WORKOUT EXERCISES (Prescriptions)
-- ========================================
CREATE TABLE IF NOT EXISTS ai_workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  workout_id UUID NOT NULL REFERENCES ai_workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL, -- References ta_exercise_library_original

  -- Position
  exercise_order INTEGER NOT NULL,
  block_label TEXT,

  -- Prescription (Target)
  sets INTEGER,
  reps_min INTEGER,
  reps_max INTEGER,
  reps_target TEXT,
  target_load_kg DECIMAL,
  target_load_percentage DECIMAL,
  target_rpe INTEGER CHECK (target_rpe >= 1 AND target_rpe <= 10),
  target_rir INTEGER CHECK (target_rir >= 0 AND target_rir <= 5),

  -- Tempo & Rest
  tempo TEXT,
  rest_seconds INTEGER,

  -- Time-Based
  target_duration_seconds INTEGER,
  target_distance_meters INTEGER,

  -- Flags
  is_unilateral BOOLEAN NOT NULL DEFAULT false,
  is_bodyweight BOOLEAN NOT NULL DEFAULT false,
  is_timed BOOLEAN NOT NULL DEFAULT false,

  -- Coaching
  coaching_cues TEXT[] DEFAULT '{}',
  common_mistakes TEXT[] DEFAULT '{}',
  modifications TEXT[] DEFAULT '{}',

  -- Actual Performance
  actual_sets INTEGER,
  actual_reps INTEGER,
  actual_load_kg DECIMAL,
  actual_rpe INTEGER,
  actual_duration_seconds INTEGER,
  actual_distance_meters INTEGER,
  performance_notes TEXT,

  -- Completion
  is_completed BOOLEAN NOT NULL DEFAULT false,
  skipped BOOLEAN NOT NULL DEFAULT false,
  skip_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ai_workout_exercises
CREATE INDEX IF NOT EXISTS idx_ai_workout_exercises_workout_id ON ai_workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_ai_workout_exercises_exercise_id ON ai_workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_ai_workout_exercises_order ON ai_workout_exercises(exercise_order);

-- ========================================
-- 4. AI NUTRITION PLANS
-- ========================================
CREATE TABLE IF NOT EXISTS ai_nutrition_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link (1:1 with program)
  program_id UUID NOT NULL REFERENCES ai_programs(id) ON DELETE CASCADE UNIQUE,

  -- Targets
  daily_calories INTEGER,
  protein_grams INTEGER,
  carbs_grams INTEGER,
  fats_grams INTEGER,
  fiber_grams INTEGER,

  -- Calculation
  calculation_method TEXT,
  tdee_estimated INTEGER,
  calorie_adjustment_percentage INTEGER,

  -- Meal Structure
  meals_per_day INTEGER,
  meal_timing_notes TEXT,
  pre_workout_nutrition TEXT,
  post_workout_nutrition TEXT,

  -- Meal Templates
  meal_templates JSONB,

  -- Hydration & Supplements
  daily_water_liters DECIMAL,
  supplement_recommendations TEXT[] DEFAULT '{}',

  -- Dietary
  dietary_restrictions TEXT[] DEFAULT '{}',
  dietary_preferences TEXT[] DEFAULT '{}',

  -- AI
  ai_rationale TEXT,
  generated_at TIMESTAMPTZ,

  -- Disclaimer
  disclaimer TEXT NOT NULL DEFAULT 'This nutrition plan is AI-generated and should be reviewed by a qualified nutritionist.',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 5. AI GENERATIONS (Logging)
-- ========================================
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Scope
  generation_type TEXT NOT NULL CHECK (generation_type IN ('program', 'workout', 'exercise_block', 'nutrition', 'progression')),
  entity_id UUID,
  entity_type TEXT,

  -- Model
  ai_provider TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  prompt_version TEXT,

  -- Request/Response
  system_prompt TEXT,
  user_prompt TEXT,
  prompt_parameters JSONB,
  ai_response TEXT,
  structured_output JSONB,

  -- Tokens
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd DECIMAL,

  -- Tool Calls
  tool_calls JSONB,
  tool_results JSONB,

  -- Performance
  latency_ms INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  error_code TEXT,

  -- Context
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ai_generations
CREATE INDEX IF NOT EXISTS idx_ai_generations_entity ON ai_generations(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_ai_generations_type ON ai_generations(generation_type);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at);

-- ========================================
-- 6. AI PROGRAM REVISIONS (Version History)
-- ========================================
CREATE TABLE IF NOT EXISTS ai_program_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link
  program_id UUID NOT NULL REFERENCES ai_programs(id) ON DELETE CASCADE,

  -- Version
  revision_number INTEGER NOT NULL,
  revision_type TEXT CHECK (revision_type IN ('initial', 'edit', 'progression', 'regeneration')),
  change_description TEXT,

  -- Snapshot
  program_snapshot JSONB NOT NULL,
  workouts_count INTEGER,
  exercises_count INTEGER,

  -- Changes
  changes_made JSONB,

  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint for program + revision number
  UNIQUE(program_id, revision_number)
);

-- Index for ai_program_revisions
CREATE INDEX IF NOT EXISTS idx_ai_program_revisions_program_id ON ai_program_revisions(program_id);

-- ========================================
-- Enable Row Level Security (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_program_revisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_profiles
CREATE POLICY "Users can view own client profiles" ON client_profiles
  FOR SELECT USING (auth.uid() = trainer_id OR auth.uid() = user_id);

CREATE POLICY "Users can insert client profiles" ON client_profiles
  FOR INSERT WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Users can update own client profiles" ON client_profiles
  FOR UPDATE USING (auth.uid() = trainer_id);

CREATE POLICY "Service role full access to client_profiles" ON client_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for ai_programs
CREATE POLICY "Users can view own programs" ON ai_programs
  FOR SELECT USING (auth.uid() = trainer_id OR auth.uid() = created_by);

CREATE POLICY "Users can insert own programs" ON ai_programs
  FOR INSERT WITH CHECK (auth.uid() = trainer_id OR auth.uid() = created_by);

CREATE POLICY "Users can update own programs" ON ai_programs
  FOR UPDATE USING (auth.uid() = trainer_id OR auth.uid() = created_by);

CREATE POLICY "Users can delete own programs" ON ai_programs
  FOR DELETE USING (auth.uid() = trainer_id OR auth.uid() = created_by);

-- Service role bypass for ai_programs
CREATE POLICY "Service role full access to ai_programs" ON ai_programs
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for ai_workouts (based on parent program)
CREATE POLICY "Users can view own workouts" ON ai_workouts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ai_programs WHERE ai_programs.id = ai_workouts.program_id
            AND (ai_programs.trainer_id = auth.uid() OR ai_programs.created_by = auth.uid()))
  );

CREATE POLICY "Service role full access to ai_workouts" ON ai_workouts
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for ai_workout_exercises (based on parent workout)
CREATE POLICY "Users can view own exercises" ON ai_workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_workouts
      JOIN ai_programs ON ai_programs.id = ai_workouts.program_id
      WHERE ai_workouts.id = ai_workout_exercises.workout_id
      AND (ai_programs.trainer_id = auth.uid() OR ai_programs.created_by = auth.uid())
    )
  );

CREATE POLICY "Service role full access to ai_workout_exercises" ON ai_workout_exercises
  FOR ALL USING (auth.role() = 'service_role');

-- Service role bypass for other tables
CREATE POLICY "Service role full access to ai_nutrition_plans" ON ai_nutrition_plans
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to ai_generations" ON ai_generations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to ai_program_revisions" ON ai_program_revisions
  FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- Updated_at Trigger Function
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON client_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_programs_updated_at
  BEFORE UPDATE ON ai_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_workouts_updated_at
  BEFORE UPDATE ON ai_workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_workout_exercises_updated_at
  BEFORE UPDATE ON ai_workout_exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_nutrition_plans_updated_at
  BEFORE UPDATE ON ai_nutrition_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Grant permissions to authenticated users
-- ========================================
GRANT ALL ON client_profiles TO authenticated;
GRANT ALL ON ai_programs TO authenticated;
GRANT ALL ON ai_workouts TO authenticated;
GRANT ALL ON ai_workout_exercises TO authenticated;
GRANT ALL ON ai_nutrition_plans TO authenticated;
GRANT ALL ON ai_generations TO authenticated;
GRANT ALL ON ai_program_revisions TO authenticated;

-- Grant permissions to service role
GRANT ALL ON client_profiles TO service_role;
GRANT ALL ON ai_programs TO service_role;
GRANT ALL ON ai_workouts TO service_role;
GRANT ALL ON ai_workout_exercises TO service_role;
GRANT ALL ON ai_nutrition_plans TO service_role;
GRANT ALL ON ai_generations TO service_role;
GRANT ALL ON ai_program_revisions TO service_role;

-- ========================================
-- Done!
-- ========================================
-- To run this script:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste this entire script
-- 4. Click "Run"
