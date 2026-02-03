# AllWondrous Platform: Complete System Architecture

> **The Soul of the System** - A comprehensive guide to understanding how the entire Trainer-Aide platform works from end-to-end.

---

## Table of Contents

1. [Database Architecture](#1-database-architecture)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Onboarding Flow](#3-onboarding-flow)
4. [Invitation System](#4-invitation-system)
5. [Client Management](#5-client-management)
6. [Services & Availability](#6-services--availability)
7. [Public Booking Flow](#7-public-booking-flow)
8. [Client Booking Flow](#8-client-booking-flow)
9. [Credit System](#9-credit-system)
10. [Template System](#10-template-system)
11. [Session Management](#11-session-management)
12. [Dashboard Architecture](#12-dashboard-architecture)
13. [Branding & Logo System](#13-branding--logo-system)
14. [API Reference](#14-api-reference)
15. [Data Flow Diagrams](#15-data-flow-diagrams)

---

## 1. Database Architecture

### Core Tables & Relationships

```
auth.users (Supabase Auth)
    │
    ├── profiles (User metadata & role)
    │   ├── role: client | trainer | solo_practitioner | studio_owner
    │   ├── is_onboarded, onboarding_step
    │   ├── business_slug (for public booking URLs)
    │   ├── business_logo_url (Cloudinary URL for branding)
    │   └── specializations, years_experience, bio
    │
    ├── bs_studios (Studio entities)
    │   ├── id (UUID, or user.id for solo practitioners)
    │   ├── owner_id → auth.users
    │   ├── plan, license_level, studio_type
    │   └── stripe_connect_id, email settings
    │
    ├── bs_staff (Staff members)
    │   ├── id = user.id
    │   ├── studio_id → bs_studios
    │   ├── staff_type: owner | trainer | manager | instructor | receptionist
    │   └── is_solo (boolean), commission_percent
    │
    └── fc_clients (Client records)
        ├── id (UUID or user.id when account linked)
        ├── studio_id → bs_studios
        ├── credits (simple/direct credits - FALLBACK)
        ├── is_onboarded, is_guest, is_archived
        ├── self_booking_allowed
        └── invited_by → auth.users
```

### Service & Booking Tables

```sql
ta_services (Bookable services)
├── id, studio_id, created_by
├── name, description, duration, type ('1-2-1'|'duet'|'group')
├── max_capacity, credits_required, price_cents
├── is_active, is_public, is_intro_session
└── booking_buffer_minutes

ta_availability (Trainer schedules)
├── id, trainer_id, studio_id
├── block_type: 'available' | 'unavailable'
├── recurrence: 'weekly' | 'once'
├── day_of_week (0-6), start_hour/minute, end_hour/minute
└── specific_date, end_date, reason, notes

ta_bookings (Scheduled sessions)
├── id, studio_id, trainer_id, client_id, service_id
├── scheduled_at, duration
├── status: 'confirmed' | 'soft-hold' | 'checked-in' | 'completed' | 'cancelled'
├── hold_expiry (for soft-holds)
├── session_id → ta_sessions (when started)
└── template_id, sign_off_mode, notes
```

### Session & Template Tables

```sql
ta_sessions (Training session records)
├── id, trainer_id, client_id
├── template_id → ta_workout_templates
├── session_name, json_definition (blocks array)
├── sign_off_mode: 'full_session' | 'per_block' | 'per_exercise'
├── started_at, completed_at, duration (seconds)
├── overall_rpe (1-10), notes (private), public_notes
├── trainer_declaration, declaration_timestamp
└── completed (boolean)

ta_workout_templates (Workout blueprints)
├── id, name, title, description
├── created_by, studio_id, trainer_id
├── json_definition (blocks with exercises)
├── sign_off_mode, is_active, is_default
└── created_at, updated_at

ta_trainer_template_assignments (Trainer toolkit)
├── id, template_id, trainer_id
└── UNIQUE(template_id, trainer_id)

ta_client_template_assignments (Client-specific programs)
├── id, template_id, client_id
└── UNIQUE(template_id, client_id)
```

### Credit System Tables

```sql
credit_bundles (Package definitions - studio owner creates)
├── id, studio_id, owner_id
├── name, description
├── credit_count, total_price, price_per_credit
├── expiry_days, is_active
└── created_at, updated_at

ta_client_packages (Purchased/claimed packages)
├── id, client_id, package_id → credit_bundles
├── sessions_total, sessions_used, sessions_remaining
├── purchased_at, expires_at
├── status: 'active' | 'expired' | 'exhausted'
└── payment_id

ta_credit_usage (Audit log)
├── id, client_package_id, booking_id
├── credits_used, balance_after
├── reason: 'booking' | 'refund' | 'manual_*'
└── created_at

referral_signup_links (Promotional offers)
├── id, studio_id, created_by
├── title, description, credits
├── payment_amount, currency
├── max_referrals, current_referrals
├── is_active, is_gift, expires_at
└── referral_code, expiry_days
```

### Invitation Tables

```sql
ta_invitations (Team/trainer invitations)
├── id, studio_id, invited_by
├── email, first_name, last_name
├── role: 'trainer' | 'manager' | 'receptionist' | 'admin'
├── token (32-byte secure), status: 'pending' | 'accepted' | 'revoked' | 'expired'
├── expires_at, accepted_at, accepted_by
└── commission_percent, message

ta_client_invitations (Client invitations)
├── id, studio_id, invited_by
├── email, first_name, last_name
├── token, status, expires_at
├── accepted_at, accepted_by
└── message
```

---

## 2. User Roles & Permissions

### Role Hierarchy

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `super_admin` | Platform administrator | All permissions |
| `studio_owner` | Studio business owner | Manage studio, team, clients, services |
| `solo_practitioner` | Independent trainer | Same as studio_owner (studio_id = user.id) |
| `studio_manager` | Studio operations manager | Manage team, clients, bookings |
| `trainer` | Staff trainer | View own clients, manage own sessions |
| `receptionist` | Front desk staff | View bookings, check-in clients |
| `client` | End user/trainee | Book sessions, view own data |

### Dashboard Routing

```typescript
const ROLE_DASHBOARDS = {
  super_admin: '/admin',
  studio_owner: '/studio-owner',
  solo_practitioner: '/solo',
  studio_manager: '/studio-owner',
  trainer: '/trainer',
  receptionist: '/trainer',
  finance_manager: '/studio-owner',
  client: '/client',
};
```

---

## 3. Onboarding Flow

### Location: `/app/onboarding/`

### Step-by-Step Process

#### Step 0: Role Selection (`/onboarding`)
```
User selects:
├── Solo Practitioner → Independent trainer
└── Studio Owner → Multi-trainer business

Updates: profiles.role, profiles.onboarding_step = 1
```

#### Step 1: Profile Setup (`/onboarding/profile`)
```
Collects:
├── first_name, last_name, phone
├── location, years_experience, bio
└── specializations (multi-select from 15+ options)

Updates: profiles table
Sets: onboarding_step = 2
```

#### Step 2: Business Setup (`/onboarding/business`)
```
Collects:
├── business_name (optional, defaults to user name)
└── business_slug (unique, validated)

Booking URL: /book/{business_slug}
Sets: onboarding_step = 3
```

#### Step 3: Services Setup (`/onboarding/services`)
```
Quick-start templates:
├── Free Intro Session (30 min, £0)
├── 1-2-1 PT Session (60 min, £50)
└── Partner Training (60 min, £70)

Custom service options:
├── Duration: 30-90 minutes
├── Type: 1-2-1, duet, group
├── Price, max_capacity
└── is_intro_session, is_public

Creates: ta_services records with studio_id = user.id
Sets: onboarding_step = 4
```

#### Step 4: Availability Setup (`/onboarding/availability`)
```
Default: 9am-5pm all days
Customizable: Multiple time slots per day

Creates: ta_availability records
├── trainer_id = user.id
├── block_type = 'available'
├── recurrence = 'weekly'
└── day_of_week, start/end times

Sets: onboarding_step = 5
```

#### Step 5: Complete (`/onboarding/complete`)
```
CRITICAL - Creates foundational records:

1. bs_studios:
   ├── id = user.id (for solo practitioners)
   ├── owner_id = user.id
   ├── name = display name
   ├── studio_type = 'solo' | 'studio'
   └── plan = 'free', license_level = 'starter'

2. bs_staff:
   ├── id = user.id
   ├── studio_id = user.id
   ├── staff_type = 'owner'
   ├── is_solo = true/false
   └── is_onboarded = true

3. profiles:
   └── is_onboarded = true, onboarding_step = 6

Displays: Booking page URL, next steps (Stripe, packages)
Redirects: To appropriate dashboard
```

---

## 4. Invitation System

### 4.1 Trainer Invitations

#### Sending Invitation
```
Endpoint: POST /api/invitations
Authorization: Studio owner, solo practitioner

Request:
{
  email: string (required)
  firstName?: string
  lastName?: string
  role?: 'trainer' | 'manager' | 'receptionist' | 'admin'
  message?: string
  commissionPercent?: number (default 70)
}

Process:
1. Validate no existing pending invitation
2. Generate 32-byte secure token (base64url)
3. Create ta_invitations record (expires: 7 days)
4. Send email with invite URL: /invite/{token}

Response: { id, email, token, expiresAt, inviteUrl, emailSent }
```

#### Accepting Invitation
```
Endpoint: POST /api/invitations/[token]/accept
Authorization: Must be logged in

Process:
1. Validate token (pending, not expired)
2. Create/update bs_staff:
   ├── staff_type = mapped role
   ├── studio_id = invitation.studio_id
   └── is_onboarded = true
3. Create/update profiles:
   ├── role = mapped role
   └── is_onboarded = true
4. Update invitation: status = 'accepted'

Redirects: To trainer dashboard
```

### 4.2 Client Invitations

#### Sending Client Invitation
```
Endpoint: POST /api/client-invitations
Authorization: Solo/studio owner/trainer

Request:
{
  email: string (required)
  firstName?: string
  lastName?: string
  message?: string
}

Creates: ta_client_invitations with token
Sends: Email with invite URL: /client-invite/{token}
```

#### Accepting Client Invitation
```
Endpoint: POST /api/client-invitations/[token]/accept
Authorization: None (creates new account)

Request: { password: string (min 8 chars) }

Process:
1. Validate token (pending, not expired)
2. Create auth.users account (auto-confirm)
3. Create profiles:
   ├── role = 'client'
   └── is_onboarded = true
4. Create fc_clients:
   ├── id = userId
   ├── studio_id = invitation.studio_id
   ├── is_onboarded = true
   ├── is_guest = false
   └── source = 'invitation'
5. Auto sign-in user

Redirects: To client dashboard
```

---

## 5. Client Management

### Creating Clients

#### Manual Creation
```
Endpoint: POST /api/clients
Authorization: Studio owner, trainer, solo practitioner

Request:
{
  email: string (required)
  firstName?: string
  lastName?: string
  phone?: string
  credits?: number
  sendWelcomeEmail?: boolean
}

Creates fc_clients:
├── is_onboarded = true (clients don't need onboarding)
├── is_guest = true (until they accept invitation)
├── studio_id = user's studio
├── source = 'manual'
└── invited_by = user.id

If sendWelcomeEmail:
├── Creates ta_client_invitations
└── Sends email for account creation
```

#### Client States

| State | is_guest | is_onboarded | Description |
|-------|----------|--------------|-------------|
| Manual (no email) | true | true | Can't login, trainer tracks offline |
| Invitation sent | true | true | Awaiting account creation |
| Account created | false | true | Full access to client dashboard |
| Public booking | true | true | Can create account later |

### Multi-Studio Support

A client can be associated with multiple studios:
- Each studio relationship = one `fc_clients` record
- Same email, different `studio_id` values
- Client dashboard shows all studios via `/api/client/studios`

---

## 6. Services & Availability

### Service Configuration

```typescript
// ta_services structure
{
  id: UUID
  studio_id: UUID
  created_by: UUID
  name: "1-2-1 PT Session"
  description: "Personalized training..."
  duration: 60 // minutes
  type: '1-2-1' | 'duet' | 'group'
  max_capacity: 1 | 2 | n
  credits_required: 1
  price_cents: 5000 // £50.00
  is_active: true
  is_public: true // visible on public booking
  is_intro_session: false // free intro flag
  booking_buffer_minutes: 15
}
```

### Availability System

```typescript
// ta_availability structure
{
  id: UUID
  trainer_id: UUID
  studio_id: UUID
  block_type: 'available' | 'unavailable'
  recurrence: 'weekly' | 'once'
  day_of_week: 0-6 // Sunday = 0
  start_hour: 9
  start_minute: 0
  end_hour: 17
  end_minute: 0
  // For one-time blocks:
  specific_date: Date
  end_date: Date
  reason: string
  notes: string
}
```

### Slot Generation Logic

```typescript
// Generate available time slots
function generateTimeSlots(availability, bookings, serviceDuration) {
  const slots = [];

  for (each day in dateRange) {
    // Get availability blocks for this day
    const availableBlocks = availability.filter(a =>
      a.day_of_week === day.getDay() &&
      a.block_type === 'available'
    );

    for (each block in availableBlocks) {
      // Generate 30-minute slots within block
      let slotStart = block.start;
      while (slotStart + serviceDuration <= block.end) {
        // Check for booking conflicts
        const hasConflict = bookings.some(b =>
          overlaps(slotStart, serviceDuration, b.scheduled_at, b.duration)
        );

        if (!hasConflict && slotStart > now) {
          slots.push(slotStart);
        }
        slotStart += 30; // minutes
      }
    }
  }
  return slots;
}
```

---

## 7. Public Booking Flow

### Location: `/app/book/[slug]/`

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  PUBLIC BOOKING FLOW                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. TRAINER PROFILE PAGE (/book/{slug})                    │
│     └── Displays: trainer bio, services list               │
│         └── Select service → /book/{slug}/{serviceId}      │
│                                                             │
│  2. DATE/TIME SELECTION (/book/{slug}/{serviceId})         │
│     ├── Week view calendar                                 │
│     ├── Available slots (green)                            │
│     └── Select time → Store in sessionStorage              │
│                                                             │
│  3. CHECKOUT (/book/{slug}/checkout)                       │
│     ├── Enter: firstName, lastName, email, phone           │
│     └── Submit booking                                     │
│                                                             │
│  4. API: POST /api/public/book                             │
│     ├── Client creation logic:                             │
│     │   ├── If exists for THIS studio → use existing       │
│     │   ├── If exists for OTHER studio → create new record │
│     │   └── If new → create guest client                   │
│     ├── Booking status:                                    │
│     │   ├── Free service → 'confirmed'                     │
│     │   └── Paid service → 'soft-hold' (2hr expiry)        │
│     └── Response: { bookingId, status, requiresPayment }   │
│                                                             │
│  5. CONFIRMATION (/book/{slug}/confirm/{bookingId})        │
│     ├── Shows booking details                              │
│     ├── If guest: "Create Account" option                  │
│     └── Links to /client-invite flow or direct signup      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Public Booking API

```typescript
// POST /api/public/book
Request: {
  trainerId: UUID
  serviceId: UUID
  scheduledAt: ISO string
  firstName: string
  lastName: string
  email: string
  phone?: string
}

Response: {
  bookingId: UUID
  status: 'confirmed' | 'soft-hold'
  requiresPayment: boolean
  priceCents: number
  hasExistingAccount: boolean // prompt login if true
  clientId: UUID
}
```

---

## 8. Client Booking Flow

### Location: `/app/(dashboard)/client/book/`

### 4-Step Booking Wizard

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT BOOKING WIZARD                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 1: SERVICE SELECTION                                 │
│  API: GET /api/client/studio/services                      │
│  └── Lists services for client's studio (is_active=true)   │
│                                                             │
│  STEP 2: TRAINER SELECTION                                 │
│  API: GET /api/client/studio/trainers                      │
│  └── Lists trainers in client's studio                     │
│  └── "Any Available Trainer" option (null selection)       │
│                                                             │
│  STEP 3: DATE/TIME SELECTION                               │
│  API: GET /api/client/studio/availability                  │
│  └── Fetches trainer availability + existing bookings      │
│  └── Generates 30-minute slots                             │
│  └── Week navigation (can't go before today)               │
│                                                             │
│  STEP 4: CONFIRMATION                                      │
│  └── Shows: service, trainer, date/time                    │
│  └── Credit calculation:                                   │
│      └── Current credits → Credits after booking           │
│  └── 24-hour cancellation policy notice                    │
│  └── Validates sufficient credits                          │
│                                                             │
│  SUBMIT: POST /api/client/bookings                         │
│  └── Validates: service, trainer, credits, no conflicts    │
│  └── Deducts credits (FIFO from packages, or simple)       │
│  └── Creates ta_bookings (status='confirmed')              │
│  └── Returns: booking + remaining credits                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Booking Cancellation

```typescript
// DELETE /api/client/bookings?id=xxx
Requirements:
└── 24+ hours before scheduled_at

Process:
├── Find original credit_usage record
├── Refund credits to original package
├── Create refund entry: reason='refund', credits_used=(negative)
└── Update booking: status='cancelled'
```

---

## 9. Credit System

### Credit Sources

| Source | Storage | Expiration | Used By |
|--------|---------|------------|---------|
| Package Purchase | `ta_client_packages` | expires_at date | Client booking |
| Offer Claim | `fc_clients.credits` | Never | Client booking |
| Manual Assignment | `fc_clients.credits` | Never | Studio owner edit |

### Credit Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  CREDIT ACQUISITION                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. STUDIO OWNER creates credit_bundles                    │
│     └── name, credit_count, total_price, expiry_days       │
│                                                             │
│  2. CLIENT views packages: GET /api/client/shop/packages   │
│     └── Shows credit_bundles for their studio              │
│                                                             │
│  3. CLIENT claims free package: POST /api/client/shop/claim│
│     └── Creates ta_client_packages record                  │
│     └── sessions_total = package.credit_count              │
│     └── expires_at = now + package.expiry_days             │
│                                                             │
│  4. Alternatively: Studio owner edits fc_clients.credits   │
│     └── Direct credit assignment (no expiration)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CREDIT USAGE (Booking)                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Check Available Credits:                               │
│     ├── Sum ta_client_packages.sessions_remaining          │
│     │   WHERE status='active' AND sessions_remaining > 0   │
│     └── OR use fc_clients.credits as fallback              │
│                                                             │
│  2. Deduction (FIFO - First In, First Out):               │
│     └── RPC: deduct_client_credit(client_id, credits)      │
│         ├── Find oldest expiring active package            │
│         ├── Decrement sessions_remaining                   │
│         ├── Log in ta_credit_usage (reason='booking')      │
│         └── Repeat until credits deducted                  │
│                                                             │
│  3. Fallback (no packages):                                │
│     └── UPDATE fc_clients SET credits = credits - amount   │
│                                                             │
│  4. On Cancel (24+ hours):                                 │
│     ├── Find ta_credit_usage for booking                   │
│     ├── Restore credits to package                         │
│     └── Log refund entry (reason='refund')                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Credit Retrieval API

```typescript
// GET /api/client/packages
Response: {
  totalCredits: number
  status: 'good' | 'medium' | 'low' | 'none'
  nearestExpiry: ISO string | null
  packages: [
    {
      id: UUID
      name: string
      sessionsTotal: number
      sessionsUsed: number
      sessionsRemaining: number
      expiresAt: ISO string
      status: 'active' | 'expired' | 'exhausted'
    },
    // OR virtual "Direct Credits" package if only simple credits:
    {
      id: 'direct_credits'
      name: 'Direct Credits'
      sessionsTotal: number
      sessionsRemaining: number
      expiresAt: null
    }
  ]
}
```

---

## 10. Template System

### Template Types

```typescript
// ta_workout_templates structure
{
  id: UUID
  name: "Full Body Strength"
  title: "Week 1 - Foundation"
  description: "A complete full body workout..."
  created_by: UUID
  studio_id: UUID
  trainer_id: UUID
  sign_off_mode: 'full_session' | 'per_block' | 'per_exercise'
  is_active: boolean
  is_default: boolean
  json_definition: WorkoutBlock[] // see below
}
```

### Template Structure (json_definition)

```typescript
interface WorkoutBlock {
  id: string
  blockNumber: number
  name: "Warm Up" | "Main Set" | "Cool Down"
  completed: boolean
  exercises: WorkoutExercise[]
}

interface WorkoutExercise {
  id: string
  exerciseId: string // reference to exercise library
  position: number
  muscleGroup: MuscleGroup
  resistanceType: 'bodyweight' | 'weight'
  resistanceValue: number // kg
  repsMin: number
  repsMax: number
  sets: number
  cardioDuration?: number // seconds
  cardioIntensity?: number // 1-10
  tempo?: string // "3-1-2-0"
  restSeconds?: number
  coachingCues?: string[]
}
```

### Template Assignment

```
┌─────────────────────────────────────────────────────────────┐
│  TEMPLATE ASSIGNMENT LEVELS                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LEVEL 1: TRAINER TOOLKIT                                  │
│  Table: ta_trainer_template_assignments                    │
│  └── Template assigned to a trainer                        │
│  └── Trainer can use with ANY of their clients             │
│  └── Used for studio "Workout Plans"                       │
│                                                             │
│  LEVEL 2: CLIENT-SPECIFIC                                  │
│  Table: ta_client_template_assignments                     │
│  └── Template assigned to specific client                  │
│  └── ANY studio trainer can use for this client            │
│  └── Used for individualized programs                      │
│                                                             │
│  AVAILABLE TEMPLATES FOR SESSION:                          │
│  get_available_templates_for_client(trainer_id, client_id) │
│  Returns combined:                                         │
│  ├── Trainer's toolkit (trainer-level)                     │
│  ├── Client-specific assignments                           │
│  └── Templates created by the trainer                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Creating Templates

```typescript
// POST /api/templates
Request: {
  name: string
  description?: string
  blocks: WorkoutBlock[]
  signOffMode: 'full_session' | 'per_block' | 'per_exercise'
}

Creates: ta_workout_templates
├── studio_id = user's studio
├── created_by = user.id
├── trainer_id = user.id
└── json_definition = blocks
```

### Assigning Templates

```typescript
// POST /api/templates/{id}/assign
Request: {
  trainerId?: UUID  // For trainer toolkit
  clientId?: UUID   // For client-specific
}

Creates:
├── ta_trainer_template_assignments (if trainerId)
└── ta_client_template_assignments (if clientId)
```

---

## 11. Session Management

### Session Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│  SESSION LIFECYCLE                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PATH A: FROM BOOKING                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ta_bookings (status='confirmed')                     │  │
│  │      ↓                                                │  │
│  │ Check-In (POST /api/bookings/{id}/check-in)          │  │
│  │      ↓ status → 'checked-in'                         │  │
│  │ Complete (POST /api/bookings/{id}/complete)          │  │
│  │      ↓ status → 'completed'                          │  │
│  │      ↓ Creates/links ta_sessions                     │  │
│  │      ↓ Deducts credits                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  PATH B: DIRECT SESSION START                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Start New Session Wizard (/trainer/sessions/new)     │  │
│  │      ↓                                                │  │
│  │ 1. Select Client (or walk-in)                        │  │
│  │ 2. Select Template (from available)                  │  │
│  │ 3. Choose Sign-Off Mode                              │  │
│  │      ↓                                                │  │
│  │ POST /api/sessions → Creates ta_sessions             │  │
│  │      ↓                                                │  │
│  │ Session Runner (/trainer/sessions/{id})              │  │
│  │      ↓                                                │  │
│  │ Complete Session (via completion modal)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Session Data Structure

```typescript
// ta_sessions + session store
interface Session {
  id: string
  trainerId: UUID
  clientId?: UUID
  client?: Client
  templateId: UUID
  template?: WorkoutTemplate
  sessionName: string
  signOffMode: 'full_session' | 'per_block' | 'per_exercise'

  blocks: SessionBlock[]

  startedAt: ISO string
  completedAt?: ISO string
  duration?: number // seconds
  plannedDurationMinutes?: number

  overallRpe?: number // 1-10
  notes?: string // private trainer notes
  publicNotes?: string // visible to client

  completed: boolean
  trainerDeclaration: boolean
  declarationTimestamp?: ISO string
}

interface SessionBlock {
  id: string
  blockNumber: number
  name: string
  completed: boolean
  rpe?: number
  exercises: SessionExercise[]
}

interface SessionExercise {
  id: string
  exerciseId: string
  position: number
  muscleGroup: MuscleGroup

  // Target (from template)
  resistanceValue: number
  repsMin: number
  repsMax: number
  sets: number

  // Actual performance (recorded during session)
  actualReps?: number
  actualResistance?: number
  rpe?: number // 1-10

  completed: boolean
}
```

### Sign-Off Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `full_session` | All blocks visible, complete at end | Quick workouts, experienced clients |
| `per_block` | One block at a time, sign off each | Structured progression, circuits |
| `per_exercise` | One exercise at a time, sign off each | Maximum tracking, form focus |

### Session Completion

```typescript
// Session Completion Modal
{
  overallRpe: number       // Required, 1-10
  privateNotes: string     // Trainer-only notes
  publicNotes: string      // Client sees these
  trainerDeclaration: true // Required checkbox
}

// API: PUT /api/sessions/{id}
Updates:
├── completed = true
├── completedAt = timestamp
├── duration = elapsed seconds
├── overallRpe, notes, publicNotes
├── trainerDeclaration, declarationTimestamp
└── json_definition (final exercise data)
```

---

## 12. Dashboard Architecture

### 12.1 Solo Practitioner Dashboard (`/solo`)

```
┌─────────────────────────────────────────────────────────────┐
│  SOLO PRACTITIONER DASHBOARD                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STATS ROW:                                                │
│  ├── Sessions This Week                                    │
│  ├── Earnings This Week                                    │
│  ├── Active Clients                                        │
│  └── Soft Holds (Pending)                                  │
│                                                             │
│  ALERTS (conditional):                                     │
│  ├── Pending Booking Requests → /solo/requests             │
│  ├── Soft Holds Awaiting Payment                           │
│  └── Clients with Low Credits                              │
│                                                             │
│  TIER 1 QUICK ACTIONS:                                     │
│  ├── Start Session → /solo/sessions/new                    │
│  ├── View Calendar → /solo/calendar                        │
│  ├── Add Client → /solo/clients                            │
│  └── Sell Package → /solo/packages                         │
│                                                             │
│  TIER 2 (Collapsible "Build & Setup"):                     │
│  ├── Packages                                              │
│  ├── Templates                                             │
│  └── Settings                                              │
│                                                             │
│  TIER 3 AI ENHANCEMENTS:                                   │
│  ├── AI Programs → /solo/programs                          │
│  └── AI Templates → /solo/templates/builder                │
│                                                             │
│  RECENT CLIENTS SECTION:                                   │
│  └── 5 most recent clients with credit status              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 12.2 Trainer Dashboard (`/trainer`)

```
┌─────────────────────────────────────────────────────────────┐
│  TRAINER DASHBOARD                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STATS SUMMARY:                                            │
│  ├── Sessions This Week                                    │
│  ├── Earnings This Week                                    │
│  ├── Active Clients                                        │
│  └── Soft Holds (Pending)                                  │
│                                                             │
│  QUICK ACTIONS:                                            │
│  ├── Schedule Session → /trainer/sessions/new              │
│  ├── View Templates → /trainer/templates                   │
│  ├── Recent Sessions → /trainer/sessions                   │
│  └── Booking Requests → /trainer/requests                  │
│                                                             │
│  UPCOMING SESSIONS:                                        │
│  └── Up to 5 upcoming sessions                             │
│      └── Client name, date/time, service, status           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 12.3 Client Dashboard (`/client`)

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT DASHBOARD                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STATS GRID:                                               │
│  ├── Credits Available                                     │
│  ├── Upcoming Bookings                                     │
│  ├── Total Sessions Completed                              │
│  ├── Sessions This Week                                    │
│  ├── Average RPE                                           │
│  └── Average Session Duration                              │
│                                                             │
│  SESSION IN PROGRESS CARD (conditional):                   │
│  └── Shows when trainer has started a session              │
│      └── "Your trainer is tracking your progress"          │
│                                                             │
│  QUICK ACTIONS:                                            │
│  ├── Book Session → /client/book                           │
│  ├── My Bookings → /client/bookings                        │
│  ├── My Credits → /client/packages                         │
│  ├── Session History → /client/sessions                    │
│  └── My Progress → /client/progress                        │
│                                                             │
│  RECENT SESSIONS:                                          │
│  └── 3 most recent completed sessions                      │
│      └── Date, duration, RPE, trainer's public notes       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 12.4 Studio Owner Dashboard (`/studio-owner`)

```
┌─────────────────────────────────────────────────────────────┐
│  STUDIO OWNER DASHBOARD                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SIDEBAR NAVIGATION:                                       │
│  ├── Dashboard (home)                                      │
│  ├── Calendar → /studio-owner/calendar                     │
│  ├── Clients → /studio-owner/clients                       │
│  ├── Team → /studio-owner/team                             │
│  ├── Services → /studio-owner/services                     │
│  ├── Templates → /studio-owner/templates                   │
│  ├── Packages → /studio-owner/packages                     │
│  └── Settings → /studio-owner/settings                     │
│                                                             │
│  TEAM PAGE (/studio-owner/team):                           │
│  ├── Pending Invitations list                              │
│  │   └── Revoke option                                     │
│  ├── Current Team members                                  │
│  │   └── Role, status badges                               │
│  └── Invite Member button → InviteTrainerDialog            │
│                                                             │
│  CLIENTS PAGE (/studio-owner/clients):                     │
│  ├── Full client management                                │
│  ├── Add/Invite client options                             │
│  ├── Edit credits, archive/restore                         │
│  └── Booking history drawer                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. Branding & Logo System

### Overview

Studios can customize their branding with a business logo that appears on:
- Public booking page header
- All email templates sent to clients
- (Future) Client dashboard when logged in

### Image Storage Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    CLOUDINARY CDN                              │
│  (Reliable image hosting for emails)                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Benefits:                                                     │
│  • HTTPS URLs (required for email security)                    │
│  • Global CDN (fast loading worldwide)                         │
│  • Permanent URLs (won't break in emails)                      │
│  • Automatic optimization (resizing, compression)              │
│  • PNG format support (best email compatibility)               │
│                                                                │
│  Folder Structure: allwondrous/logos/                         │
│  Naming: logo_{userId}_{timestamp}                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Logo Upload Flow

```
1. ONBOARDING (Step 3: Business Setup)
   └── /app/onboarding/business/page.tsx
       ├── LogoUpload component displayed
       ├── User selects image file
       └── Preview shown immediately

2. SETTINGS (Edit existing logo)
   └── /app/(dashboard)/settings/page.tsx
       ├── Business Branding section (studio_owner & solo_practitioner only)
       ├── Load existing logo from profiles.business_logo_url
       └── LogoUpload component for editing

3. UPLOAD PROCESS
   ├── Client: Convert image to base64
   ├── POST /api/logos/upload
   │   ├── Validate user authentication
   │   ├── Validate image format (data:image/*)
   │   ├── Upload to Cloudinary with transformations:
   │   │   ├── max 400x400px
   │   │   ├── auto quality
   │   │   └── auto format (webp/png)
   │   └── Update profiles.business_logo_url
   └── Return Cloudinary URL to client

3. DISPLAY LOCATIONS
   ├── Public Booking: /app/book/[slug]/page.tsx
   │   └── Logo displayed above trainer info
   └── Email Templates: /lib/notifications/email-templates.ts
       └── Logo in email header (white background)
```

### Email Logo Best Practices

Based on email deliverability research:

| Approach | Pros | Cons |
|----------|------|------|
| **Hosted URL (Used)** | Small email size, reliable, updateable | Requires internet |
| Base64 Inline | Works offline | +30% email size, blocked by Gmail/Outlook |
| CID Embedded | Some offline support | Complex, inconsistent rendering |

**Implementation Details:**
```typescript
// Email header with logo
function getEmailHeader(title: string, branding?: EmailBranding): string {
  if (branding?.logoUrl) {
    return `
      <div class="header-with-logo">
        <img src="${logoUrl}" alt="${businessName}"
             style="max-width: 150px; max-height: 60px;" />
      </div>
      <div class="header"><h1>${title}</h1></div>`;
  }
  return `<div class="header"><h1>${title}</h1></div>`;
}
```

**Key Practices:**
- Always use HTTPS URLs
- Include alt text fallback (business name shown if image blocked)
- Limit dimensions (150x60px in emails)
- Use PNG format for widest compatibility
- White background to showcase logo

### Database Schema

```sql
-- profiles table
business_logo_url TEXT  -- Cloudinary URL

-- bs_studios table (for future multi-owner studios)
logo_url TEXT  -- Can override profile-level logo
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/logos/upload` | POST | Upload logo to Cloudinary |
| `/api/logos/upload` | DELETE | Remove logo from profile |

### Component: LogoUpload

**Location:** `/components/shared/LogoUpload.tsx`

**Features:**
- Drag & drop support
- File type validation (images only)
- Size validation (max 5MB)
- Preview before upload
- Remove button
- Loading states
- Error handling

**Usage:**
```tsx
<LogoUpload
  currentLogo={businessLogo}
  onLogoChange={setBusinessLogo}
/>
```

### Component: PublicBookingLink

**Location:** `/components/shared/PublicBookingLink.tsx`

**Purpose:** Displays the public booking link with copy and QR code functionality.

**Features:**
- Displays full booking URL
- Copy to clipboard button
- Open in new tab button
- QR code generation (using `qrcode` library)
- Downloadable QR code as PNG
- Mobile-friendly design

**Displayed On:**
- Solo Practitioner Dashboard (`/solo`)
- Studio Owner Dashboard (`/studio-owner`)

**Usage:**
```tsx
<PublicBookingLink
  businessSlug={businessSlug}
  businessName="Studio Name"
/>
```

**QR Code Details:**
- 256x256 pixels
- High error correction (Level H)
- Downloads as `{slug}-booking-qr.png`

---

## 14. API Reference

### Authentication APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/check-client` | GET | Check if email is existing client |
| `/api/auth/link-guest` | POST | Link guest client to auth account |

### Client APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clients` | GET | List studio's clients |
| `/api/clients` | POST | Create new client |
| `/api/clients` | PUT | Update client by ID |
| `/api/clients` | PATCH | Partial update (archive) |
| `/api/clients` | DELETE | Delete client |
| `/api/client/packages` | GET | Get client's credits/packages |
| `/api/client/bookings` | GET/POST/DELETE | Manage client bookings |
| `/api/client/studios` | GET | Get all studios for client |
| `/api/client/studio/services` | GET | Get studio's services |
| `/api/client/studio/trainers` | GET | Get studio's trainers |
| `/api/client/studio/availability` | GET | Get trainer availability |
| `/api/client/shop/packages` | GET | Get purchasable packages |
| `/api/client/shop/offers` | GET | Get available offers |
| `/api/client/shop/claim` | POST | Claim package/offer |

### Invitation APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/invitations` | GET | List trainer invitations |
| `/api/invitations` | POST | Create trainer invitation |
| `/api/invitations` | DELETE | Revoke invitation |
| `/api/invitations/[token]/accept` | POST | Accept trainer invitation |
| `/api/client-invitations` | GET | List client invitations |
| `/api/client-invitations` | POST | Create client invitation |
| `/api/client-invitations/[token]` | GET | Validate invitation |
| `/api/client-invitations/[token]/accept` | POST | Accept client invitation |

### Service & Booking APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services` | GET/POST/PUT/DELETE | Manage services |
| `/api/bookings` | GET | List bookings |
| `/api/bookings/[id]/check-in` | POST | Check-in booking |
| `/api/bookings/[id]/complete` | POST | Complete booking |
| `/api/public/book` | POST | Create public booking |
| `/api/public/services/[trainerId]` | GET | Get trainer's public services |
| `/api/public/availability/[trainerId]` | GET | Get trainer's availability |

### Template & Session APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/templates` | GET/POST/PUT/DELETE | Manage templates |
| `/api/templates/[id]/assign` | POST | Assign template |
| `/api/sessions` | GET/POST | List/create sessions |
| `/api/sessions/[id]` | GET/PUT | Get/update session |
| `/api/sessions/upcoming` | GET | Get upcoming sessions |

### Credit & Package APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/credit-bundles` | GET/POST/PUT/DELETE | Manage credit bundles |
| `/api/offers` | GET/POST/PUT/DELETE | Manage offers |

---

## 15. Data Flow Diagrams

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│  COMPLETE USER JOURNEY                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SOLO PRACTITIONER / STUDIO OWNER JOURNEY                              │
│  ═══════════════════════════════════════════                           │
│                                                                         │
│  1. SIGNUP & ONBOARDING                                                │
│     └── /login → Sign up → /onboarding (5 steps)                       │
│         └── Creates: profile, bs_studios, bs_staff, ta_services,       │
│             ta_availability                                            │
│                                                                         │
│  2. TEAM BUILDING (Studio Owner)                                       │
│     └── /studio-owner/team → Invite trainer                            │
│         └── Creates: ta_invitations → Email sent                       │
│         └── Trainer accepts → bs_staff created                         │
│                                                                         │
│  3. CLIENT ACQUISITION                                                 │
│     ├── Manual: /clients → Add Client                                  │
│     │   └── Creates: fc_clients (is_guest=true)                        │
│     ├── Invitation: /clients → Invite Client                           │
│     │   └── Creates: ta_client_invitations → Email sent                │
│     │   └── Client accepts → fc_clients + profile created              │
│     └── Public Booking: /book/{slug}                                   │
│         └── Guest books → fc_clients (is_guest=true) created           │
│         └── Optional: Create account later                             │
│                                                                         │
│  4. PACKAGE SETUP                                                      │
│     └── /packages → Create credit bundle                               │
│         └── Creates: credit_bundles                                    │
│         └── Client claims → ta_client_packages created                 │
│                                                                         │
│  5. TEMPLATE CREATION                                                  │
│     └── /templates → Create template                                   │
│         └── Creates: ta_workout_templates                              │
│         └── Assign to trainer/client                                   │
│                                                                         │
│  6. SERVICE DELIVERY                                                   │
│     └── Client books → ta_bookings created                             │
│     └── Trainer checks in → status='checked-in'                        │
│     └── Trainer runs session → ta_sessions created                     │
│     └── Session completed → credits deducted                           │
│                                                                         │
│  CLIENT JOURNEY                                                        │
│  ══════════════                                                        │
│                                                                         │
│  1. ACCOUNT CREATION                                                   │
│     ├── Via invitation email → /client-invite/{token}                  │
│     └── Via public booking → /book/{slug}/confirm/.../create-account   │
│                                                                         │
│  2. CREDIT ACQUISITION                                                 │
│     └── /client/shop → View packages/offers                            │
│         └── Claim free package → ta_client_packages created            │
│         └── OR studio assigns credits → fc_clients.credits updated     │
│                                                                         │
│  3. BOOKING                                                            │
│     └── /client/book → 4-step wizard                                   │
│         └── Creates: ta_bookings (credits reserved)                    │
│                                                                         │
│  4. SESSION                                                            │
│     └── Trainer runs session with client                               │
│     └── Client sees progress on /client dashboard                      │
│     └── After completion → /client/sessions shows history              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Booking to Session Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BOOKING → SESSION → COMPLETION                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CLIENT BOOKS                                                          │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────┐                                           │
│  │ ta_bookings             │                                           │
│  │ status = 'confirmed'    │                                           │
│  │ credits reserved        │                                           │
│  └───────────┬─────────────┘                                           │
│              │                                                          │
│              ▼                                                          │
│  TRAINER CHECKS IN (calendar)                                          │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────┐                                           │
│  │ ta_bookings             │                                           │
│  │ status = 'checked-in'   │                                           │
│  └───────────┬─────────────┘                                           │
│              │                                                          │
│              ▼                                                          │
│  TRAINER STARTS SESSION                                                │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────┐                                           │
│  │ ta_sessions             │                                           │
│  │ completed = false       │                                           │
│  │ blocks[] with exercises │                                           │
│  └───────────┬─────────────┘                                           │
│              │                                                          │
│              │ Record exercise performance:                            │
│              │ - actualReps, actualResistance, rpe                     │
│              │                                                          │
│              ▼                                                          │
│  TRAINER COMPLETES SESSION                                             │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────┐    ┌─────────────────────────┐           │
│  │ ta_sessions             │    │ ta_bookings             │           │
│  │ completed = true        │    │ status = 'completed'    │           │
│  │ overallRpe, notes       │    │ session_id = xxx        │           │
│  │ trainerDeclaration      │    └─────────────────────────┘           │
│  └───────────┬─────────────┘                                           │
│              │                                                          │
│              ▼                                                          │
│  ┌─────────────────────────┐    ┌─────────────────────────┐           │
│  │ ta_credit_usage         │    │ ta_client_packages      │           │
│  │ reason = 'booking'      │◄───│ sessions_remaining -= 1 │           │
│  │ credits_used = 1        │    │ (FIFO from oldest)      │           │
│  └─────────────────────────┘    └─────────────────────────┘           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

The Trainer-Aide platform is a comprehensive training management system that supports:

1. **Multiple User Roles**: Solo practitioners, studio owners, trainers, and clients
2. **Flexible Onboarding**: Role-specific setup for services, availability, and business details
3. **Team Management**: Trainer invitations with commission tracking
4. **Client Acquisition**: Manual addition, email invitations, and public booking
5. **Credit System**: Package-based credits with FIFO expiration, plus simple direct credits
6. **Template System**: Reusable workout blueprints with trainer/client assignment levels
7. **Session Management**: Three sign-off modes for different training styles
8. **Multi-Dashboard Architecture**: Role-specific views for all user types

The system is built on Supabase with Row Level Security (RLS) policies, using Next.js App Router for the frontend with Zustand for state management.

---

*Last Updated: February 2026*
*Version: 2.0*
