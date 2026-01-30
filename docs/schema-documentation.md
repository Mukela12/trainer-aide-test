# Trainer-Aide Database Schema

Last Updated: 2026-01-30T01:07:16.814Z

---

## profiles

- **Row Count:** 130
- **Columns:** 58

```
  id: string
  email: string
  phone: NULL
  first_name: string
  last_name: string
  display_name: NULL
  avatar: NULL
  user_type: string
  plan: NULL
  store_name: NULL
  bio: NULL
  occupation: NULL
  instagram: NULL
  youtube: NULL
  tiktok: NULL
  twitter: NULL
  website: NULL
  other_social: NULL
  best_contact_method: NULL
  consent_email: boolean
  consent_sms: boolean
  consent_dm: boolean
  features: NULL
  is_active: boolean
  deleted_at: NULL
  created_at: string
  updated_at: string
  priorities: NULL
  logo_url: NULL
  brand_color: NULL
  tagline: NULL
  business_type: NULL
  business_scale: NULL
  engagement_method: NULL
  join_reason: NULL
  email_confirmed: boolean
  active_clients: NULL
  studio_sites: NULL
  personalization: NULL
  onboarding_complete: boolean
  role: string
  is_onboarded: boolean
  avatar_url: NULL
  quiz_answer: string
  studio_type: NULL
  is_super_admin: boolean
  role_permissions: ARRAY
  custom_permissions: ARRAY
  platform_version: string
  v2_active: boolean
  primary_platform: string
  onboarding_step: number
  location: NULL
  business_name: NULL
  business_slug: NULL
  years_experience: NULL
  specializations: NULL
  profile_image_url: NULL
```

## bs_studios

- **Row Count:** 3
- **Columns:** 24

```
  id: string
  name: string
  address: NULL
  created_at: string
  owner_id: string
  logo_url: NULL
  plan: string
  license_level: string
  feature_flags: JSONB
  usage_limits: JSONB
  studio_type: string
  tags: NULL
  soft_hold_length: number
  cancellation_window_hours: number
  stripe_connect_id: NULL
  studio_mode: string
  platform_version: string
  email_subaccount_id: NULL
  email_api_key: NULL
  email_sender_email: NULL
  email_sender_name: NULL
  email_enabled: boolean
  email_provisioned_at: NULL
  sender_domain_verified: boolean
```

## bs_staff

- **Row Count:** 28
- **Columns:** 18

```
  id: string
  email: string
  created_at: string
  first_name: string
  last_name: string
  studio_id: NULL
  is_solo: boolean
  staff_type: string
  is_onboarded: boolean
  updated_at: string
  quiz_answer: NULL
  studio_type: NULL
  business_model: NULL
  store_name: NULL
  logo_url: NULL
  brand_color: NULL
  tagline: NULL
  selected_template_name: NULL
```

## ta_services

- **Row Count:** 28
- **Columns:** 17

```
  id: string
  studio_id: string
  name: string
  description: string
  duration: number
  type: string
  max_capacity: number
  credits_required: number
  color: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  is_public: boolean
  price_cents: NULL
  is_intro_session: boolean
  booking_buffer_minutes: number
```

## ta_bookings

- **Row Count:** 3
- **Columns:** 15

```
  id: string
  studio_id: string
  trainer_id: string
  client_id: NULL
  service_id: string
  scheduled_at: string
  duration: number
  status: string
  hold_expiry: NULL
  session_id: NULL
  template_id: NULL
  sign_off_mode: string
  notes: NULL
  created_at: string
  updated_at: string
```

## ta_availability

- **Row Count:** 17
- **Columns:** 16

```
  id: string
  trainer_id: string
  studio_id: string
  block_type: string
  recurrence: string
  day_of_week: number
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  specific_date: NULL
  end_date: NULL
  reason: NULL
  notes: NULL
  created_at: string
  updated_at: string
```

## ta_booking_requests

- **Row Count:** 0
- **Columns:** (empty table)

## fc_clients

- **Row Count:** 95
- **Columns:** 15

```
  id: string
  name: string
  email: string
  phone: string
  created_at: string
  notification_preferences: JSONB
  first_name: string
  last_name: string
  is_onboarded: boolean
  self_booking_allowed: boolean
  credits: number
  invited_by: NULL
  studio_id: NULL
  is_guest: boolean
  source: string
```

## ta_packages

- **Row Count:** 2
- **Columns:** 14

```
  id: string
  trainer_id: string
  studio_id: NULL
  name: string
  description: string
  session_count: number
  price_cents: number
  validity_days: number
  per_session_price_cents: number
  savings_percent: NULL
  is_active: boolean
  is_public: boolean
  created_at: string
  updated_at: string
```

## ta_client_packages

- **Row Count:** 0
- **Columns:** (empty table)

## ta_credit_usage

- **Row Count:** 0
- **Columns:** (empty table)

## ta_payments

- **Row Count:** 0
- **Columns:** (empty table)

## ta_stripe_accounts

- **Row Count:** 0
- **Columns:** (empty table)

## ta_notifications

- **Row Count:** 2
- **Columns:** 22

```
  id: string
  user_id: string
  booking_id: string
  client_id: NULL
  type: string
  channel: string
  recipient_email: NULL
  recipient_phone: NULL
  subject: string
  body: NULL
  html_body: NULL
  template_data: JSONB
  status: string
  scheduled_for: string
  sent_at: NULL
  error_message: NULL
  retry_count: number
  max_retries: number
  external_id: NULL
  provider: NULL
  created_at: string
  updated_at: string
```

## ta_notification_preferences

- **Row Count:** 0
- **Columns:** (empty table)

## ta_invitations

- **Row Count:** 4
- **Columns:** 17

```
  id: string
  studio_id: string
  invited_by: string
  email: string
  first_name: string
  last_name: string
  role: string
  token: string
  status: string
  expires_at: string
  accepted_at: NULL
  accepted_by: NULL
  permissions: JSONB
  commission_percent: number
  message: NULL
  created_at: string
  updated_at: string
```

## ta_sessions

- **Row Count:** 10
- **Columns:** 16

```
  id: string
  trainer_id: string
  client_id: string
  workout_id: string
  template_id: NULL
  session_name: string
  json_definition: JSONB
  overall_rpe: number
  notes: string
  trainer_declaration: boolean
  declaration_timestamp: string
  completed: boolean
  started_at: string
  completed_at: string
  created_at: string
  updated_at: string
```

## ta_workout_templates

- **Row Count:** 4
- **Columns:** 12

```
  id: string
  trainer_id: string
  name: string
  created_at: string
  studio_id: string
  created_by: string
  title: string
  description: string
  is_active: boolean
  json_definition: ARRAY
  is_default: boolean
  sign_off_mode: string
```

## ta_body_metrics

- **Row Count:** 0
- **Columns:** (empty table)

## ta_client_goals

- **Row Count:** 0
- **Columns:** (empty table)

## ta_goal_milestones

- **Row Count:** 0
- **Columns:** (empty table)

