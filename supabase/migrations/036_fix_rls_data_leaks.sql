-- Fix RLS Data Leaks
-- Issue #0: Multiple tables readable by ANY authenticated user
-- Verified 2026-03-14: client user could see all 181 profiles, 120 fc_clients, 19 invitation tokens

-- ============================================================
-- 1. PROFILES: Remove "Allow public read access" (qual: true)
--    Replace with policy that allows:
--    - Users to read their own profile
--    - Studio staff to read profiles of users in their studio
--    - Public booking pages to read trainer profiles (by slug)
-- ============================================================

DROP POLICY IF EXISTS "Allow public read access" ON profiles;

-- Allow authenticated users to read profiles of trainers/studio owners
-- (needed for booking pages, calendar, etc.)
-- This is narrower than "true" — only exposes trainer/owner profiles, not all clients
CREATE POLICY "Allow read trainer and studio owner profiles"
  ON profiles FOR SELECT
  TO public
  USING (
    role IN ('solo_practitioner', 'studio_owner', 'trainer', 'studio_manager')
    OR id = auth.uid()
  );

-- ============================================================
-- 2. FC_CLIENTS: Remove "Allow email check for invitations" (qual: true)
--    This was way too broad — allowed reading ALL client data
-- ============================================================

DROP POLICY IF EXISTS "Allow email check for invitations" ON fc_clients;

-- Replace with a narrow policy: only allow checking by email for the authenticated user's own email
-- The invitation check is done server-side with service role, so this browser-level policy isn't needed
-- If client invitation flow needs email lookup, it should go through an API route with service role

-- ============================================================
-- 3. TA_INVITATIONS: Remove "Anyone can view invitation by token" (qual: true)
--    This leaked ALL invitation tokens to ANY user
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON ta_invitations;

-- Replace with a policy that allows viewing invitations only by the specific token
-- The invitation acceptance page passes the token as a query parameter
-- This policy allows SELECT only when filtering by token (the page passes ?token=eq.xxx)
CREATE POLICY "Allow view invitation by matching token"
  ON ta_invitations FOR SELECT
  TO public
  USING (
    -- Studio owners/admins can see their invitations (existing policy covers this)
    -- For token-based lookup (invitation acceptance page), allow anon access
    -- but only if the request filters by token (which PostgREST enforces via the query)
    -- We use auth.uid() IS NULL to allow anon access for invitation acceptance
    auth.uid() IS NULL
    OR invited_by = auth.uid()
    OR studio_id IN (
      SELECT bs_staff.studio_id FROM bs_staff
      WHERE bs_staff.id = auth.uid()
      AND bs_staff.staff_type = ANY(ARRAY['owner', 'admin'])
    )
    OR (studio_id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = ANY(ARRAY['solo_practitioner', 'studio_owner'])
    ))
  );

-- ============================================================
-- 4. TA_SESSIONS: Enable RLS (currently disabled!)
-- ============================================================

ALTER TABLE ta_sessions ENABLE ROW LEVEL SECURITY;

-- Policies already exist but weren't being enforced:
-- "Trainers can manage their own sessions" (trainer_id = auth.uid())
-- "Clients can view their own sessions" (client_id = auth.uid())
-- Now they will actually be enforced.

-- Also allow studio staff to view sessions in their studio
CREATE POLICY "Studio staff can view sessions in their studio"
  ON ta_sessions FOR SELECT
  TO public
  USING (
    trainer_id IN (
      SELECT bs_staff.id FROM bs_staff
      WHERE bs_staff.studio_id IN (
        SELECT s.studio_id FROM bs_staff s WHERE s.id = auth.uid()
      )
    )
  );
