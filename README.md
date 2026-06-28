# Sarayah — سرايا — Wedding & Event Venue Finder (Egypt)

Sarayah (سرايا) is a wedding and event venue finder/marketplace for the Egyptian
market: couples browse and filter venues, send a booking inquiry, and venue
owners list their space for free. It includes Supabase auth, an admin dashboard,
real image uploads, lead capture with email notifications, and an AI search
assistant (Claude with an offline keyword fallback).

## Venue model

Each venue has: name, type (Hotel/Hall/Garden/Villa/Rooftop/Restaurant), city +
area, indoor/outdoor, capacity (min/max guests), number of halls, venue size,
starting price, amenities (catering, parking, bridal room, DJ, decoration, kids
area, AC, valet), suitable-for tags, rating, and photos.

## Pages

- `/` — Home page with hero, AI search bar, featured venues, CTA for venue owners
- `/venues` — Listing page with filters (city, type, capacity, budget, amenities, setting)
- `/venues/[id]` — Venue details page with gallery, amenities, and lead-capture form
- `/search` — AI search assistant (natural language to filters)
- `/add-venue` — Add venue form for venue owners
- `/admin` — Admin dashboard (leads + venues tables)
- `/login`, `/signup` — Placeholder auth pages (not wired to a real backend yet)

## How the "AI search" works right now

`src/lib/aiSearch.js` parses natural language ("outdoor wedding in New Cairo
for 300 people with catering and parking") into structured filters using
pattern matching, no API key needed, works offline. There's a commented
upgrade path at the bottom of that file showing how to swap it for a real
Claude API call later, once you want smarter parsing.

## Data storage (MVP-level)

There's no real database yet, venues live in `src/data/venues.json` and
leads get written to `src/data/leads.json` via simple API routes
(`src/app/api/venues`, `src/app/api/leads`). This is enough to demo the full
flow (browse, inquire, see it in admin) and easy to swap for a real
database (Postgres/Supabase/MongoDB) later without changing the page code,
just rewrite the functions in `src/lib/data.js`.

## Running locally

```
npm install
npm run dev
```

Open http://localhost:3000

To test the full lead flow:
1. Go to /venues, open a venue, fill in the inquiry form, submit
2. Go to /admin -> "Leads" tab, you'll see it appear there

To test adding a venue:
1. Go to /add-venue, fill the form, submit
2. It immediately appears on /venues and in /admin -> "Venues"

## What's deliberately NOT built yet (next steps)

- Real authentication (login/signup are placeholder UI only)
- A real database (currently JSON files, fine for a demo, not for production load)
- Image upload (venues use stock photo URLs, swap for real uploads via Cloudinary/S3 when ready)
- Payment/subscription billing for the future VIP tier
- The smarter LLM-powered search (the rule-based parser is good enough to demo "AI search" convincingly)

## Tech stack

Next.js (App Router) + React + Tailwind CSS v4. Single repo, no separate
backend needed for the MVP, API routes inside `src/app/api/*` act as the
backend.

## Run locally

1. Open a terminal and change into the project folder:

```
cd venuefinder
```

2. Install dependencies and start the dev server:

```
npm install
npm run dev
```

Open http://localhost:3000

Note: this project uses Supabase if you provide env vars; otherwise it will fall back to the local seed data in `src/data/venues_seed.json` for offline development.

## Environment variables

Copy `.env.example` to `.env.local` and fill these values from your Supabase project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ADMIN_EMAILS` (comma-separated admin emails; also add each to the `admins` table)

This app uses **no service-role / secret key**. The public client uses the anon key
(RLS-bound) and admin actions run as the logged-in admin's session JWT. See
`.env.example` and `docs/pre-launch-checklist.md` for the full (optional) variable list.

If you do not set these, the app will use the local seed data and an in-memory leads store.

## Deploying to Vercel

1. Create a Vercel account and connect the Git repository (or import the project folder).
2. In Vercel project settings, set the Environment Variables listed above (use the same keys as `.env.local`).
3. Set the root path to the repository root (the project already contains `package.json` at `venuefinder/package.json`). Vercel will detect Next.js automatically.
4. Deploy — Vercel runs `npm install` and `npm run build` by default.

The app should be available at the Vercel URL after deployment.

## Supabase setup

1. Create a new project in Supabase (https://app.supabase.com).
2. Open the Project -> SQL Editor -> New query.
3. Paste the SQL from `supabase_schema.sql` (this file already exists in the repo) and run it to create the `venues` and `leads` tables and RLS policies.

If you'd rather paste manually, the full SQL is in `supabase_schema.sql` in the repo root.

