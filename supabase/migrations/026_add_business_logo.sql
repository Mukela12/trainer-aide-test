-- Add business_logo_url column to profiles table
-- This stores the Cloudinary URL for the studio/business logo
-- Used in public booking pages and email templates

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS business_logo_url TEXT;

-- Add comment
COMMENT ON COLUMN profiles.business_logo_url IS 'Cloudinary URL for the business/studio logo. Displayed on public booking page and email headers.';

-- Also add to bs_studios for studio-level branding (optional, for future use)
ALTER TABLE bs_studios
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN bs_studios.logo_url IS 'Cloudinary URL for studio logo. Can override profile-level logo for studios with multiple owners.';
