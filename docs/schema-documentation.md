# Trainer-Aide Database Schema

Last Updated: 2026-01-29

---

## Key Notes

### Important Schema Differences

1. **fc_clients** table does NOT have `user_id` or `trainer_id` columns
   - Clients are linked to users by matching **email addresses**
   - The `invited_by` column stores the trainer who created the client record
   - `is_guest` flag indicates if client created via public booking (true) vs has account (false)

2. **ta_sessions** uses `json_definition` instead of `blocks`
   - Session data stored as JSONB in `json_definition` column
   - Has `workout_id` reference to workout templates

---

## Core Tables

### profiles
- **Row Count:** 126
- **Columns:** 58

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, links to auth.users |
| email | string | User email |
| first_name | string | |
| last_name | string | |
| role | string | 'solo_practitioner', 'studio_owner', 'trainer', 'client' |
| is_onboarded | boolean | Completed onboarding |
| onboarding_step | number | Current step (0-5) |
| business_name | string | Business/brand name |
| business_slug | string | URL slug for public booking |
| years_experience | number | |
| specializations | array | |
| bio | string | |
| profile_image_url | string | |
| location | string | |
| platform_version | string | 'v2' |
| v2_active | boolean | |

### bs_studios
- **Row Count:** 2
- **Columns:** 24

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| name | string | |
| owner_id | UUID | References auth.users |
| studio_type | string | |
| plan | string | |
| stripe_connect_id | string | Stripe Connect account |
| soft_hold_length | number | |
| cancellation_window_hours | number | |

### bs_staff
- **Row Count:** 28
- **Columns:** 18

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, links to auth.users |
| email | string | |
| first_name | string | |
| last_name | string | |
| studio_id | UUID | References bs_studios (nullable) |
| staff_type | string | 'owner', 'admin', 'trainer', 'client' |
| is_solo | boolean | |
| is_onboarded | boolean | |

### fc_clients
- **Row Count:** 78
- **Columns:** 15

**IMPORTANT:** No `user_id` or `trainer_id` columns - use email matching!

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| name | string | Full name |
| email | string | **Used for linking to auth users** |
| phone | string | |
| first_name | string | |
| last_name | string | |
| is_guest | boolean | true = public booking, false = has account |
| source | string | 'manual', 'public_booking', 'referral' |
| invited_by | UUID | **Trainer who created this client** |
| studio_id | UUID | References bs_studios |
| credits | number | Legacy credit balance |
| is_onboarded | boolean | |
| notification_preferences | JSONB | |

---

## Trainer-Aide Tables

### ta_services
- **Row Count:** 5
- **Columns:** 17

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| studio_id | UUID | References bs_studios |
| created_by | UUID | References auth.users (trainer) |
| name | string | |
| description | string | |
| duration | number | Minutes |
| type | string | '1-2-1', 'duet', 'group' |
| max_capacity | number | |
| credits_required | number | |
| price_cents | number | Price for public booking |
| is_active | boolean | |
| is_public | boolean | Show on public booking page |
| is_intro_session | boolean | Free intro session |
| booking_buffer_minutes | number | Minimum advance booking |
| color | string | Calendar display color |

### ta_bookings
- **Row Count:** 0 (empty)
- **Columns:** ~15

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| studio_id | UUID | References bs_studios |
| trainer_id | UUID | References auth.users |
| client_id | UUID | References fc_clients |
| service_id | UUID | References ta_services |
| scheduled_at | timestamp | |
| duration | number | Minutes |
| status | string | 'confirmed', 'soft-hold', 'checked-in', 'completed', 'cancelled', 'no-show' |
| hold_expiry | timestamp | For soft-hold status |
| session_id | UUID | References ta_sessions |
| template_id | UUID | References ta_workout_templates |
| sign_off_mode | string | 'full_session', 'per_block', 'per_exercise' |
| notes | string | |

### ta_availability
- **Row Count:** 11
- **Columns:** 16

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| trainer_id | UUID | References auth.users |
| studio_id | UUID | References bs_studios |
| block_type | string | 'available', 'blocked' |
| recurrence | string | 'once', 'weekly' |
| day_of_week | number | 0=Sun, 1=Mon, ... 6=Sat |
| start_hour | number | |
| start_minute | number | |
| end_hour | number | |
| end_minute | number | |
| specific_date | date | For one-time blocks |
| end_date | date | For multi-day blocks |
| reason | string | |
| notes | string | |

