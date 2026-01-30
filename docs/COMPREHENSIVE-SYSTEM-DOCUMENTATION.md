# Trainer-Aide Comprehensive System Documentation

**Generated:** 2026-01-29
**Version:** 1.0.0

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [User Roles](#user-roles)
4. [Trainer Role Features](#trainer-role-features)
5. [Studio Owner Role Features](#studio-owner-role-features)
6. [Solo Practitioner Role Features](#solo-practitioner-role-features)
7. [Client Role Features](#client-role-features)
8. [Public Booking Flow](#public-booking-flow)
9. [API Reference](#api-reference)
10. [Incomplete Features & Issues](#incomplete-features--issues)
11. [Test Coverage](#test-coverage)

---

## System Overview

Trainer-Aide is a fitness studio management platform that enables:
- **Trainers** to manage sessions, programs, and client workouts
- **Studio Owners** to manage teams, services, packages, and templates
- **Solo Practitioners** to operate independently with full trainer + studio features
- **Clients** to book sessions, view history, and manage credits

### Tech Stack
- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **State Management:** Zustand with persistence
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Payments:** Stripe Connect
- **AI:** Claude API for program generation

---

## Database Schema

### Core Tables

#### `profiles` (126 rows)
User profiles linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (matches auth.users.id) |
| email | TEXT | User email |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| role | TEXT | User role: studio_owner, solo_practitioner, trainer, client |
| business_name | TEXT | Business display name |
| business_slug | TEXT | URL slug for public booking |
| is_onboarded | BOOLEAN | Completed onboarding |
| specializations | JSONB | Array of specialization strings |
| years_experience | INTEGER | Years of experience |
| location | TEXT | Business location |
| bio | TEXT | Profile bio |

#### `bs_studios` (2 rows)
Studio/business entities.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Studio name |
| owner_id | UUID | FK to auth.users |
| plan | TEXT | Subscription plan |
| stripe_connect_id | TEXT | Stripe Connect account |
| soft_hold_length | INTEGER | Minutes for soft holds (default 120) |
| cancellation_window_hours | INTEGER | Hours before booking (default 24) |
| email_enabled | BOOLEAN | Email notifications enabled |

#### `bs_staff` (28 rows)
Staff members within studios.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | Staff email |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| studio_id | UUID | FK to bs_studios |
| staff_type | TEXT | trainer, instructor, manager, owner |
| is_solo | BOOLEAN | Solo practitioner flag |
| is_onboarded | BOOLEAN | Completed onboarding |

#### `fc_clients` (84 rows)
Client records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | Client email |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| name | TEXT | Full name (computed) |
| phone | TEXT | Phone number |
| studio_id | UUID | FK to bs_studios |
| invited_by | UUID | FK to auth.users (trainer) |
| is_guest | BOOLEAN | Guest booking (no account) |
| source | TEXT | manual, public_booking, import |
| credits | INTEGER | Legacy credit balance |

#### `ta_services` (17 rows)
Service types offered by trainers/studios.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| studio_id | UUID | FK to bs_studios |
| created_by | UUID | FK to auth.users |
| name | TEXT | Service name |
| description | TEXT | Service description |
| duration | INTEGER | Duration in minutes |
| type | TEXT | 1-2-1, duet, group |
| max_capacity | INTEGER | Max attendees |
| credits_required | NUMERIC | Credits per session |
| price_cents | INTEGER | Price in cents |
| color | TEXT | Calendar color (hex) |
| is_active | BOOLEAN | Active/available |
| is_public | BOOLEAN | Visible on public booking |
| is_intro_session | BOOLEAN | Free intro session |
| booking_buffer_minutes | INTEGER | Buffer between bookings |

#### `ta_bookings` (2 rows)
Scheduled bookings/appointments.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| studio_id | UUID | FK to bs_studios |
| trainer_id | UUID | FK to auth.users |
| client_id | UUID | FK to fc_clients |
| service_id | UUID | FK to ta_services |
| scheduled_at | TIMESTAMPTZ | Booking date/time |
| duration | INTEGER | Duration in minutes |
| status | TEXT | confirmed, soft-hold, checked-in, completed, cancelled |
| hold_expiry | TIMESTAMPTZ | Soft-hold expiration |
| session_id | UUID | FK to ta_sessions (if started) |
| template_id | UUID | FK to ta_workout_templates |
| sign_off_mode | TEXT | per_exercise, per_block, full_session |
| notes | TEXT | Booking notes |

#### `ta_availability` (17 rows)
Trainer availability windows.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| trainer_id | UUID | FK to auth.users |
| studio_id | UUID | FK to bs_studios |
| block_type | TEXT | available, blocked |
| recurrence | TEXT | weekly, one-time |
| day_of_week | INTEGER | 0-6 (Sunday-Saturday) |
| start_hour | INTEGER | Start hour (0-23) |
| start_minute | INTEGER | Start minute (0-59) |
| end_hour | INTEGER | End hour (0-23) |
| end_minute | INTEGER | End minute (0-59) |
| specific_date | DATE | For one-time blocks |
| reason | TEXT | Block reason |

#### `ta_sessions` (10 rows)
Executed workout sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| trainer_id | UUID | FK to auth.users |
| client_id | UUID | FK to fc_clients |
| template_id | UUID | FK to ta_workout_templates |
| workout_id | UUID | FK to AI workout |
| session_name | TEXT | Session display name |
| json_definition | JSONB | Blocks and exercises |
| sign_off_mode | TEXT | per_exercise, per_block, full_session |
| overall_rpe | INTEGER | 1-10 rating |
| notes | TEXT | Private trainer notes |
| trainer_declaration | BOOLEAN | Signed off |
| started_at | TIMESTAMPTZ | Session start time |
| completed_at | TIMESTAMPTZ | Session completion time |
| completed | BOOLEAN | Is completed |

#### `ta_workout_templates` (3 rows)
Reusable workout templates.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| trainer_id | UUID | FK to auth.users |
| studio_id | UUID | FK to bs_studios |
| created_by | UUID | FK to auth.users |
| name | TEXT | Template name |
| title | TEXT | Display title |
| description | TEXT | Template description |
| json_definition | JSONB | Blocks and exercises |
| sign_off_mode | TEXT | Default sign-off mode |
| is_active | BOOLEAN | Active template |
| is_default | BOOLEAN | Default template |

#### `ta_trainer_template_assignments` (0 rows)
Templates assigned to trainers (their toolkit).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| template_id | UUID | FK to ta_workout_templates |
| trainer_id | UUID | FK to auth.users |
| assigned_by | UUID | FK to auth.users |
| assigned_at | TIMESTAMPTZ | Assignment date |
| UNIQUE | | (template_id, trainer_id) |

**Business Logic:** When a template is assigned to a trainer, that trainer can use it with ANY of their clients.

#### `ta_client_template_assignments` (0 rows)
Templates assigned to specific clients.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| template_id | UUID | FK to ta_workout_templates |
| client_id | UUID | FK to fc_clients |
| assigned_by | UUID | FK to auth.users |
| assigned_at | TIMESTAMPTZ | Assignment date |
| UNIQUE | | (template_id, client_id) |

**Business Logic:** When a template is assigned to a client, ANY studio staff can use it for THAT client only.

#### `ta_packages` (0 rows)
Training package definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| trainer_id | UUID | FK to auth.users |
| studio_id | UUID | FK to bs_studios |
| name | TEXT | Package name |
| description | TEXT | Package description |
| session_count | INTEGER | Number of sessions |
| price_cents | INTEGER | Total price in cents |
| per_session_price_cents | INTEGER | Calculated per-session |
| validity_days | INTEGER | Days until expiry |
| is_active | BOOLEAN | Available for purchase |
| is_public | BOOLEAN | Public visibility |

#### `ta_client_packages` (0 rows)
Client package purchases.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| client_id | UUID | FK to fc_clients |
| package_id | UUID | FK to ta_packages |
| trainer_id | UUID | FK to auth.users |
| sessions_total | INTEGER | Total sessions purchased |
| sessions_used | INTEGER | Sessions consumed |
| sessions_remaining | INTEGER | GENERATED (total - used) |
| purchased_at | TIMESTAMPTZ | Purchase date |
| expires_at | TIMESTAMPTZ | Expiration date |
| status | TEXT | active, expired, exhausted |

#### `ta_notifications` (5 rows)
Notification queue.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| booking_id | UUID | FK to ta_bookings |
| client_id | UUID | FK to fc_clients |
| type | TEXT | booking_confirmation, reminder_24h, etc. |
| channel | TEXT | email, sms |
| recipient_email | TEXT | Recipient email |
| template_data | JSONB | Template variables |
| status | TEXT | pending, sent, failed |
| scheduled_for | TIMESTAMPTZ | When to send |
| sent_at | TIMESTAMPTZ | When sent |
| retry_count | INTEGER | Retry attempts |

#### `ta_invitations` (4 rows)
Team member invitations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| studio_id | UUID | FK to bs_studios |
| invited_by | UUID | FK to auth.users |
| email | TEXT | Invitee email |
| first_name | TEXT | Invitee first name |
| last_name | TEXT | Invitee last name |
| role | TEXT | trainer, instructor, manager |
| token | TEXT | Secure invite token |
| status | TEXT | pending, accepted, expired, revoked |
| expires_at | TIMESTAMPTZ | Token expiration |
| commission_percent | INTEGER | Commission rate (default 70) |
| message | TEXT | Personal message |

#### `ta_exercise_library` (873 rows)
Master exercise database.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| slug | TEXT | URL-friendly name |
| name | TEXT | Exercise name |
| category | TEXT | Exercise category |
| force | TEXT | Push, pull, etc. |
| level | TEXT | Beginner, intermediate, advanced |
| mechanic | TEXT | Compound, isolation |
| equipment | TEXT | Required equipment |
| primary_muscles | JSONB | Primary muscle groups |
| secondary_muscles | JSONB | Secondary muscles |
| instructions | JSONB | Step-by-step instructions |
| start_image_url | TEXT | Starting position image |
| end_image_url | TEXT | Ending position image |

---

## User Roles

### Role Hierarchy

```
super_admin
    └── studio_owner
        └── manager
            └── trainer / instructor
                └── client (no dashboard access by default)

solo_practitioner (combines studio_owner + trainer capabilities)
```

### Role Capabilities

| Capability | Studio Owner | Solo Practitioner | Trainer | Client |
|------------|-------------|-------------------|---------|--------|
| Manage Studio Settings | ✓ | ✓ | - | - |
| Invite Team Members | ✓ | - | - | - |
| Create Services | ✓ | ✓ | - | - |
| Create Packages | ✓ | ✓ | - | - |
| Build Templates | ✓ | ✓ | - | - |
| Assign Templates | ✓ | ✓ (clients only) | - | - |
| Run Sessions | ✓ | ✓ | ✓ | - |
| View Calendar | ✓ | ✓ | ✓ | - |
| Generate AI Programs | ✓ | ✓ | ✓ | - |
| Book Sessions | - | - | - | ✓ |
| View Session History | - | - | - | ✓ |
| Manage Credits | - | - | - | ✓ |

---

## Trainer Role Features

### 1. Dashboard (`/trainer`)
**Components:** StatCard, Card
**Stores:** useTemplateStore, useSessionStore, useUserStore, useCalendarStore

**Metrics Displayed:**
- Sessions This Week
- Earnings This Week (£30/session)
- Active Clients
- Soft Holds (Pending)
- Upcoming Sessions (next 5)

**Data Flow:**
```
Dashboard → Zustand Stores → Display Calculations
```

### 2. Calendar (`/trainer/calendar`)
**Components:** Week/Day view, Session panel, Completion form
**Stores:** useCalendarStore, useAvailabilityStore, useServiceStore, useBookingRequestStore

**API Routes:**
- `GET /api/clients` - Fetch clients
- `GET /api/bookings` - Fetch calendar data
- `GET /api/availability` - Fetch availability
- `GET /api/services` - Fetch services
- `GET /api/booking-requests` - Fetch pending requests
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/[id]` - Update booking
- `POST /api/bookings/[id]/check-in` - Check in
- `POST /api/bookings/[id]/complete` - Complete

**Database Tables:** fc_clients, ta_bookings, ta_availability, ta_services, ta_booking_requests

### 3. Sessions (`/trainer/sessions`)

#### Create Session (`/trainer/sessions/new`)
**3-Step Flow:**
1. Select Client (from `/api/clients`)
2. Select Template (from `/api/clients/[id]/available-templates`)
3. Select Sign-Off Mode

**Available Templates Sources:**
- `trainer_toolkit` - Templates assigned to trainer
- `client_specific` - Templates assigned to specific client
- `own_template` - Templates created by trainer

**API Routes:**
- `GET /api/clients` - Fetch clients
- `GET /api/clients/[id]/available-templates` - Grouped templates
- `POST /api/sessions` - Create session

#### Run Session (`/trainer/sessions/[id]`)
**Components:** SessionTimer, ExerciseCard, SessionCompletionModal, RPEPicker

**Sign-Off Modes:**
- `full_session` - Complete all, sign off at end
- `per_block` - Sign off after each block
- `per_exercise` - Sign off after each exercise

**Data Capture Per Exercise:**
- Actual Reps
- Actual Resistance/Weight
- RPE (1-10)

**Session Completion:**
- Overall RPE
- Private Notes (trainer only)
- Public Notes (shared with client)
- Trainer Declaration checkbox

### 4. Programs (`/trainer/programs`)
**AI-Powered Program Generation**

**Create Flow:**
1. Configure: name, weeks, sessions/week, duration
2. Client or Custom Goals
3. Equipment/Constraints
4. Generate via Claude API

**API Routes:**
- `GET /api/ai-programs` - List programs
- `POST /api/ai/generate-program` - Start generation
- `GET /api/ai-programs/[id]` - Get program details
- `GET /api/ai-programs/[id]/workouts` - Get workouts

### 5. Templates (`/trainer/templates`)
**Components:** AITemplateCard, Template expandable cards

**Sources:**
- AI Programs (for solo practitioners)
- Manual Templates (from store)

---

## Studio Owner Role Features

### 1. Dashboard (`/studio-owner`)
**Metrics:** Templates, Active Templates, Sessions, Avg RPE

### 2. Team Management (`/studio-owner/team`)
**Components:** InviteTrainerDialog

**API Routes:**
- `GET /api/trainers` - List staff
- `GET /api/invitations` - List invitations
- `POST /api/invitations` - Send invitation
- `DELETE /api/invitations?id=xxx` - Revoke

**Invitation Flow:**
1. Enter email, name, role, commission %
2. Generate secure token (32 bytes)
3. Create invitation record (7-day expiry)
4. Send email with `/invite/[token]` link

### 3. Services Management (`/studio-owner/services`)
**Components:** ServiceFormDialog

**API Routes:**
- `GET /api/services` - List (auto-seeds defaults if empty)
- `POST /api/services` - Create
- `PUT /api/services` - Update
- `DELETE /api/services?id=xxx` - Soft delete

**Default Services:**
- 30min PT Session (1 credit)
- 45min PT Session (1.5 credits)
- 60min PT Session (2 credits)
- 75min PT Session (2.5 credits)
- 90min PT Session (3 credits)

### 4. Packages Management (`/studio-owner/packages`)
**API Routes:**
- `GET /api/packages?format=wrapped` - Packages + client packages
- `POST /api/packages` - Create
- `DELETE /api/packages?id=xxx` - Soft delete

### 5. Templates (`/studio-owner/templates`)
**Features:**
- List templates with search/filter
- Template Builder (multi-block workout designer)
- Template Detail view
- Duplicate, Edit, Delete actions

### 6. Template Assignment
**Components:** AssignTemplateDialog, TrainerProfileDialog

**API Routes:**
- `POST /api/templates/[id]/assign` - Assign to trainer or client
- `DELETE /api/templates/[id]/assign?trainerId=xxx` - Remove trainer assignment
- `DELETE /api/templates/[id]/assign?clientId=xxx` - Remove client assignment
- `GET /api/trainers/[id]/templates` - Trainer's assigned templates
- `GET /api/clients/[id]/templates` - Client's assigned templates

### 7. Trainers View (`/studio-owner/trainers`)
**Components:** TrainerProfileDialog, AssignTemplateDialog

**API Routes:**
- `GET /api/trainers` - List trainers
- `GET /api/trainers/[id]/stats` - Trainer statistics

---

## Solo Practitioner Role Features

Solo practitioners have access to:
- All Trainer features
- All Studio Owner features EXCEPT team invitations
- Template assignment to clients only (not trainers)

**Key Differences:**
- No `bs_staff` records for team
- Uses own `id` as `studio_id`
- Templates assigned only to clients

---

## Client Role Features

### 1. Dashboard (`/client`)
**Metrics:** Credits, Upcoming Bookings, Sessions, Avg RPE, Duration

**API Routes:**
- `GET /api/client/packages` - Credits and packages
- `GET /api/client/bookings` - Upcoming bookings

### 2. Bookings (`/client/bookings`)
**Sections:** Upcoming, Past

**API Routes:**
- `GET /api/client/bookings` - All bookings
- `DELETE /api/client/bookings?id=xxx` - Cancel (24h policy)

**Cancel Policy:** Must cancel 24+ hours before scheduled time

### 3. Sessions (`/client/sessions`)
**View completed sessions with:**
- Session name, date, duration
- Overall RPE
- Public notes from trainer
- Exercise details with actual performance

### 4. Packages (`/client/packages`)
**Display:**
- Total Credits
- Credit Status (good/medium/low/none)
- Next Expiry
- Active Packages with progress bars
- Past Packages

---

## Public Booking Flow

### Step 1: Trainer Selection (`/book/[slug]`)
**Direct Supabase Queries:**
```sql
SELECT * FROM profiles WHERE business_slug = ?
SELECT * FROM ta_services WHERE created_by = ? AND is_public = true
```

### Step 2: Service & Time Selection (`/book/[slug]/[serviceId]`)
**Queries:**
- ta_services (validate)
- ta_availability (get windows)
- ta_bookings (check conflicts)

**Slot Generation:**
- 30-minute intervals
- Filter past times
- Filter conflicting bookings

### Step 3: Checkout (`/book/[slug]/checkout`)
**Form Fields:** firstName, lastName, email, phone, terms

**API Route:** `POST /api/public/book`

**Backend Logic:**
1. Validate service (is_public, is_active)
2. Check scheduling conflicts
3. Determine free vs paid
4. Create/find client (guest if new)
5. Create booking
6. Return: bookingId, requiresPayment

### Step 4: Confirmation (`/book/[slug]/confirm/[bookingId]`)
**Display:**
- Booking confirmed message
- Service, date, time, trainer
- Add to Calendar button
- Book Another button

### Step 5: Create Account (Optional)
**For guest clients:**
- Pre-filled form
- Creates auth user
- Links to existing client record
- `is_guest = false`

---

## API Reference

### Authentication APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/link-guest` | POST | Link guest to auth account |

### Booking APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bookings` | GET | List bookings for trainer |
| `/api/bookings` | POST | Create booking |
| `/api/bookings/[id]` | GET | Get booking details |
| `/api/bookings/[id]` | PATCH | Update booking |
| `/api/bookings/[id]/check-in` | POST | Check in to booking |
| `/api/bookings/[id]/complete` | POST | Complete booking |

### Client APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clients` | GET | List clients |
| `/api/clients` | POST | Create client |
| `/api/clients/[id]/credits` | GET | Get client credits |
| `/api/clients/[id]/templates` | GET | Client's assigned templates |
| `/api/clients/[id]/available-templates` | GET | All templates available for client |
| `/api/client/bookings` | GET | Client's bookings |
| `/api/client/bookings` | DELETE | Cancel booking |
| `/api/client/packages` | GET | Client's packages/credits |

### Service APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services` | GET | List services |
| `/api/services` | POST | Create service |
| `/api/services` | PUT | Update service |
| `/api/services` | DELETE | Delete service |

### Template APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/templates` | GET | List templates |
| `/api/templates` | POST | Create template |
| `/api/templates/[id]/assign` | POST | Assign to trainer/client |
| `/api/templates/[id]/assign` | DELETE | Remove assignment |

### Trainer APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/trainers` | GET | List trainers |
| `/api/trainers/[id]/templates` | GET | Trainer's templates |
| `/api/trainers/[id]/stats` | GET | Trainer statistics |

### Session APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions` | GET | List sessions |
| `/api/sessions` | POST | Create session |
| `/api/sessions/[id]` | GET | Get session |
| `/api/sessions/[id]/complete` | POST | Complete session |

### Package APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/packages` | GET | List packages |
| `/api/packages` | POST | Create package |
| `/api/packages` | DELETE | Delete package |

### Invitation APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/invitations` | GET | List invitations |
| `/api/invitations` | POST | Send invitation |
| `/api/invitations` | DELETE | Revoke invitation |

### Public APIs (No Auth)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/trainers/[slug]` | GET | Public trainer profile |
| `/api/public/services/[trainerId]` | GET | Public services |
| `/api/public/availability/[trainerId]` | GET | Public availability |
| `/api/public/book` | POST | Create public booking |

### Notification APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/send` | POST | Process pending notifications |

### Analytics APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/dashboard` | GET | Dashboard metrics |

---

## Incomplete Features & Issues

### Critical Issues

#### 1. Template API Column Mismatch (FIXED)
**Issue:** `/api/templates` was using incorrect column names
**Status:** FIXED - Updated to use correct columns: name, title, json_definition, sign_off_mode

#### 2. Trainer Template Assignment Foreign Key
**Issue:** `ta_trainer_template_assignments.trainer_id` references `auth.users(id)`, but `bs_staff` trainers may not have auth accounts
**Impact:** Cannot assign templates to trainers created via bs_staff that aren't real auth users
**Solution:** Either create auth accounts for trainers OR change FK to reference bs_staff

#### 3. Solo Practitioner Authentication
**Issue:** Test account password incorrect for solo practitioner tests
**Impact:** Solo practitioner tests are skipped
**Solution:** Update test credentials or reset password

### Missing Features

#### 1. Booking Requests System
**Tables:** `ta_booking_requests` (0 rows, empty)
**Status:** API exists but no frontend implementation visible
**Needed:** Client-facing booking request form, trainer approval workflow

#### 2. Credit Usage Tracking
**Tables:** `ta_credit_usage` (empty)
**Status:** Table exists but not populated
**Needed:** Track when credits are consumed per booking

#### 3. Payment Integration
**Tables:** `ta_payments`, `ta_stripe_accounts` (empty)
**Status:** Stripe routes exist but no payment flow
**Needed:** Complete checkout flow for paid bookings

#### 4. Body Metrics & Goals
**Tables:** `ta_body_metrics`, `ta_client_goals`, `ta_goal_milestones` (all empty)
**Status:** Tables exist but no UI/API
**Needed:** Client progress tracking system

#### 5. Notification Preferences
**Tables:** `ta_notification_preferences` (empty)
**Status:** Notifications send but preferences not configurable
**Needed:** Client-facing preference settings

### Data Integrity Issues

#### 1. Packages Not Created
**Issue:** `ta_packages` has 0 rows despite UI existing
**Impact:** Clients can't purchase packages
**Check:** Verify POST /api/packages is working

#### 2. Client Packages Empty
**Issue:** `ta_client_packages` has 0 rows
**Impact:** No credit tracking for clients
**Dependency:** Needs packages to be created first

### UI/UX Issues

#### 1. Public Booking Soft-Hold Conflict
**Test Failure:** "This time slot is no longer available" (409)
**Cause:** Soft-holds not expiring properly OR time slot selection logic
**Impact:** Paid booking flow may fail

#### 2. Template Builder Data Persistence
**Issue:** Templates saved to localStorage via Zustand, not synced to API
**Impact:** Templates lost on browser clear, not shared across devices
**Solution:** Sync Zustand store with API endpoints

---

## Test Coverage

### Test Suites

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| Trainer Role | 20 | 20 | 0 |
| Studio Owner Role | 13 | 13 | 0 |
| Template Assignments | 16 | 16 | 0 |
| Public Booking Flow | 13 | 11 | 2 |
| Client Role | 6 | 6 | 0 |
| Notifications System | 10 | 10 | 0 |
| **TOTAL** | **78** | **76** | **2** |

### Test Accounts

```typescript
// Studio Owner
{ email: 'jessekatungu@gmail.com', password: 'TestPassword123!' }

// Solo Practitioners
{ email: 'ketosa1100@gamening.com', password: 'TestPassword123!' }
{ email: 'gepasip761@coswz.com', password: 'TestPassword123!' }

// Trainers
{ email: 'cefija1346@okexbit.com', password: 'TestPassword123!' }
{ email: 'wecayib389@1200b.com', password: 'TestPassword123!' }

// Test Clients
{ email: 'codelibrary21@gmail.com' }
{ email: 'milanmayoba80@gmail.com' }
{ email: 'appbanturide@gmail.com' }
```

### Running Tests

```bash
# Run all tests
npx tsx scripts/tests/test-all.ts

# Run individual suites
npx tsx scripts/tests/test-trainer-role.ts
npx tsx scripts/tests/test-studio-owner.ts
npx tsx scripts/tests/test-template-assignments.ts
npx tsx scripts/tests/test-public-booking.ts
npx tsx scripts/tests/test-client-role.ts
npx tsx scripts/tests/test-notifications.ts

# Cleanup test data
npx tsx scripts/tests/cleanup-test-data.ts
```

---

## Appendix: Database Helper Functions

### `get_available_templates_for_client(p_trainer_id, p_client_id)`
Returns all templates available for a trainer to use with a specific client.

**Returns UNION of:**
1. Templates assigned to trainer (trainer_toolkit)
2. Templates assigned to client (client_specific)
3. Templates created by trainer (own_template)

---

*Document generated by Claude Code analysis of trainer-aide-demo codebase*
