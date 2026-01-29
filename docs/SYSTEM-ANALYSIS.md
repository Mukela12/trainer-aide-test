# Trainer-Aide System Analysis

## Overview

Trainer-Aide is a Next.js 15 fitness training platform that enables personal trainers, solo practitioners, and studio owners to manage workout templates, run training sessions, and track client progress. The application uses a dual-database architecture with Supabase.

---

## Database Architecture

### Dual-Database Setup

| Database | URL | Purpose |
|----------|-----|---------|
| **Wondrous (Main)** | `rzjiztpiiyxbgxngpdvc.supabase.co` | Auth, Users, Profiles, Templates, Sessions, AI Programs |
| **Trainer-Aide (Images)** | `scpfuwijsbjxuhfwoogg.supabase.co` | Exercise images storage only |

---

## Database Schema (Main Database)

### Core Tables

#### `profiles` (125 rows)
Primary user profile table with authentication and role information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (matches Supabase auth.users) |
| `email` | text | User email |
| `first_name` | text | First name |
| `last_name` | text | Last name |
| `role` | text | User role (studio_owner, trainer, solo_practitioner, client) |
| `user_type` | text | User type classification |
| `is_super_admin` | boolean | Super admin flag |
| `is_onboarded` | boolean | Onboarding completion status |
| `role_permissions` | jsonb | Role-based permissions |
| `custom_permissions` | jsonb | Custom permission overrides |
| `platform_version` | text | v1 or v2 platform |
| `v2_active` | boolean | Using v2 features |

#### `bs_staff` (28 rows)
Staff members linked to studios.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `email` | text | Staff email |
| `first_name` | text | First name |
| `last_name` | text | Last name |
| `studio_id` | uuid | FK to bs_studios (null for solo practitioners) |
| `staff_type` | text | instructor, studio_owner, solo_practitioner, trainer, owner |
| `is_solo` | boolean | Solo practitioner flag |
| `is_onboarded` | boolean | Onboarding status |

#### `bs_studios` (2 rows)
Studio/gym entities.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Studio name |
| `owner_id` | uuid | FK to profiles |
| `plan` | text | Subscription plan |
| `license_level` | text | License tier |
| `studio_type` | text | Type of studio |
| `feature_flags` | jsonb | Enabled features |
| `platform_version` | text | Platform version |

#### `fc_clients` (78 rows)
Client records for fitness coaching.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `first_name` | text | First name |
| `last_name` | text | Last name |
| `email` | text | Client email |
| `phone` | text | Phone number |
| `studio_id` | uuid | FK to bs_studios |
| `invited_by` | uuid | FK to profiles (trainer who invited) |
| `is_onboarded` | boolean | Client onboarding status |
| `self_booking_allowed` | boolean | Can book own sessions |
| `credits` | integer | Session credits |

#### `instructors` (8 rows)
Legacy instructor table with detailed professional info.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to auth.users |
| `role` | text | Instructor role |
| `studio_id` | uuid | Assigned studio |
| `specializations` | jsonb | Training specializations |
| `certifications` | jsonb | Professional certifications |
| `permissions_override` | jsonb | Custom permissions |

---

### Trainer-Aide Specific Tables

#### `ta_workout_templates` (0 rows - empty)
Workout template definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Template name |
| `description` | text | Description |
| `type` | text | standard, resistance_only |
| `created_by` | uuid | FK to profiles |
| `studio_id` | uuid | FK to bs_studios |
| `blocks` | jsonb | Workout blocks with exercises |
| `default_sign_off_mode` | text | full_session, per_block, per_exercise |
| `is_default` | boolean | Default template flag |

#### `ta_sessions` (10 rows)
Training session records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `trainer_id` | uuid | FK to profiles |
| `client_id` | uuid | FK to fc_clients |
| `workout_id` | uuid | FK to ta_workouts |
| `template_id` | uuid | FK to ta_workout_templates (nullable) |
| `session_name` | text | Session display name |
| `json_definition` | jsonb | Full session structure (blocks, exercises) |
| `overall_rpe` | integer | Rate of perceived exertion (1-10) |
| `notes` | text | Trainer notes |
| `trainer_declaration` | boolean | Trainer sign-off |
| `completed` | boolean | Completion status |
| `started_at` | timestamp | Session start time |
| `completed_at` | timestamp | Session end time |

