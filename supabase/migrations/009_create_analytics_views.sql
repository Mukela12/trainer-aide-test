-- Migration: Create analytics views
-- Purpose: Support dashboard metrics and reporting

-- Trainer earnings view (weekly/monthly breakdown)
CREATE OR REPLACE VIEW v_trainer_earnings AS
SELECT
  trainer_id,
  DATE_TRUNC('day', created_at) as day,
  DATE_TRUNC('week', created_at) as week,
  DATE_TRUNC('month', created_at) as month,
  DATE_TRUNC('year', created_at) as year,
  SUM(trainer_amount_cents) as earnings_cents,
  SUM(platform_fee_cents) as fees_cents,
  SUM(amount_cents) as gross_cents,
  COUNT(*) as payment_count
FROM ta_payments
WHERE status = 'succeeded'
GROUP BY trainer_id, day, week, month, year;

-- Session stats view
CREATE OR REPLACE VIEW v_session_stats AS
SELECT
  trainer_id,
  DATE_TRUNC('day', scheduled_at) as day,
  DATE_TRUNC('week', scheduled_at) as week,
  DATE_TRUNC('month', scheduled_at) as month,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'confirmed') as upcoming,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  COUNT(*) FILTER (WHERE status = 'no-show') as no_shows,
  COUNT(DISTINCT client_id) as unique_clients
FROM ta_bookings
WHERE scheduled_at >= NOW() - INTERVAL '1 year'
GROUP BY trainer_id, day, week, month;

-- Utilization calculation (booked hours / available hours)
CREATE OR REPLACE VIEW v_trainer_utilization AS
WITH available_hours AS (
  SELECT
    trainer_id,
    SUM(
      (end_hour * 60 + end_minute) - (start_hour * 60 + start_minute)
    ) / 60.0 as weekly_available_hours
  FROM ta_availability
  WHERE block_type = 'available'
    AND recurrence = 'weekly'
  GROUP BY trainer_id
),
booked_hours AS (
  SELECT
    trainer_id,
    DATE_TRUNC('week', scheduled_at) as week,
    SUM(duration) / 60.0 as booked_hours
  FROM ta_bookings
  WHERE status IN ('confirmed', 'completed', 'checked-in')
    AND scheduled_at >= DATE_TRUNC('week', NOW())
  GROUP BY trainer_id, week
)
SELECT
  ah.trainer_id,
  COALESCE(bh.week, DATE_TRUNC('week', NOW())) as week,
  ah.weekly_available_hours,
  COALESCE(bh.booked_hours, 0) as booked_hours,
  CASE
    WHEN ah.weekly_available_hours > 0
    THEN ROUND((COALESCE(bh.booked_hours, 0) / ah.weekly_available_hours * 100)::numeric, 1)
    ELSE 0
  END as utilization_percent
FROM available_hours ah
LEFT JOIN booked_hours bh ON ah.trainer_id = bh.trainer_id;

-- Active clients (clients with activity in last 30 days)
CREATE OR REPLACE VIEW v_active_clients AS
SELECT
  b.trainer_id,
  COUNT(DISTINCT b.client_id) as active_clients_30d,
  COUNT(DISTINCT b.client_id) FILTER (WHERE b.scheduled_at >= NOW() - INTERVAL '7 days') as active_clients_7d
FROM ta_bookings b
WHERE b.scheduled_at >= NOW() - INTERVAL '30 days'
  AND b.status IN ('confirmed', 'completed', 'checked-in')
GROUP BY b.trainer_id;

-- Client credits summary (for trainer dashboard)
CREATE OR REPLACE VIEW v_trainer_client_credits AS
SELECT
  cp.trainer_id,
  COUNT(DISTINCT cp.client_id) as clients_with_credits,
  SUM(cp.sessions_remaining) as total_outstanding_credits,
  COUNT(*) FILTER (WHERE cp.sessions_remaining <= 2 AND cp.sessions_remaining > 0) as low_credit_clients,
  COUNT(*) FILTER (WHERE cp.expires_at <= NOW() + INTERVAL '30 days' AND cp.sessions_remaining > 0) as expiring_soon
FROM ta_client_packages cp
WHERE cp.status = 'active'
GROUP BY cp.trainer_id;

-- Dashboard summary view (all-in-one for fast loading)
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
  p.id as trainer_id,
  COALESCE(
    (SELECT SUM(earnings_cents) FROM v_trainer_earnings e
     WHERE e.trainer_id = p.id AND e.week = DATE_TRUNC('week', NOW())),
    0
  ) as earnings_this_week_cents,
  COALESCE(
    (SELECT SUM(earnings_cents) FROM v_trainer_earnings e
     WHERE e.trainer_id = p.id AND e.month = DATE_TRUNC('month', NOW())),
    0
  ) as earnings_this_month_cents,
  COALESCE(
    (SELECT completed FROM v_session_stats s
     WHERE s.trainer_id = p.id AND s.week = DATE_TRUNC('week', NOW())),
    0
  ) as sessions_completed_this_week,
  COALESCE(
    (SELECT upcoming FROM v_session_stats s
     WHERE s.trainer_id = p.id AND s.week = DATE_TRUNC('week', NOW())),
    0
  ) as sessions_upcoming_this_week,
  COALESCE(
    (SELECT active_clients_30d FROM v_active_clients ac
     WHERE ac.trainer_id = p.id),
    0
  ) as active_clients,
  COALESCE(
    (SELECT utilization_percent FROM v_trainer_utilization u
     WHERE u.trainer_id = p.id),
    0
  ) as utilization_percent,
  COALESCE(
    (SELECT total_outstanding_credits FROM v_trainer_client_credits tc
     WHERE tc.trainer_id = p.id),
    0
  ) as total_outstanding_credits,
  COALESCE(
    (SELECT low_credit_clients FROM v_trainer_client_credits tc
     WHERE tc.trainer_id = p.id),
    0
  ) as low_credit_clients
FROM profiles p
WHERE p.role IN ('solo_practitioner', 'trainer', 'studio_owner');

-- Grant access to views (for authenticated users)
COMMENT ON VIEW v_trainer_earnings IS 'Trainer earnings by time period';
COMMENT ON VIEW v_session_stats IS 'Session statistics by time period';
COMMENT ON VIEW v_trainer_utilization IS 'Trainer calendar utilization percentage';
COMMENT ON VIEW v_active_clients IS 'Clients with recent booking activity';
COMMENT ON VIEW v_dashboard_summary IS 'All-in-one dashboard metrics for trainers';
