-- Migration: Create template assignment tables
-- Purpose: Allow studio owners to assign templates to trainers and clients
--
-- LOGIC:
-- 1. TRAINER ASSIGNMENT: Template assigned to a trainer → trainer can use it on ANY of their clients
--    - The template becomes part of the trainer's "toolkit"
--    - Trainer sees these templates when working with any client
--
-- 2. CLIENT ASSIGNMENT: Template assigned to a specific client → ANY studio staff can use it for THAT client only
--    - All trainers/instructors/staff at the same studio can see and use the template
--    - But ONLY for that specific client

-- Create trainer-template assignments table
-- Links a template to a trainer's toolkit
CREATE TABLE IF NOT EXISTS ta_trainer_template_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES ta_workout_templates(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, trainer_id)
);

-- Create client-template assignments table
-- Links a template to a specific client (viewable by all studio staff)
CREATE TABLE IF NOT EXISTS ta_client_template_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES ta_workout_templates(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES fc_clients(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, client_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_trainer_template_assignments_trainer
  ON ta_trainer_template_assignments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_template_assignments_template
  ON ta_trainer_template_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_client_template_assignments_client
  ON ta_client_template_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_template_assignments_template
  ON ta_client_template_assignments(template_id);

-- Enable RLS
ALTER TABLE ta_trainer_template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ta_client_template_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR TRAINER TEMPLATE ASSIGNMENTS
-- ============================================================================

-- Trainers can view templates assigned to THEM (their toolkit)
-- Studio owners/admins can view all trainer assignments in their studio
CREATE POLICY "trainer_template_assignments_select" ON ta_trainer_template_assignments
  FOR SELECT USING (
    -- Trainer can see their own assignments
    trainer_id = auth.uid()
    -- Person who assigned can see it
    OR assigned_by = auth.uid()
    -- Studio owners/admins can see all assignments for trainers in their studio
    OR EXISTS (
      SELECT 1 FROM bs_staff s1
      JOIN bs_staff s2 ON s1.studio_id = s2.studio_id
      WHERE s1.id = auth.uid()
      AND s1.staff_type IN ('owner', 'admin')
      AND s2.id = ta_trainer_template_assignments.trainer_id
    )
  );

-- Studio owners/admins and solo practitioners can assign templates to trainers
CREATE POLICY "trainer_template_assignments_insert" ON ta_trainer_template_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bs_staff
      WHERE bs_staff.id = auth.uid()
      AND bs_staff.staff_type IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('studio_owner', 'solo_practitioner')
    )
  );

-- Studio owners/admins can delete trainer assignments, or the person who assigned
CREATE POLICY "trainer_template_assignments_delete" ON ta_trainer_template_assignments
  FOR DELETE USING (
    assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bs_staff
      WHERE bs_staff.id = auth.uid()
      AND bs_staff.staff_type IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- RLS POLICIES FOR CLIENT TEMPLATE ASSIGNMENTS
-- ============================================================================

-- ANY staff at the same studio as the client can view client template assignments
-- This allows any trainer/instructor to use the template for that specific client
CREATE POLICY "client_template_assignments_select" ON ta_client_template_assignments
  FOR SELECT USING (
    -- Person who assigned can see it
    assigned_by = auth.uid()
    -- Any staff member at the same studio as the client can see it
    OR EXISTS (
      SELECT 1 FROM bs_staff
      JOIN fc_clients ON bs_staff.studio_id = fc_clients.studio_id
      WHERE bs_staff.id = auth.uid()
      AND fc_clients.id = ta_client_template_assignments.client_id
    )
    -- Solo practitioners can see assignments for their clients
    OR EXISTS (
      SELECT 1 FROM fc_clients
      WHERE fc_clients.id = ta_client_template_assignments.client_id
      AND fc_clients.invited_by = auth.uid()
    )
  );

-- Trainers can assign templates to clients they work with
-- Studio owners/admins can assign to any client in their studio
CREATE POLICY "client_template_assignments_insert" ON ta_client_template_assignments
  FOR INSERT WITH CHECK (
    -- Trainer who invited the client can assign
    EXISTS (
      SELECT 1 FROM fc_clients
      WHERE fc_clients.id = client_id
      AND fc_clients.invited_by = auth.uid()
    )
    -- Any staff at the same studio can assign
    OR EXISTS (
      SELECT 1 FROM bs_staff
      JOIN fc_clients ON bs_staff.studio_id = fc_clients.studio_id
      WHERE bs_staff.id = auth.uid()
      AND fc_clients.id = client_id
    )
    -- Solo practitioners
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'solo_practitioner'
    )
  );

-- Trainers can delete assignments they created or for their clients
-- Studio owners/admins can delete any in their studio
CREATE POLICY "client_template_assignments_delete" ON ta_client_template_assignments
  FOR DELETE USING (
    -- Person who assigned can delete
    assigned_by = auth.uid()
    -- Trainer who invited the client can delete
    OR EXISTS (
      SELECT 1 FROM fc_clients
      WHERE fc_clients.id = ta_client_template_assignments.client_id
      AND fc_clients.invited_by = auth.uid()
    )
    -- Studio owners/admins can delete any
    OR EXISTS (
      SELECT 1 FROM bs_staff
      JOIN fc_clients ON bs_staff.studio_id = fc_clients.studio_id
      WHERE bs_staff.id = auth.uid()
      AND bs_staff.staff_type IN ('owner', 'admin')
      AND fc_clients.id = ta_client_template_assignments.client_id
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Get all templates available for a trainer to use on a client
-- ============================================================================
-- This combines:
-- 1. Templates assigned directly to the trainer (their toolkit)
-- 2. Templates assigned specifically to the client
-- 3. Templates created by the trainer themselves

CREATE OR REPLACE FUNCTION get_available_templates_for_client(
  p_trainer_id UUID,
  p_client_id UUID
)
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  source TEXT -- 'trainer_toolkit', 'client_specific', 'own_template'
) AS $$
BEGIN
  RETURN QUERY
  -- Templates assigned to the trainer (their toolkit)
  SELECT DISTINCT
    t.id,
    t.name,
    'trainer_toolkit'::TEXT
  FROM ta_workout_templates t
  JOIN ta_trainer_template_assignments tta ON t.id = tta.template_id
  WHERE tta.trainer_id = p_trainer_id

  UNION

  -- Templates assigned specifically to this client
  SELECT DISTINCT
    t.id,
    t.name,
    'client_specific'::TEXT
  FROM ta_workout_templates t
  JOIN ta_client_template_assignments cta ON t.id = cta.template_id
  WHERE cta.client_id = p_client_id

  UNION

  -- Templates created by the trainer themselves
  SELECT DISTINCT
    t.id,
    t.name,
    'own_template'::TEXT
  FROM ta_workout_templates t
  WHERE t.created_by = p_trainer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