**`json_definition` structure:**
```json
{
  "name": "Session Name",
  "description": "Description",
  "blocks": [
    {
      "id": "block_1",
      "name": "Warm-up",
      "exercises": [...]
    }
  ],
  "started_at": "ISO timestamp"
}
```

#### `ta_workouts` (4 rows)
Reusable workout definitions (used as templates).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `trainer_id` | uuid | FK to profiles |
| `name` | text | Workout name |
| `description` | text | Description |
| `json_definition` | jsonb | Workout structure |

#### `ta_exercise_library` (873 rows)
Master exercise database.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `slug` | text | URL-safe identifier |
| `name` | text | Exercise name |
| `category` | text | strength, stretching, cardio |
| `level` | text | beginner, intermediate, advanced |
| `equipment` | text | Required equipment |
| `primary_muscles` | jsonb | Primary muscle groups |
| `secondary_muscles` | jsonb | Secondary muscles |
| `instructions` | jsonb | Step-by-step instructions |
| `image_folder` | text | Image folder name |
| `start_image_url` | text | Starting position image |
| `end_image_url` | text | Ending position image |

---

### AI Programs Tables

#### `ai_programs` (6 rows)
AI-generated training programs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `trainer_id` | uuid | FK to profiles |
| `client_profile_id` | uuid | FK to client_profiles |
| `program_name` | text | Program name |
| `status` | text | draft, active, completed, archived |
| `generation_status` | text | pending, generating, completed, error |
| `primary_goal` | text | general_fitness, strength, hypertrophy, etc. |
| `experience_level` | text | beginner, intermediate, advanced |
| `total_weeks` | integer | Program duration |
| `sessions_per_week` | integer | Weekly frequency |
| `ai_rationale` | text | AI explanation for program design |

#### `ai_workouts` (8 rows)
Individual workouts within AI programs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `program_id` | uuid | FK to ai_programs |
| `week_number` | integer | Week position |
| `day_number` | integer | Day within week |
| `workout_name` | text | Workout name |
| `workout_focus` | text | Focus area (upper, lower, full body) |
| `planned_duration_minutes` | integer | Target duration |
| `is_completed` | boolean | Completion status |
| `overall_rpe` | integer | Post-workout RPE |

#### `ai_workout_exercises` (varies)
Exercises within AI workouts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `workout_id` | uuid | FK to ai_workouts |
| `exercise_id` | uuid | FK to ta_exercise_library |
| `exercise_order` | integer | Position in workout |
| `block_label` | text | Block identifier (A, B, C) |
| `sets` | integer | Number of sets |
| `reps_target` | text | Target rep range (e.g., "8-10") |
| `target_rpe` | integer | Target RPE |
| `tempo` | text | Tempo notation (e.g., "3-0-1-0") |
| `rest_seconds` | integer | Rest between sets |
| `coaching_cues` | jsonb | Array of coaching tips |
| `modifications` | jsonb | Exercise modifications |
| `is_completed` | boolean | Completion flag |
| `actual_reps` | integer | Actual reps performed |
| `actual_load_kg` | decimal | Actual weight used |
| `actual_rpe` | integer | Actual perceived exertion |

---

## User Roles & Navigation

### Role Hierarchy

```
super_admin
    └── Full system access (all features)

studio_owner
    └── Full studio access (templates, trainers, sessions, AI programs)

studio_manager
    └── Operational access (no deletion, limited settings)

solo_practitioner
    └── Acts as own studio (trainer + owner features combined)

trainer
    └── Session execution (view templates, run sessions, calendar)

receptionist
    └── Front desk (view calendar, limited data access)

finance_manager
    └── Financial operations only

client
    └── View own sessions and progress
```

### Navigation by Role

