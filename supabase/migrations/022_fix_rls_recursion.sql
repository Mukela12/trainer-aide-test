-- Migration: Fix infinite recursion in RLS policies
-- Purpose: Remove the policies that caused infinite recursion between bs_studios and bs_staff

-- Drop the problematic policies that reference each other
DROP POLICY IF EXISTS "Users can view their own studios" ON bs_studios;
DROP POLICY IF EXISTS "Users can create their own studio" ON bs_studios;
DROP POLICY IF EXISTS "Studio owners can update their studio" ON bs_studios;

DROP POLICY IF EXISTS "Users can view their own staff record" ON bs_staff;
DROP POLICY IF EXISTS "Users can create their own staff record" ON bs_staff;
DROP POLICY IF EXISTS "Users can update their own staff record" ON bs_staff;

-- ============================================
-- PART 1: Fix bs_studios RLS (no reference to bs_staff)
-- ============================================

-- Simple policy: users can view studios they own
CREATE POLICY "Users can view owned studios" ON bs_studios
  FOR SELECT USING (owner_id = auth.uid());

-- Allow users to create a studio with themselves as owner
CREATE POLICY "Users can create own studio" ON bs_studios
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Allow studio owners to update their studio
CREATE POLICY "Owners can update studio" ON bs_studios
  FOR UPDATE USING (owner_id = auth.uid());

-- ============================================
-- PART 2: Fix bs_staff RLS (no reference to bs_studios for SELECT)
-- ============================================

-- Simple policy: users can view their own staff record or records for their studio
CREATE POLICY "Users can view own staff record" ON bs_staff
  FOR SELECT USING (
    id = auth.uid()
    OR studio_id = auth.uid()  -- For solo practitioners where studio_id = user.id
  );

-- Allow users to create their own staff record (for onboarding)
CREATE POLICY "Users can create own staff record" ON bs_staff
  FOR INSERT WITH CHECK (id = auth.uid());

-- Allow users to update their own staff record
CREATE POLICY "Users can update own staff record" ON bs_staff
  FOR UPDATE USING (id = auth.uid());