### ta_packages
- **Row Count:** 0 (empty)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| trainer_id | UUID | References auth.users |
| studio_id | UUID | References bs_studios |
| name | string | |
| description | string | |
| session_count | number | |
| price_cents | number | |
| validity_days | number | Default 90 |
| per_session_price_cents | number | Calculated |
| savings_percent | number | |
| is_active | boolean | |
| is_public | boolean | |

### ta_client_packages
- **Row Count:** 0 (empty)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| client_id | UUID | References fc_clients |
| package_id | UUID | References ta_packages |
| trainer_id | UUID | References auth.users |
| payment_id | UUID | References ta_payments |
| sessions_total | number | |
| sessions_used | number | |
| sessions_remaining | number | Computed |
| purchased_at | timestamp | |
| expires_at | timestamp | |
| status | string | 'active', 'expired', 'exhausted' |
| notes | string | |

### ta_payments
- **Row Count:** 0 (empty)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| trainer_id | UUID | References auth.users |
| client_id | UUID | References fc_clients |
| booking_id | UUID | References ta_bookings |
| package_id | UUID | References ta_packages |
| stripe_payment_intent_id | string | |
| stripe_charge_id | string | |
| amount_cents | number | |
| platform_fee_cents | number | 2.5% |
| trainer_amount_cents | number | |
| currency | string | 'gbp' |
| status | string | 'pending', 'succeeded', 'failed', 'refunded' |
| payment_type | string | 'session', 'package' |

### ta_stripe_accounts
- **Row Count:** 0 (empty)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users (unique) |
| stripe_account_id | string | Stripe Connect ID |
| charges_enabled | boolean | |
| payouts_enabled | boolean | |
| onboarding_complete | boolean | |

### ta_notifications
- **Row Count:** 0 (empty)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| booking_id | UUID | References ta_bookings |
| client_id | UUID | References fc_clients |
| type | string | 'reminder_24h', 'booking_confirmed', etc. |
| channel | string | 'email', 'sms', 'push' |
| recipient_email | string | |
| subject | string | |
| body | string | |
| status | string | 'pending', 'sent', 'failed' |
| scheduled_for | timestamp | |
| sent_at | timestamp | |

### ta_invitations
- **Row Count:** 0 (empty)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| studio_id | UUID | References bs_studios |
| invited_by | UUID | References auth.users |
| email | string | |
| first_name | string | |
| last_name | string | |
| role | string | 'trainer', 'manager', etc. |
| token | string | Unique invitation token |
| status | string | 'pending', 'accepted', 'expired', 'revoked' |
| expires_at | timestamp | |
| commission_percent | number | Default 70% |

### ta_sessions
- **Row Count:** 10
- **Columns:** 16

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| trainer_id | UUID | References auth.users |
| client_id | UUID | References fc_clients |
| workout_id | UUID | |
| template_id | UUID | References ta_workout_templates |
| session_name | string | |
| json_definition | JSONB | **Session blocks data** |
| overall_rpe | number | 1-10 |
| notes | string | |
| trainer_declaration | boolean | |
| completed | boolean | |
| started_at | timestamp | |
| completed_at | timestamp | |

### ta_workout_templates
- **Row Count:** 0 (empty)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| name | string | |
| description | string | |
| type | string | 'standard', 'resistance_only' |
| created_by | UUID | References auth.users |
| studio_id | UUID | References bs_studios |
| blocks | JSONB | Template block definitions |
| default_sign_off_mode | string | |
| is_default | boolean | |

---

## Database Views

- `v_client_credits` - Client credit summary
- `v_trainer_earnings` - Earnings by period
- `v_session_stats` - Session statistics
- `v_trainer_utilization` - Calendar utilization
- `v_active_clients` - Recent client activity
- `v_dashboard_summary` - All-in-one dashboard metrics
- `v_client_progress` - Progress tracking summary

---

## Key Functions

- `deduct_client_credit(client_id, trainer_id, booking_id, credits)` - FIFO credit deduction
- `generate_business_slug(business_name, first_name, last_name)` - Slug generation
- `create_booking_reminders(booking_id)` - Create notification reminders