#### Studio Owner Dashboard (`/studio-owner`)
| Tab | Route | Description |
|-----|-------|-------------|
| Dashboard | `/studio-owner` | Stats: Templates, Active, Sessions, Avg RPE |
| AI Programs | `/studio-owner/programs` | Create/manage AI-generated programs |
| Trainers | `/studio-owner/trainers` | Manage staff, assign templates |
| Services | `/studio-owner/services` | Configure session types (30/45/60/75/90 min) |
| Templates | `/studio-owner/templates` | Create/edit workout templates |
| All Sessions | `/studio-owner/sessions` | Monitor all trainer sessions |
| Settings | `/settings` | Account settings |

**Quick Actions:** Create Template, View Templates, View Sessions

#### Trainer Dashboard (`/trainer`)
| Tab | Route | Description |
|-----|-------|-------------|
| Dashboard | `/trainer` | Stats: Sessions, Earnings, Clients, Soft Holds |
| Templates | `/trainer/templates` | View assigned templates (read-only) |
| My Sessions | `/trainer/sessions` | Create, run, complete sessions |
| Calendar | `/trainer/calendar` | Schedule, availability, bookings |
| Settings | `/settings` | Account settings |

**Quick Actions:** Schedule Session, View Templates, Recent Sessions

**Note:** Trainers cannot access AI Programs - they are redirected to `/solo/programs` which then redirects based on permissions.

#### Solo Practitioner Dashboard (`/solo`)
| Tab | Route | Description |
|-----|-------|-------------|
| Dashboard | `/solo` | Combined trainer + owner stats |
| AI Programs | `/solo/programs` | Full AI program creation |
| Sessions | `/solo/sessions` | Manage all sessions |
| Calendar | `/solo/calendar` | Redirects to `/trainer/calendar` |
| Templates | `/solo/templates` | Create & manage custom templates |
| Settings | `/settings` | Account settings |

**Quick Actions:** Start Session, View Calendar, Build Template

#### Client Dashboard (`/client`)
| Tab | Route | Description |
|-----|-------|-------------|
| Home | `/client` | Stats: Total, This Week, Avg RPE, Duration |
| History | `/client/sessions` | View completed sessions with details |
| Settings | `/settings` | Account settings |

**Features:**
- Active session indicator
- Recent sessions list
- Trainer notes visibility
- Exercise details with target vs actual performance

---

## Feature Analysis

### Features Using Real Database

| Feature | API Route | Database Table |
|---------|-----------|----------------|
| Templates | `/api/templates` | `ta_workout_templates` |
| Sessions | `/api/sessions` | `ta_sessions` |
| Active Session | `/api/sessions/active` | `ta_sessions` |
| Clients | `/api/clients` | `fc_clients` |
| Trainers | `/api/trainers` | `bs_staff`, `instructors` |
| AI Programs | `/api/ai-programs` | `ai_programs`, `ai_workouts`, `ai_workout_exercises` |
| Exercise Library | N/A (direct query) | `ta_exercise_library` |

### Features Using Mock Data (Not Persisted)

| Feature | Data Source | Location |
|---------|-------------|----------|
| Calendar Sessions | `CALENDAR_SESSIONS` | `/lib/data/calendar-data.ts` |
| Calendar Clients | `CALENDAR_CLIENTS` | `/lib/data/calendar-data.ts` |
| Services | `MOCK_SERVICES` | `/lib/stores/service-store.ts` |
| Availability | `DEFAULT_TRAINER_AVAILABILITY` | `/lib/data/availability-data.ts` |
| Booking Requests | `MOCK_BOOKING_REQUESTS` | `/lib/data/booking-requests.ts` |
| Exercise Lookup | `getExerciseByIdSync()` | `/lib/mock-data/exercises.ts` |

---

## Data Flow Architecture

### Authentication Flow

```
1. User visits /login
2. Clicks "Sign in with Google"
3. Redirected to Google OAuth
4. Returns to /auth/callback
5. AuthProvider detects session
6. lookupUserProfile() queries (in order):
   a. profiles table
   b. bs_staff table
   c. instructors table
   d. fc_clients table
7. Profile stored in Zustand (useUserStore)
8. Middleware redirects to role dashboard
```

### Profile Lookup Strategy

