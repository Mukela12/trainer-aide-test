-- Migration: Fix RLS policy for solo practitioners to create invitations
-- Purpose: Allow solo_practitioner and studio_owner roles to create invitations
-- This migration updates ta_invitations RLS to allow profile-based authorization
--
-- IMPORTANT: This migration avoids modifying bs_studios and bs_staff RLS policies
-- to prevent infinite recursion issues when those tables reference each other.
-- The fix focuses on ta_invitations only, using profiles table for authorization.

-- ============================================
-- Fix ta_invitations RLS for solo practitioners
-- ============================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "Studio owners can create invitations" ON ta_invitations;

-- Create updated insert policy that also checks profiles.role
CREATE POLICY "Studio owners can create invitations" ON ta_invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid() AND
    (
      -- Original check: bs_staff with owner/admin role
      studio_id IN (
        SELECT studio_id FROM bs_staff WHERE id = auth.uid() AND staff_type IN ('owner', 'admin')
      )
      OR
      -- New check: For solo practitioners/studio owners, allow using their user.id as studio_id
      (
        studio_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('solo_practitioner', 'studio_owner')
        )
      )
    )
  );

-- Also update the SELECT policy to allow viewing own invitations
DROP POLICY IF EXISTS "Studio owners can view their invitations" ON ta_invitations;

CREATE POLICY "Studio owners can view their invitations" ON ta_invitations
  FOR SELECT USING (
    studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid() AND staff_type IN ('owner', 'admin')
    )
    OR invited_by = auth.uid()
    OR (
      studio_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('solo_practitioner', 'studio_owner')
      )
    )
  );

-- Update policy already allows invited_by = auth.uid(), which is sufficient
-- but let's also add profile-based check for consistency
DROP POLICY IF EXISTS "Studio owners can update invitations" ON ta_invitations;

CREATE POLICY "Studio owners can update invitations" ON ta_invitations
  FOR UPDATE USING (
    invited_by = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid() AND staff_type IN ('owner', 'admin')
    )
    OR (
      studio_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('solo_practitioner', 'studio_owner')
      )
    )
  );

-- Delete policy
DROP POLICY IF EXISTS "Studio owners can delete invitations" ON ta_invitations;

CREATE POLICY "Studio owners can delete invitations" ON ta_invitations
  FOR DELETE USING (
    invited_by = auth.uid()
    OR studio_id IN (
      SELECT studio_id FROM bs_staff WHERE id = auth.uid() AND staff_type IN ('owner', 'admin')
    )
    OR (
      studio_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('solo_practitioner', 'studio_owner')
      )
    )
  );

-- Comment
COMMENT ON POLICY "Studio owners can create invitations" ON ta_invitations IS
  'Allow owners/admins via bs_staff or solo_practitioner/studio_owner via profiles to create invitations';
