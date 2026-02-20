-- Add requires_approval flag to ta_services for hybrid booking model support
ALTER TABLE ta_services ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- Change default booking_model for new studios to 'client-self-book'
-- This prevents new studios from accidentally blocking all self-booking
ALTER TABLE bs_studios ALTER COLUMN booking_model SET DEFAULT 'client-self-book';