```typescript
async function lookupUserProfile(supabase, user) {
  // 1. Check profiles table
  const profile = await supabase.from('profiles').select('*').eq('id', user.id);
  if (profile) return { ...profile, source: 'profiles' };

  // 2. Check bs_staff table
  const staff = await supabase.from('bs_staff').select('*').eq('email', user.email);
  if (staff) return { ...staff, role: mapStaffTypeToRole(staff.staff_type) };

  // 3. Check instructors table
  const instructor = await supabase.from('instructors').select('*').eq('user_id', user.id);
  if (instructor) return { ...instructor, source: 'instructors' };

  // 4. Check fc_clients table
  const client = await supabase.from('fc_clients').select('*').eq('email', user.email);
  if (client) return { ...client, role: 'client' };

  return null;
}
```

### Session Execution Flow

```
1. Trainer selects template or AI workout
2. Clicks "Start Session"
3. useSessionStore.startSession() called
4. Session created locally (optimistic update)
5. API POST /api/sessions creates in database
6. Timer starts
7. Trainer marks exercises complete
8. Updates persisted via PUT /api/sessions/[id]
9. Session completed with RPE and notes
10. Final update sent to database
```

### Template CRUD Flow

```
Create:
1. Builder form submitted
2. POST /api/templates
3. Supabase insert to ta_workout_templates
4. Store updated with new template

Read:
1. StoreInitializer calls fetchTemplates()
2. GET /api/templates
3. Returns templates filtered by studio_id or created_by

Update:
1. Edit form submitted
2. PUT /api/templates/[id]
3. Supabase update
4. Store updated (optimistic)

Delete:
1. Delete button clicked
2. DELETE /api/templates/[id]
3. Supabase delete (owner verification)
4. Store updated (optimistic)
```

---

## Zustand Stores

### `useUserStore`
- `currentUser`: User object with id, name, email, role
- `currentRole`: Active role
- `isAuthenticated`: Auth state
- `studioId`: Associated studio (or user_id for solo)

**Permission Methods:**
- `canBuildTemplates()` - studio_owner, solo_practitioner
- `canPushToClients()` - solo_practitioner only
- `canViewStudioOwnerFeatures()` - studio_owner, solo_practitioner
- `canViewTrainerFeatures()` - trainer, solo_practitioner
- `canCreateAIPrograms()` - solo_practitioner, studio_owner, super_admin

### `useTemplateStore`
- `templates`: WorkoutTemplate[]
- `isLoading`: boolean
- `isSaving`: boolean
- `fetchTemplates()`: Fetch from API
- `addTemplate()`: Create with API persistence
- `updateTemplate()`: Update with API persistence
- `deleteTemplate()`: Delete with API persistence

### `useSessionStore`
- `sessions`: Session[]
- `activeSessionId`: string | null
- `isLoading`: boolean
- `isSaving`: boolean
- `fetchSessions()`: Fetch from API
- `startSession()`: Create with API persistence
- `updateSession()`: Update with API persistence
- `completeSession()`: Complete with API persistence
- `updateBlock()`: Block updates persisted
- `updateExercise()`: Exercise updates persisted

### `useCalendarStore`
- `sessions`: CalendarSession[] (mock data)
- `selectedDate`: Date
- `viewMode`: 'day' | 'week'
- Uses `CALENDAR_SESSIONS` mock data (not DB connected)

### `useTimerStore`
- `isRunning`: boolean
- `duration`: number (seconds)
- Manages session timer state

---

