-- Migration: Fix ta_sessions to support AI workouts
-- Problem: workout_id has a foreign key to ta_workouts and a check constraint preventing NULL
-- Solution: Make workout_id nullable and add ai_workout_id column for AI-generated workouts

-- Step 1: Drop the check constraint that prevents NULL workout_id
-- The constraint name may vary, so we use a safe approach
DO $$
BEGIN
  -- Try to drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ta_sessions_check'
    AND conrelid = 'ta_sessions'::regclass
  ) THEN
    ALTER TABLE ta_sessions DROP CONSTRAINT ta_sessions_check;
    RAISE NOTICE 'Dropped ta_sessions_check constraint';
  END IF;
END $$;

-- Step 2: Make workout_id nullable (if not already)
ALTER TABLE ta_sessions
  ALTER COLUMN workout_id DROP NOT NULL;

-- Step 3: Add ai_workout_id column for AI-generated workouts
-- This column references the ai_workouts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ta_sessions' AND column_name = 'ai_workout_id'
  ) THEN
    ALTER TABLE ta_sessions
      ADD COLUMN ai_workout_id UUID REFERENCES ai_workouts(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added ai_workout_id column';
  END IF;
END $$;

-- Step 4: Add a new check constraint that allows either workout_id OR ai_workout_id to be set
-- (At least one should be set for a valid session, or both can be null for ad-hoc sessions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ta_sessions_workout_source_check'
    AND conrelid = 'ta_sessions'::regclass
  ) THEN
    -- This constraint ensures sessions have a clear workout source
    -- Note: We're allowing both to be null for flexibility (ad-hoc sessions)
    ALTER TABLE ta_sessions
      ADD CONSTRAINT ta_sessions_workout_source_check
      CHECK (
        -- Either has a regular workout, an AI workout, or neither (ad-hoc)
        -- But not both at the same time
        NOT (workout_id IS NOT NULL AND ai_workout_id IS NOT NULL)
      );
    RAISE NOTICE 'Added ta_sessions_workout_source_check constraint';
  END IF;
END $$;

-- Step 5: Create index on ai_workout_id for query performance
CREATE INDEX IF NOT EXISTS idx_ta_sessions_ai_workout_id ON ta_sessions(ai_workout_id);

-- Step 6: Add comment for documentation
COMMENT ON COLUMN ta_sessions.ai_workout_id IS 'Reference to AI-generated workout from ai_workouts table. Use this OR workout_id, not both.';
COMMENT ON COLUMN ta_sessions.workout_id IS 'Reference to regular workout template from ta_workouts table. Use this OR ai_workout_id, not both.';
