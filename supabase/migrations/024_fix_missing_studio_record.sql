-- Fix: Create missing studio record for studio owner
-- User: 836db3bc-5a91-4e3c-8f32-da4d4ad96ac3 (mukelathegreat@gmail.com)
-- Problem: Studio owner completed onboarding but no bs_studios record was created

-- Insert the missing studio record
-- Using the user's ID as the studio ID for consistency
-- Note: studio_mode is omitted to use default value (constraint requires valid mode for studio_type)
INSERT INTO bs_studios (id, owner_id, name, studio_type, plan, license_level, platform_version)
VALUES (
  '836db3bc-5a91-4e3c-8f32-da4d4ad96ac3',
  '836db3bc-5a91-4e3c-8f32-da4d4ad96ac3',
  'Space Code',
  'fitness',
  'free',
  'starter',
  'v2'
)
ON CONFLICT (id) DO NOTHING;

-- Update bs_staff to link to the studio
UPDATE bs_staff
SET studio_id = '836db3bc-5a91-4e3c-8f32-da4d4ad96ac3',
    is_onboarded = true
WHERE id = '836db3bc-5a91-4e3c-8f32-da4d4ad96ac3'
  AND studio_id IS NULL;
