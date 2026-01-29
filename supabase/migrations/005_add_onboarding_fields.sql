-- Migration: Add onboarding fields to profiles
-- Purpose: Support the 5-step onboarding wizard

-- Add onboarding fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_slug TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specializations TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Create unique index on business_slug (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_business_slug
ON profiles(business_slug)
WHERE business_slug IS NOT NULL;

-- Function to generate slug from business name
CREATE OR REPLACE FUNCTION generate_business_slug(business_name TEXT, user_first TEXT, user_last TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Use business name if provided, otherwise use user's name
  IF business_name IS NOT NULL AND business_name != '' THEN
    base_slug := LOWER(REGEXP_REPLACE(business_name, '[^a-zA-Z0-9]+', '-', 'g'));
  ELSE
    base_slug := LOWER(REGEXP_REPLACE(CONCAT(user_first, '-', user_last), '[^a-zA-Z0-9]+', '-', 'g'));
  END IF;

  -- Remove leading/trailing hyphens
  base_slug := TRIM(BOTH '-' FROM base_slug);

  final_slug := base_slug;

  -- Check for uniqueness and append number if needed
  WHILE EXISTS (SELECT 1 FROM profiles WHERE business_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Comment on columns
COMMENT ON COLUMN profiles.onboarding_step IS 'Current step in onboarding wizard (0-5)';
COMMENT ON COLUMN profiles.phone IS 'Phone number for contact';
COMMENT ON COLUMN profiles.location IS 'Business location/city';
COMMENT ON COLUMN profiles.business_name IS 'Business or brand name';
COMMENT ON COLUMN profiles.business_slug IS 'URL slug for public booking page (/book/[slug])';
COMMENT ON COLUMN profiles.years_experience IS 'Years of experience as trainer';
COMMENT ON COLUMN profiles.specializations IS 'Array of specialization areas';
COMMENT ON COLUMN profiles.bio IS 'Public bio for booking page';
COMMENT ON COLUMN profiles.profile_image_url IS 'URL to profile/avatar image';