## API Routes Summary

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/sessions` | GET, POST | Required | List/create sessions |
| `/api/sessions/[id]` | GET, PUT, DELETE | Required | Session CRUD |
| `/api/sessions/active` | GET | Required | Get active session |
| `/api/templates` | GET, POST | Required | List/create templates |
| `/api/templates/[id]` | GET, PUT, DELETE | Required | Template CRUD |
| `/api/clients` | GET, POST, PUT, DELETE | Required | Client CRUD |
| `/api/trainers` | GET | Required | List trainers |
| `/api/ai-programs` | GET, POST | Required | AI program CRUD |
| `/api/ai-programs/[id]` | GET, PUT, DELETE | Required | Single program ops |
| `/api/ai-programs/[id]/workouts` | GET | Required | Program workouts |
| `/api/ai-programs/[id]/assign` | POST | Required | Assign to client |
| `/api/ai/generate-program` | POST | Required | Generate AI program |

---

## Known Issues & Gaps

### Critical Issues

1. **`ta_workout_templates` is empty (0 rows)**
   - Frontend fetches templates but database has none
   - Users likely using `ta_workouts` table instead
   - Need to clarify which table should store templates

2. **Calendar uses mock data only**
   - `CALENDAR_SESSIONS` in `/lib/data/calendar-data.ts`
   - No booking/scheduling persistence
   - `StoreInitializer` comment: "TODO: integrate with booking system"

3. **Services use mock data only**
   - `MOCK_SERVICES` in service-store
   - No `/api/services` route
   - Changes lost on refresh

4. **Exercise lookup uses sync mock function**
   - `getExerciseByIdSync()` reads from mock data
   - Should use `ta_exercise_library` database table

### Data Inconsistencies

1. **Dual template tables**
   - `ta_workout_templates` (empty, used by API)
   - `ta_workouts` (4 rows, used for sessions)
   - Session `workout_id` references `ta_workouts`, not `ta_workout_templates`

2. **Missing studio_id associations**
   - Many `bs_staff` entries have `studio_id: null`
   - Many `fc_clients` have `studio_id: null`
   - Impacts data filtering

3. **Role mapping inconsistencies**
   - `bs_staff.staff_type` values: instructor, studio_owner, solo_practitioner, trainer, owner
   - `profiles.role` values: studio_owner, trainer
   - Need consistent mapping

### Feature Gaps

1. **No booking system database integration**
2. **No availability persistence**
3. **No notification system**
4. **Client progress reports marked "Coming Soon"**
5. **No real-time updates (WebSocket)**

---

## Recommendations

### Short-term Fixes

1. **Clarify template table usage**
   - Either populate `ta_workout_templates` with existing `ta_workouts` data
   - Or update API to use `ta_workouts` table

2. **Fix exercise lookup**
   - Replace `getExerciseByIdSync()` with async database query
   - Use `ta_exercise_library` table

3. **Add studio_id to orphaned records**
   - Update `bs_staff` entries without studio_id
   - Update `fc_clients` entries without studio_id

### Medium-term Improvements

1. **Create booking/scheduling system**
   - New `bookings` table
   - Connect calendar to database
   - Replace mock calendar data

2. **Create services table**
   - Persist studio services to database
   - Add `/api/services` route

3. **Standardize role system**
   - Consistent role values across tables
   - Clear role hierarchy

### Long-term Enhancements

1. **Real-time updates with Supabase Realtime**
2. **Client portal with progress tracking**
3. **Payment integration for session credits**
4. **Multi-location studio support**

---

## File Structure

```
/app
  /(auth)
    /auth/callback          # OAuth callback
    /login                  # Login page
  /(dashboard)
    /client                 # Client dashboard
    /solo                   # Solo practitioner
    /trainer                # Trainer
    /studio-owner           # Studio owner
    /settings               # Shared settings
  /api
    /sessions               # Session CRUD
    /templates              # Template CRUD
    /clients                # Client CRUD
    /trainers               # Trainer listing
    /ai-programs            # AI program CRUD
    /ai                     # AI generation

/components
  /providers
    AuthProvider.tsx        # Auth context
    StoreInitializer.tsx    # Data initialization
  /layout
    Sidebar.tsx             # Role-based navigation

/lib
  /supabase
    client.ts               # Browser client
    server.ts               # Server client
    images-client.ts        # Images DB client
  /services
    *-service.ts            # Server-side services
    *-service-client.ts     # Client-side services
  /stores
    user-store.ts           # User state
    session-store.ts        # Session state
    template-store.ts       # Template state
  /permissions
    types.ts                # Role types
    role-permissions.ts     # Permission matrix
  /data
    calendar-data.ts        # Mock calendar
    services-data.ts        # Mock services
  /mock-data
    exercises.ts            # Mock exercises
```

---

*Document generated: January 29, 2026*
*Last schema extraction: January 29, 2026*
