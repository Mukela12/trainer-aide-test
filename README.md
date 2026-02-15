# allwondrous

A full-stack fitness platform for personal trainers, studio owners, and their clients. Built with Next.js, Supabase, and Stripe.

## Overview

allwondrous is a multi-role booking, session management, and AI workout generation platform. It supports four user roles — **solo practitioners**, **studio owners**, **trainers** (studio employees), and **clients** — each with a dedicated dashboard and feature set.

### Solo Practitioner

- Manage clients, services, and availability
- Public booking page with shareable link
- Run training sessions with timer and sign-off modes
- Create workout templates (manual or AI-generated)
- Credit packages and session bundles

### Studio Owner

- Everything a solo practitioner has, plus:
- Multi-trainer team management with invitations
- Studio-wide analytics and session monitoring
- Centralised client and service management
- Configurable booking model (trainer-led, client self-book, or hybrid)
- Cancellation policies and booking safeguards

### Trainer (Studio Employee)

- Calendar with day/week views and inline booking
- Run sessions with three sign-off modes (full session, per block, per exercise)
- RPE tracking, session notes, and client progress
- View assigned templates and AI programs

### Client

- Self-book sessions from trainer availability
- View upcoming and past sessions
- Purchase packages and claim offers
- Track fitness progress and goals

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict) |
| Database & Auth | Supabase (PostgreSQL + Auth + SSR) |
| Styling | Tailwind CSS 3 + Radix UI + shadcn/ui |
| State | Zustand (client) + React Query (server) |
| Forms | React Hook Form + Zod |
| AI | Anthropic Claude (streaming workout generation) |
| Payments | Stripe (Checkout + Connect) |
| Images | Cloudinary |
| Email | Elastic Email |
| Icons | Lucide React |
| Hosting | Netlify |

## Project Structure

```
trainer-aide-demo/
├── app/
│   ├── (auth)/                 # Login, OAuth callback
│   ├── (dashboard)/            # Protected role-based dashboards
│   │   ├── solo/               # Solo practitioner pages
│   │   ├── studio-owner/       # Studio owner pages
│   │   ├── trainer/            # Trainer pages
│   │   ├── client/             # Client pages
│   │   └── settings/           # Profile settings
│   ├── api/                    # ~70 API routes
│   ├── book/[slug]/            # Public booking flow
│   ├── onboarding/             # Role-specific onboarding
│   ├── invite/                 # Staff invitation acceptance
│   └── client-invite/          # Client invitation acceptance
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── shared/                 # Reusable components
│   ├── onboarding/             # Onboarding step components
│   ├── session/                # Session runner UI
│   ├── templates/              # Template builder/list
│   ├── ai-programs/            # AI program management
│   ├── exercise/               # Exercise library
│   ├── providers/              # Auth, Query, Onboarding providers
│   └── layout/                 # Sidebar, navigation
├── lib/
│   ├── services/               # ~35 service modules (business logic)
│   ├── hooks/                  # ~24 React Query hooks
│   ├── stores/                 # Zustand stores (user, timer)
│   ├── types/                  # TypeScript type definitions
│   ├── supabase/               # DB clients (main + images)
│   ├── ai/                     # Anthropic client + prompts
│   ├── stripe/                 # Stripe SDK config
│   ├── permissions/            # Role-based access control
│   ├── notifications/          # Email service + templates
│   └── utils/                  # Helpers (cn, cloudinary, adapters)
├── docs/                       # System documentation
├── middleware.ts               # Auth middleware (route protection)
├── netlify.toml                # Deployment config
└── tailwind.config.ts          # Brand colours + custom theme
```

## Architecture

### Service Layer

Business logic lives in `lib/services/` as standalone async functions. Each returns `Promise<{ data: T | null; error: Error | null }>`. API routes are thin wrappers: auth check, parse input, call service, return response.

### Database

Two Supabase projects:
- **Main** — Auth, profiles, bookings, sessions, templates, credits, invitations, payments
- **Images** — Exercise library media (separate for scaling)

Key table prefixes:
- `ta_` — Trainer Aide (services, bookings, sessions, availability, templates)
- `bs_` — Business (studios, staff)
- `fc_` — Fitness Clients

### Permissions

Eight roles with a permission matrix: `super_admin`, `solo_practitioner`, `studio_owner`, `studio_manager`, `trainer`, `receptionist`, `finance_manager`, `client`. Role-based routing sends each user to their dashboard (`/solo`, `/studio-owner`, `/trainer`, `/client`).

### AI Integration

AI workout programs are generated via Claude with streaming responses. Programs include weekly workouts, exercises, sets/reps, and optional nutrition plans. Programs can be converted to reusable templates.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project with the schema applied
- API keys for: Supabase, Anthropic, Stripe, Cloudinary, Elastic Email, Google OAuth

### Install

```bash
npm install
```

### Environment Variables

Create a `.env.local` with:

```
# Supabase (main)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Supabase (images)
NEXT_PUBLIC_IMAGES_SUPABASE_URL=
NEXT_PUBLIC_IMAGES_SUPABASE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Anthropic (AI)
ANTHROPIC_API_KEY=

# Stripe
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_WEBHOOK_SECRET=

# Email (Elastic Email)
ELASTIC_EMAIL_API_KEY=
EMAIL_FROM=
FROM_NAME=
```

### Run

```bash
npm run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |

## Brand

| Colour | Hex |
|--------|-----|
| Primary Magenta | `#A71075` |
| Blue | `#12229D` |
| Dark Blue | `#0A1466` |
| Cyan | `#B8E6F0` |
| Orange | `#F4B324` |

Typography: Bodoni Moda (display), Montserrat (headings), Lato (body).

## Deployment

Hosted on Netlify with `@netlify/plugin-nextjs`. Serverless function timeout is 60 seconds (Business plan).

## Documentation

Additional documentation is in the `docs/` directory:
- `schema-documentation.md` — Database schema reference
- `SYSTEM-ANALYSIS.md` — Architecture analysis
- `COMPREHENSIVE-SYSTEM-DOCUMENTATION.md` — Full system docs
- `ISSUES-AND-ACTION-ITEMS.md` — Known issues and backlog
