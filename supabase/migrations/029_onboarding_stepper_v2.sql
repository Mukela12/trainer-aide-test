-- Migration 029: Onboarding Stepper V2
-- Adds studio configuration columns for the new 7-step studio owner onboarding flow.
-- JSONB is intentional — these schemas are not yet finalized.
--
-- bs_studios is a pre-existing platform table. This migration only adds columns
-- if the table already exists, to avoid errors on fresh databases.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bs_studios'
  ) THEN
    ALTER TABLE bs_studios ADD COLUMN IF NOT EXISTS site_structure TEXT DEFAULT 'single-site';
    ALTER TABLE bs_studios ADD COLUMN IF NOT EXISTS booking_model TEXT DEFAULT 'trainer-led';
    ALTER TABLE bs_studios ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}';
    ALTER TABLE bs_studios ADD COLUMN IF NOT EXISTS waitlist_config JSONB DEFAULT '{"enabled": false}';
    ALTER TABLE bs_studios ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT '{}';
    ALTER TABLE bs_studios ADD COLUMN IF NOT EXISTS session_types JSONB DEFAULT '[]';
  ELSE
    RAISE NOTICE 'bs_studios table does not exist yet — skipping column additions. Columns will be created when the table is provisioned.';
  END IF;
END
$$;
