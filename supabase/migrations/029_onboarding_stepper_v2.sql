-- Migration 029: Onboarding Stepper V2
-- Adds studio configuration columns for the new 7-step studio owner onboarding flow.
-- JSONB is intentional — these schemas are not yet finalized.

ALTER TABLE bs_studios ADD COLUMN IF NOT EXISTS site_structure TEXT DEFAULT 'single-site';
ALTER TABLE bs_studios ADD COLUMN IF NOT EXISTS booking_model TEXT DEFAULT 'trainer-led';
ALTER TABLE bs_studios ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}';
ALTER TABLE bs_studios ADD COLUMN IF NOT EXISTS waitlist_config JSONB DEFAULT '{"enabled": false}';
ALTER TABLE bs_studios ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT '{}';
ALTER TABLE bs_studios ADD COLUMN IF NOT EXISTS session_types JSONB DEFAULT '[]';
