-- Fix #1: Atomic simple credit deduction
-- Prevents race condition where two concurrent bookings both read the same credit balance

CREATE OR REPLACE FUNCTION deduct_simple_credits(
  p_client_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_credits INTEGER;
BEGIN
  -- Atomic: deduct and return new balance in one statement
  -- The WHERE clause prevents going negative
  UPDATE fc_clients
  SET credits = credits - p_amount
  WHERE id = p_client_id
    AND credits >= p_amount
  RETURNING credits INTO v_new_credits;

  -- If no row was updated, insufficient credits
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_new_credits;
END;
$$;
