-- ============================================
-- FIX FOR INFINITE RECURSION IN RLS POLICIES
-- Run this directly in Supabase SQL Editor
-- ============================================

-- Step 1: Drop ALL potentially problematic policies on bs_studios
DROP POLICY IF EXISTS "Users can view their own studios" ON bs_studios;
DROP POLICY IF EXISTS "Users can create their own studio" ON bs_studios;
DROP POLICY IF EXISTS "Studio owners can update their studio" ON bs_studios;
DROP POLICY IF EXISTS "Users can view owned studios" ON bs_studios;
DROP POLICY IF EXISTS "Users can create own studio" ON bs_studios;
DROP POLICY IF EXISTS "Owners can update studio" ON bs_studios;
DROP POLICY IF EXISTS "Public studios are viewable" ON bs_studios;
DROP POLICY IF EXISTS "Studios can be viewed by authenticated users" ON bs_studios;

-- Step 2: Drop ALL potentially problematic policies on bs_staff
DROP POLICY IF EXISTS "Users can view their own staff record" ON bs_staff;
DROP POLICY IF EXISTS "Users can create their own staff record" ON bs_staff;
DROP POLICY IF EXISTS "Users can update their own staff record" ON bs_staff;
DROP POLICY IF EXISTS "Users can view own staff record" ON bs_staff;
DROP POLICY IF EXISTS "Users can create own staff record" ON bs_staff;
DROP POLICY IF EXISTS "Users can update own staff record" ON bs_staff;
DROP POLICY IF EXISTS "Staff can view their own record" ON bs_staff;
DROP POLICY IF EXISTS "Authenticated users can view staff" ON bs_staff;

-- Step 3: Create clean bs_studios policies (NO reference to bs_staff)
CREATE POLICY "bs_studios_select_own" ON bs_studios
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "bs_studios_insert_own" ON bs_studios
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "bs_studios_update_own" ON bs_studios
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "bs_studios_delete_own" ON bs_studios
  FOR DELETE USING (owner_id = auth.uid());

-- Step 4: Create clean bs_staff policies (NO reference to bs_studios in SELECT)
CREATE POLICY "bs_staff_select_own" ON bs_staff
  FOR SELECT USING (
    id = auth.uid()
    OR studio_id = auth.uid()  -- For solo practitioners
  );

CREATE POLICY "bs_staff_insert_own" ON bs_staff
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "bs_staff_update_own" ON bs_staff
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "bs_staff_delete_own" ON bs_staff
  FOR DELETE USING (id = auth.uid());

-- Step 5: Verify RLS is enabled
ALTER TABLE bs_studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE bs_staff ENABLE ROW LEVEL SECURITY;

-- Verification query - run separately to check policies
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('bs_studios', 'bs_staff');
