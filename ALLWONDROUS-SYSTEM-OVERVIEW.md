# AllWondrous - Complete System Documentation

> A comprehensive guide to the AllWondrous platform: what it is, how it works, the AI features, deployment architecture, and the full user journey.

---

## Table of Contents

1. [What is AllWondrous?](#1-what-is-allwondrous)
2. [Tech Stack](#2-tech-stack)
3. [Deployment & Infrastructure](#3-deployment--infrastructure)
4. [System Architecture](#4-system-architecture)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [User Journey - Trainer Side](#6-user-journey---trainer-side)
7. [User Journey - Client Side](#7-user-journey---client-side)
8. [Core Features](#8-core-features)
9. [AI Feature - Workout Program Generator](#9-ai-feature---workout-program-generator)
10. [Payment & Credits System](#10-payment--credits-system)
11. [Notification System](#11-notification-system)
12. [Public Booking System](#12-public-booking-system)
13. [Database Architecture](#13-database-architecture)
14. [API Reference](#14-api-reference)

---

## 1. What is AllWondrous?

AllWondrous is a **professional fitness training platform** designed to help personal trainers and studio owners manage their entire business digitally. It covers:

- **Client management** - Track clients, invitations, health checks, and progress
- **Booking & scheduling** - Public booking pages, calendar management, availability slots
- **Session tracking** - Live session recording with exercise blocks, RPE tracking, and sign-off
- **AI workout programming** - Claude-powered intelligent workout program generation
- **Payments** - Stripe Connect for payments, credit bundles, and package management
- **Templates** - Reusable workout templates with drag-and-drop builder
- **Analytics** - Revenue tracking, session stats, client utilization dashboards
- **Team management** - Invite trainers, managers, and receptionists to your studio
- **Notifications** - Email (Elastic Email) and SMS (Telnyx) for booking confirmations, reminders, and payment chasing

The platform supports two primary business models:
- **Solo practitioners** - Independent personal trainers running their own business
- **Studio owners** - Multi-trainer fitness studios with team management

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Frontend** | React 19, Tailwind CSS, Radix UI, Framer Motion |
| **State Management** | Zustand (client state), TanStack React Query (server state) |
| **Database** | Supabase (PostgreSQL + Auth + Row Level Security) |
| **AI** | Anthropic Claude API (Claude Sonnet 4.5) via `@anthropic-ai/sdk` |
| **Payments** | Stripe Connect + Stripe Checkout |
| **Email** | Elastic Email (transactional email API) |
| **SMS** | Telnyx (transactional SMS API) |
| **Image Storage** | Cloudinary (logo uploads, profile images) |
| **Form Handling** | React Hook Form + Zod validation |
| **Fonts** | Bodoni Moda, Lato, Montserrat (Google Fonts) |
| **Icons** | Lucide React |
| **Deployment** | Netlify (primary), with Vercel compatibility |

---

## 3. Deployment & Infrastructure

### Current Deployment: Netlify

The application is deployed on **Netlify** using the `@netlify/plugin-nextjs` plugin. Configuration is defined in `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[functions]
  node_bundler = "esbuild"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Key constraints:**
- Netlify Business plan has a **60-second hard timeout** for serverless functions
- AI program generation (which can take 2-5 minutes) handles this by detecting the platform and adjusting chunk sizes and token limits accordingly
- For programs longer than 4 weeks, the system warns that Netlify may timeout and suggests shorter programs

### Vercel Compatibility

The codebase also supports Vercel deployment with `maxDuration = 300` (5 minutes) for the AI worker endpoint, allowing longer program generation without timeouts.

### Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |
| `ANTHROPIC_API_KEY` | Claude API key for AI features |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key |
| `ELASTIC_EMAIL_API_KEY` | Elastic Email transactional email |
| `EMAIL_FROM` | Sender email address |
| `TELNYX_API_KEY` | Telnyx SMS API key |
| `TELNYX_PHONE_NUMBER` | Telnyx sender phone number |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

---

## 4. System Architecture

### High-Level Architecture

```
                      +------------------+
                      |   Netlify CDN    |
                      |  (Static + SSR)  |
                      +--------+---------+
                               |
                      +--------v---------+
                      |   Next.js 15     |
                      |   App Router     |
                      +--------+---------+
                               |
              +----------------+----------------+
              |                |                |
     +--------v------+  +-----v------+  +------v-------+
     | API Routes    |  | React UI   |  | Middleware    |
     | /api/*        |  | Dashboard  |  | Auth Guard   |
     +-------+-------+  +-----+------+  +--------------+
             |               |
    +--------+--------+     |
    |                 |     |
+---v----+  +--------v-----v-------+
|Services|  |  Supabase            |
| Layer  |  |  (PostgreSQL + Auth) |
+---+----+  +-----------+----------+
    |                    |
+---v---------+   +-----v------+
| External    |   | Row Level  |
| APIs:       |   | Security   |
| - Claude AI |   +------------+
| - Stripe    |
| - Elastic   |
| - Telnyx    |
| - Cloudinary|
+-------------+
```

### Request Flow

1. **Client request** hits Netlify CDN
2. **Middleware** (`middleware.ts`) checks authentication via Supabase session refresh
3. **Public routes** (`/`, `/login`, `/book/*`, `/invite/*`, `/legal/*`) pass through without auth
4. **Protected routes** redirect to `/login` if no session
5. **API routes** handle their own auth, calling the **service layer** (`lib/services/`)
6. **Services** use `createServiceRoleClient()` to bypass RLS and perform database operations
7. External APIs (Claude, Stripe, etc.) are called from server-side services only

### Service Layer Pattern

All business logic lives in `lib/services/` as standalone async functions (not classes):

```typescript
// Pattern: Every service function returns { data, error }
async function createBooking(data): Promise<{ data: Booking | null; error: Error | null }>
```

Services call `createServiceRoleClient()` internally from `@/lib/supabase/server`. API routes are kept thin: auth check, parse input, service call, return `NextResponse`.

---

## 5. User Roles & Permissions

AllWondrous has a hierarchical role system with 7 distinct roles:

| Role | Dashboard | Description |
|------|-----------|-------------|
| `super_admin` | `/studio-owner` | Platform administrator with full access |
| `studio_owner` | `/studio-owner` | Business owner managing a multi-trainer studio |
| `solo_practitioner` | `/solo` | Independent trainer (studio_id = user.id) |
| `studio_manager` | `/studio-owner` | Operations manager for a studio |
| `trainer` | `/trainer` | Staff trainer working under a studio |
| `receptionist` | `/trainer` | Front desk staff for check-ins and bookings |
| `client` | `/client` | End user / trainee |

Each role maps to a dashboard route. The permissions system is granular, defined in `lib/permissions/`, with role-permission mappings controlling access to specific features like managing clients, creating services, viewing analytics, etc.

---

## 6. User Journey - Trainer Side

### Step 1: Sign Up & Login

The trainer visits the app and creates an account via Supabase Auth (email + password). After login, they are directed to onboarding.

**Auth Flow:**
- `/login` - Email/password authentication
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset via token
- `/auth/callback` - OAuth callback handler

### Step 2: Onboarding (5-step wizard)

Located at `/onboarding/`, the trainer completes a guided setup:

1. **Role Selection** (`/onboarding`) - Choose "Solo Practitioner" or "Studio Owner"
2. **Profile Setup** (`/onboarding/profile` or `/onboarding/solo`) - Name, phone, bio, specializations, years of experience
3. **Business Setup** (`/onboarding/business`) - Business name and unique booking slug (e.g., `allwondrous.com/book/john-fitness`)
4. **Services Setup** (`/onboarding/services` or `/onboarding/solo/services`) - Create bookable services with quick-start templates:
   - Free Intro Session (30 min)
   - 1-2-1 PT Session (60 min, default price)
   - Partner Training (60 min)
5. **Availability Setup** (`/onboarding/availability` or `/onboarding/solo/availability`) - Set weekly recurring availability (default: 9am-5pm)
6. **Complete** (`/onboarding/complete`) - System creates foundational records:
   - `bs_studios` record (studio entity)
   - `bs_staff` record (owner/staff link)
   - Updates `profiles.is_onboarded = true`
   - Displays the public booking URL and next steps

**Studio owners** get additional onboarding steps:
- Session types configuration
- Booking model selection
- Opening hours setup
- Booking protection settings
- Cancellation policy

### Step 3: Dashboard

After onboarding, the trainer lands on their role-specific dashboard:

**Solo Dashboard (`/solo`):**
- Today's sessions with status indicators
- Earnings this week, sessions count, active clients
- Soft-hold bookings with countdown timers
- Pending booking requests
- Quick actions: add client, create session, share booking link
- Client list with credit balances
- QR code for booking page

**Studio Owner Dashboard (`/studio-owner`):**
- All of the above plus:
- Team/staff management
- Multi-trainer calendar view
- Revenue analytics across all trainers
- Client management across the studio

### Step 4: Daily Operations

**Calendar** (`/solo/calendar` or `/studio-owner/calendar`):
- Weekly calendar view with all bookings
- Color-coded by status (confirmed, soft-hold, checked-in, completed, cancelled)
- Click to view/manage individual bookings

**Sessions** (`/solo/sessions`):
- Start live training sessions from bookings
- Record exercises per block with sets, reps, weight, RPE
- Sign-off modes: full session, per block, or per exercise
- Session timer and notes
- Complete and save session records

**Clients** (`/solo/clients` or `/studio-owner/clients`):
- Full client roster with search and filter
- Credit balances and package status
- Add clients manually or via email invitation
- View individual client progress, goals, and metrics
- Assign workout templates and AI programs

**Programs** (`/solo/programs`):
- AI-generated workout programs
- Create, view, edit, duplicate programs
- Assign programs to clients
- Save programs as reusable templates

**Templates** (`/solo/templates`):
- Template builder with drag-and-drop exercise blocks
- Exercise library browser
- Template assignment to trainers and clients

**Packages** (`/solo/packages` or `/studio-owner/packages`):
- Create credit bundles (e.g., "10 Sessions for $400")
- Set expiry periods
- Track sales and usage

**Revenue** (`/solo/revenue` or `/studio-owner/revenue`):
- Revenue analytics and tracking
- Payment history
- Outstanding balances

**Booking Requests** (`/solo/requests`):
- View pending booking requests from clients
- Accept or decline with notes
- Auto-confirm or require manual approval

**Settings** (`/settings`):
- Profile management
- Studio configuration
- Stripe Connect setup
- SMS configuration
- Service management

---

## 7. User Journey - Client Side

### How Clients Join

Clients can enter the system through 3 paths:

#### Path 1: Public Booking (No Account Required)
1. Client visits `/book/{trainer-slug}` (shared via link or QR code)
2. Views trainer profile, bio, and available services
3. Selects a service and picks a date/time slot
4. Enters name, email, and phone at checkout
5. System creates a **guest client** record (`is_guest = true`)
6. Booking is confirmed (free) or placed on soft-hold (paid, 2-hour expiry)
7. Client can optionally create an account from the confirmation page

#### Path 2: Client Invitation
1. Trainer sends invitation via email from their dashboard
2. Client receives email with invitation link `/client-invite/{token}`
3. Client creates account (sets password)
4. System creates full client record linked to the trainer's studio
5. Client is redirected to their dashboard

#### Path 3: Manual Addition
1. Trainer adds client manually from their dashboard (name, email, phone)
2. Optionally sends welcome email with invitation to create an account
3. Client exists as a guest until they create an account

### Client Dashboard (`/client`)

Once logged in, clients see:

- **Time-based greeting** ("Good morning, Sarah")
- **Upcoming bookings** with status and countdown timers for soft-holds
- **Session history** with completed workouts
- **Credit balance** and active packages
- **Quick actions**: Book a session, view progress

### Client Features

- **Book Sessions** (`/client/book`) - 4-step booking wizard:
  1. Select trainer (if multi-trainer studio)
  2. Select service
  3. Pick date/time from available slots
  4. Confirm and pay with credits or Stripe

- **My Bookings** (`/client/bookings`) - View upcoming and past bookings

- **My Sessions** (`/client/sessions`) - Review completed training sessions with exercise details

- **Packages** (`/client/packages`) - View purchased credit packages, remaining sessions

- **Progress** (`/client/progress`) - Track fitness progress, metrics, and goals

- **Health Check** (`/client/health-check`) - Complete health questionnaire with:
  - PAR-Q style health questions
  - Emergency contact information
  - Medical conditions and medications
  - Physical limitations

- **Shop** (`/client/shop`) - Browse and purchase:
  - Credit packages
  - Special offers and promotions
  - Claim referral rewards

---

## 8. Core Features

### Booking System

The booking system supports multiple booking statuses:

| Status | Description |
|--------|-------------|
| `confirmed` | Booking is confirmed and locked in |
| `soft-hold` | Temporary hold (2-hour expiry) pending payment |
| `checked-in` | Client has arrived and checked in |
| `completed` | Session has been completed |
| `cancelled` | Booking was cancelled |

**Soft-Hold Logic:**
- When a paid service is booked publicly, it starts as a `soft-hold`
- A 2-hour countdown timer is shown to both trainer and client
- If payment isn't completed within the hold period, the slot is released
- Trainers can manually confirm or cancel soft-holds
- The system sends email/SMS reminders about expiring holds

**Booking Conflict Detection:**
- The availability service generates time slots by overlaying weekly availability blocks against existing bookings
- 30-minute slot intervals with configurable buffer time between bookings
- Double-booking prevention via conflict checks before confirming

### Session Recording

Sessions are recorded with a structured JSON definition:

```
Session
  -> Blocks (e.g., "Warm-Up", "Main Set", "Finisher")
    -> Exercises (from exercise library)
      -> Sets (target vs actual: reps, weight, RPE)
```

**Sign-off modes:**
- `full_session` - Trainer signs off the entire session at once
- `per_block` - Sign off each block individually
- `per_exercise` - Granular sign-off per exercise

Sessions track: duration, overall RPE (1-10), private trainer notes, public client-visible notes, and a trainer declaration timestamp.

### Template System

Templates are reusable workout blueprints:
- Created via a **visual builder** at `/solo/templates/builder`
- Contain blocks with exercises, sets, reps, tempo, rest periods
- Can be assigned to specific trainers (`ta_trainer_template_assignments`)
- Can be assigned to specific clients (`ta_client_template_assignments`)
- Bookings can reference a template, pre-populating the session

### Availability System

Trainers set their availability with:
- **Weekly recurring blocks** (e.g., Monday 9am-5pm every week)
- **One-time blocks** (e.g., unavailable Dec 25th)
- **Block types**: `available` or `unavailable`
- The system generates bookable time slots by combining availability with existing bookings

---

## 9. AI Feature - Workout Program Generator

### Overview

The AI workout program generator is the flagship feature of AllWondrous. It uses **Anthropic's Claude Sonnet 4.5** to create complete, periodized workout programs tailored to individual clients.

### How It Works

#### Architecture

```
Trainer triggers program generation
         |
         v
POST /api/ai/generate-program
  -> Creates program record (status: "generating")
  -> Fires background worker (fire-and-forget)
  -> Returns program_id immediately
         |
         v
POST /api/ai/generate-program/worker (background)
  -> Step 1: Load client profile & goals
  -> Step 2: Filter exercise library for client
  -> Step 3: Build AI prompts
  -> Step 4: Call Claude API (in chunks for long programs)
  -> Step 5: Validate & fix AI output
  -> Step 6: Save workouts to database
  -> Step 7: Save exercises for each workout
  -> Step 8: Create nutrition plan (optional)
  -> Step 9: Log generation metrics
  -> Step 10: Create revision snapshot
  -> Step 11: Mark complete
         |
         v
GET /api/ai-programs/[id]/stream (SSE)
  -> Real-time progress updates via Server-Sent Events
  -> Polls database every 2 seconds for status changes
  -> Sends creative progress messages to the UI
```

#### The Generation Pipeline

**1. Client Profile Analysis**

When a trainer triggers generation, the system pulls the client's profile which includes:
- Experience level (beginner, intermediate, advanced)
- Primary and secondary fitness goals
- Available equipment
- Injuries and physical limitations
- Exercise aversions and preferences
- Preferred training days and times
- Active goals from `ta_client_goals` (e.g., "lose 10kg by March")

**2. Exercise Filtering** (`lib/ai/utils/exercise-filter.ts`)

Before calling the AI, the exercise library is filtered based on the client's constraints:
- **Equipment filter** - Only exercises matching available equipment
- **Experience filter** - Exclude complex movements for beginners
- **Injury filter** - Remove exercises that conflict with injuries/restrictions
- **Aversion filter** - Exclude exercises the client dislikes

This ensures the AI can only select from safe, appropriate exercises.

**3. Prompt Engineering** (`lib/ai/prompts/workout-generator-prompt.ts`)

The system prompt establishes Claude as an "elite Strength & Conditioning coach with 20+ years of experience" and provides detailed guidelines:

- **Movement balance** - Every week must balance push/pull/squat/hinge/lunge/core patterns
- **Plane of motion variety** - Exercises across sagittal, frontal, and transverse planes
- **Injury conflict detection** - Never select exercises that conflict with client restrictions
- **Progressive overload** - Appropriate progression based on experience level
- **Recovery management** - Deload weeks, volume adjustment based on frequency
- **Goal-based programming** - Different rep ranges, rest periods, and styles for fat loss vs. strength vs. hypertrophy
- **Sets/reps/tempo/RPE guidelines** - Evidence-based defaults for each goal type

The user prompt contains the full client profile, filtered exercise list (with IDs), and generation parameters.

**4. Chunked Generation**

For programs longer than 3 weeks, the AI generates in **2-week chunks** to stay within token limits:
- Small programs (1-3 weeks): Single chunk
- Medium/large programs (4-52 weeks): 2-week chunks with progressive context

Each subsequent chunk receives context from previous weeks to ensure proper progression and exercise variety.

**5. Real-Time Progress Updates**

During generation, the system updates the database with creative progress messages that stream to the UI via SSE:
- "Submitting goals to the AI coach..."
- "AI coach is lacing up their metaphorical sneakers..."
- "Loading dumbbells of data..."
- "Week 1 workout blueprint loading..."
- "AI coach doing a post-workout stretch..."
- "Boom! Your program is ready to crush goals."

Progress percentage and step counts are tracked and displayed with a progress bar.

**6. Validation & Fixing**

After generation, the AI output is validated:
- All exercise IDs are checked against the filtered exercise library
- Invalid exercise IDs are removed (with warnings logged)
- Duplicate weeks are deduplicated
- Session types are normalized to valid database values
- Minimum exercise counts per workout are enforced

**7. Database Storage**

The generated program is stored across multiple tables:
- `ai_programs` - Master program record with metadata, AI rationale, and movement balance summary
- `ai_workouts` - Individual workout records (week number, day number, focus, session type)
- `ai_workout_exercises` - Exercise details (sets, reps, tempo, RPE, rest, coaching cues, modifications)
- `ai_nutrition_plans` - Optional nutrition guidance
- `ai_generation_logs` - Audit trail with token usage, cost estimate, and latency
- `ai_program_revisions` - Snapshot of the complete program for version history

### AI Output Structure

Each generated program includes:

```
Program
  -> program_name, description, ai_rationale
  -> movement_balance_summary (muscle group distribution)
  -> weekly_structure (array of weeks)
    -> workouts (array per week)
      -> workout_name, workout_focus, session_type
      -> movement_patterns_covered, planes_of_motion_covered
      -> ai_rationale (why this workout was designed this way)
      -> exercises (array per workout)
        -> exercise_id (from database), exercise_order
        -> sets, reps_target, target_rpe, tempo, rest_seconds
        -> coaching_cues (array of form tips)
        -> modifications (easier/harder alternatives)
```

### AI Configuration

| Parameter | Value |
|-----------|-------|
| Model | `claude-sonnet-4-5-20250929` (Claude Sonnet 4.5) |
| Temperature | 0.7 (balanced creativity) |
| Max tokens | 6,000 (Netlify) / 8,192 (Vercel) per chunk |
| Client timeout | 180 seconds (SDK level) |
| Worker timeout | 58 seconds (Netlify) / 300 seconds (Vercel) |
| Max program length | 52 weeks |
| Max sessions/week | 7 |

### Program Management

After generation, trainers can:
- **View** the complete program with all workouts and exercises
- **Edit** individual workouts, exercises, sets, reps
- **Duplicate** programs for similar clients
- **Assign** programs to clients
- **Save as template** for reuse
- **Track revisions** with version history

---

## 10. Payment & Credits System

### Stripe Connect Integration

AllWondrous uses **Stripe Connect** so trainers receive payments directly:

1. **Onboarding** - Trainer connects their Stripe account via `/api/stripe/connect/create`
2. **Account linking** - Dashboard link via `/api/stripe/connect/link`
3. **Status check** - Verify account status via `/api/stripe/connect/status`

### Credit Bundles

Trainers create credit packages for clients:
- Define name, credit count, total price, price per credit
- Set expiry period (days)
- Clients purchase via Stripe Checkout (`/api/stripe/checkout/package`)
- Credits are tracked in `ta_client_packages` with usage audit log

### Payment Flow

```
Client purchases package
  -> Stripe Checkout session created
  -> Client pays via Stripe
  -> Stripe webhook fires (/api/stripe/webhooks)
  -> System creates ta_client_packages record
  -> Credits become available for booking
```

### Referral & Offers System

- `referral_signup_links` - Promotional offers with referral codes
- Configurable: max referrals, credit rewards, payment amounts, expiry dates
- Clients can claim offers via the shop (`/client/shop`)

---

## 11. Notification System

### Email (Elastic Email)

Transactional emails sent via the Elastic Email REST API:
- Booking confirmations
- Session reminders
- Low credit warnings
- Payment receipts
- Booking request notifications (created/accepted/declined)
- Client invitations
- Reschedule notifications
- Soft-hold expiry warnings
- Custom messages from trainers

Sender: Configurable via `EMAIL_FROM` env var (default: `contact@fluxium.dev`, name: "AllWondrous")

### SMS (Telnyx)

SMS notifications via Telnyx API:
- Booking confirmations and reminders
- Inbound SMS handling (`/api/sms/inbound`)
- SMS processing queue (`/api/sms/process`)
- Configurable per-studio (can be enabled/disabled)

### Payment Chasing

Automated payment chase notifications (`/api/notifications/chase-payment`) for outstanding balances.

---

## 12. Public Booking System

Each trainer gets a unique public booking page at `/book/{business_slug}`.

### Booking Flow

```
1. /book/{slug}
   -> Displays trainer profile (name, bio, specializations, logo)
   -> Lists available services with pricing

2. /book/{slug}/{serviceId}
   -> Week-view calendar showing available time slots
   -> Slots generated from availability minus existing bookings
   -> Select a time slot

3. /book/{slug}/checkout
   -> Enter: first name, last name, email, phone
   -> Review booking summary
   -> Submit booking

4. POST /api/public/book (backend)
   -> Client lookup/creation logic:
      - Existing client for this studio -> reuse
      - Existing email for other studio -> create new record
      - New email -> create guest client
   -> Booking status:
      - Free service -> 'confirmed' immediately
      - Paid service -> 'soft-hold' with 2-hour expiry
   -> Returns: bookingId, status, requiresPayment

5. /book/{slug}/confirm/{bookingId}
   -> Shows booking confirmation details
   -> If guest: option to create an account
   -> Links to client invitation flow
```

### Branding

Trainers can customize their public booking page with:
- Business logo (uploaded via Cloudinary)
- Brand color
- Business name
- Profile image

---

## 13. Database Architecture

### Supabase (PostgreSQL)

The database uses Supabase with the following table groups:

**Authentication & Profiles:**
- `auth.users` (Supabase Auth)
- `profiles` - Extended user metadata, role, onboarding status, business slug

**Business Structure:**
- `bs_studios` - Studio entities (solo or multi-trainer)
- `bs_staff` - Staff members linked to studios

**Client Management:**
- `fc_clients` - Client records linked to studios
- `client_profiles` - Detailed client profiles for AI programming
- `ta_client_goals` - Client fitness goals with targets
- `ta_client_metrics` - Body measurements and progress tracking

**Services & Scheduling:**
- `ta_services` - Bookable service definitions
- `ta_availability` - Trainer availability blocks
- `ta_bookings` - Scheduled bookings
- `ta_booking_requests` - Booking requests requiring approval

**Training:**
- `ta_sessions` - Completed training sessions
- `ta_workout_templates` - Reusable workout blueprints
- `ta_trainer_template_assignments` - Template-to-trainer links
- `ta_client_template_assignments` - Template-to-client links
- `exercises` - Exercise library

**AI Programs:**
- `ai_programs` - AI-generated program master records
- `ai_workouts` - Individual workouts within programs
- `ai_workout_exercises` - Exercise details per workout
- `ai_nutrition_plans` - AI-generated nutrition guidance
- `ai_generation_logs` - Generation audit trail
- `ai_program_revisions` - Version history snapshots

**Credits & Payments:**
- `credit_bundles` - Package definitions
- `ta_client_packages` - Purchased packages
- `ta_credit_usage` - Credit usage audit log
- `referral_signup_links` - Promotional offers

**Invitations:**
- `ta_invitations` - Team/staff invitations (7-day expiry)
- `ta_client_invitations` - Client invitations

**Notifications:**
- SMS system tables (per migration `033_sms_system.sql`)

---

## 14. API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/check-client` | Check if a client account exists |
| POST | `/api/auth/link-guest` | Link a guest client to an account |

### AI Programs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/generate-program` | Start AI program generation |
| POST | `/api/ai/generate-program/worker` | Background worker (internal) |
| GET | `/api/ai-programs` | List AI programs |
| GET | `/api/ai-programs/[id]` | Get program details |
| PUT | `/api/ai-programs/[id]` | Update program |
| POST | `/api/ai-programs/[id]/duplicate` | Duplicate a program |
| POST | `/api/ai-programs/[id]/assign` | Assign program to client |
| GET | `/api/ai-programs/[id]/stream` | SSE progress stream |
| GET | `/api/ai-programs/[id]/workouts` | Get program workouts |
| POST | `/api/ai-programs/[id]/template` | Save program as template |
| GET | `/api/ai-programs/templates` | List program templates |
| GET | `/api/ai-programs/assigned` | List assigned programs |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/bookings` | List/create bookings |
| GET/PUT/DELETE | `/api/bookings/[id]` | Manage individual booking |
| POST | `/api/bookings/[id]/check-in` | Check in a client |
| POST | `/api/bookings/[id]/complete` | Complete a booking |
| POST | `/api/booking-requests` | Create booking request |

### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/clients` | List/create clients |
| GET | `/api/clients/[id]/progress` | Client progress data |
| GET | `/api/clients/[id]/goals` | Client goals |
| GET | `/api/clients/[id]/metrics` | Client metrics |
| GET | `/api/clients/[id]/credits` | Client credit balance |
| GET | `/api/clients/[id]/templates` | Assigned templates |
| GET | `/api/clients/booking-history` | Client booking history |

### Public (No Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/trainers/[slug]` | Trainer profile for booking page |
| GET | `/api/public/services/[trainerId]` | Available services |
| GET | `/api/public/availability/[trainerId]` | Available time slots |
| POST | `/api/public/book` | Create a public booking |
| GET | `/api/public/terms/[trainerId]` | Terms & conditions |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stripe/connect/create` | Create Stripe Connect account |
| POST | `/api/stripe/connect/link` | Get account link URL |
| GET | `/api/stripe/connect/status` | Check connection status |
| POST | `/api/stripe/checkout/session` | Create checkout session |
| POST | `/api/stripe/checkout/package` | Purchase credit package |
| POST | `/api/stripe/webhooks` | Stripe webhook handler |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/services` | Manage services |
| GET/PUT | `/api/templates/[id]` | Manage templates |
| POST | `/api/templates/[id]/assign` | Assign template |
| GET/POST | `/api/sessions` | Manage sessions |
| GET/PUT | `/api/availability` | Manage availability |
| GET | `/api/analytics/dashboard` | Dashboard analytics |
| GET | `/api/analytics/operator` | Operator-level analytics |
| POST | `/api/email/send` | Send email |
| POST | `/api/email/reschedule` | Send reschedule notification |
| POST | `/api/email/soft-hold` | Send soft-hold notification |
| POST | `/api/sms/process` | Process SMS queue |
| POST | `/api/sms/inbound` | Handle inbound SMS |
| POST | `/api/notifications/send` | Send notification |
| POST | `/api/notifications/chase-payment` | Chase payment |
| POST | `/api/logos/upload` | Upload logo to Cloudinary |
| GET/POST | `/api/invitations` | Staff invitations |
| GET/POST | `/api/client-invitations` | Client invitations |
| GET/POST | `/api/packages` | Credit packages |
| GET/POST | `/api/credit-bundles` | Credit bundle definitions |
| GET/POST | `/api/offers` | Promotional offers |
| GET/POST | `/api/exercises` | Exercise library |
| GET | `/api/client/health-check` | Client health check data |
| GET | `/api/settings/profile` | Profile settings |
| GET/PUT | `/api/settings/studio` | Studio settings |

---

## Summary

AllWondrous is a full-stack fitness platform that combines modern web technologies (Next.js 15, Supabase, Stripe) with AI-powered workout programming (Claude Sonnet 4.5) to give personal trainers and studio owners everything they need to run their business digitally. The platform handles the complete lifecycle from client acquisition (public booking pages) through session delivery (live session recording) to business management (payments, analytics, team management), with intelligent AI features that generate evidence-based, personalized workout programs in real-time.
