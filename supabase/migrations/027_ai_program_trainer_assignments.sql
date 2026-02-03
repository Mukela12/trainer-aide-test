-- Migration: Create AI program trainer assignment table
-- Purpose: Allow studio owners/solo practitioners to assign AI-generated programs to trainers
--
-- LOGIC:
-- 1. AI programs can be assigned to clients (existing via ai_programs.client_profile_id)
-- 2. AI programs can NOW also be assigned to trainers (new via this table)
--    - The AI program becomes part of the trainer's "toolkit"
--    - Trainer can use these AI programs when working with any client

-- Create trainer assignment table for AI programs
CREATE TABLE IF NOT EXISTS ai_program_trainer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_program_id UUID NOT NULL REFERENCES ai_programs(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ai_program_id, trainer_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_program_trainer_assignments_trainer
  ON ai_program_trainer_assignments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_ai_program_trainer_assignments_program
  ON ai_program_trainer_assignments(ai_program_id);

-- Enable RLS
ALTER TABLE ai_program_trainer_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR AI PROGRAM TRAINER ASSIGNMENTS
-- ============================================================================

-- Trainers can view their own assignments
CREATE POLICY "ai_program_trainer_assignments_select_own"
  ON ai_program_trainer_assignments FOR SELECT
  USING (trainer_id = auth.uid());

-- Person who assigned can see their assignments
CREATE POLICY "ai_program_trainer_assignments_select_assigned_by"
  ON ai_program_trainer_assignments FOR SELECT
  USING (assigned_by = auth.uid());

-- Studio owners/admins can view all assignments for trainers in their studio
CREATE POLICY "ai_program_trainer_assignments_select_studio_admin"
  ON ai_program_trainer_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bs_staff s1
      JOIN bs_staff s2 ON s1.studio_id = s2.studio_id
      WHERE s1.id = auth.uid()
      AND s1.staff_type IN ('owner', 'admin', 'manager')
      AND s2.id = ai_program_trainer_assignments.trainer_id
    )
  );

-- Solo practitioners can view assignments where they are either the trainer or assigner
CREATE POLICY "ai_program_trainer_assignments_select_solo"
  ON ai_program_trainer_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bs_staff
      WHERE bs_staff.id = auth.uid()
      AND bs_staff.is_solo = true
    )
    AND (trainer_id = auth.uid() OR assigned_by = auth.uid())
  );

-- Studio owners/admins can insert trainer assignments
CREATE POLICY "ai_program_trainer_assignments_insert_admin"
  ON ai_program_trainer_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bs_staff
      WHERE bs_staff.id = auth.uid()
      AND bs_staff.staff_type IN ('owner', 'admin', 'manager')
    )
  );

-- Solo practitioners can insert (assign to themselves or others)
CREATE POLICY "ai_program_trainer_assignments_insert_solo"
  ON ai_program_trainer_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bs_staff
      WHERE bs_staff.id = auth.uid()
      AND bs_staff.is_solo = true
    )
  );

-- Anyone with studio owner/manager role in profiles can insert
CREATE POLICY "ai_program_trainer_assignments_insert_profile_role"
  ON ai_program_trainer_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('studio_owner', 'solo_practitioner')
    )
  );

-- Studio owners/admins can delete assignments
CREATE POLICY "ai_program_trainer_assignments_delete_admin"
  ON ai_program_trainer_assignments FOR DELETE
  USING (
    assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bs_staff
      WHERE bs_staff.id = auth.uid()
      AND bs_staff.staff_type IN ('owner', 'admin', 'manager')
    )
  );

-- Solo practitioners can delete their own assignments
CREATE POLICY "ai_program_trainer_assignments_delete_solo"
  ON ai_program_trainer_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM bs_staff
      WHERE bs_staff.id = auth.uid()
      AND bs_staff.is_solo = true
    )
    AND (trainer_id = auth.uid() OR assigned_by = auth.uid())
  );
