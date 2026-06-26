# Setting up Supabase (real database)

This replaces the old JSON-file storage so price/venue edits actually
persist once you deploy — needed before going live.

## 1. Create a free Supabase project
1. Go to https://supabase.com -> sign up -> "New project"
2. Pick a name (e.g. "zafah") and a database password (save it somewhere)
3. Wait ~2 minutes for it to provision

## 2. Create the tables
1. In your project, go to the SQL Editor (left sidebar)
2. Open `supabase_schema.sql` from this repo, copy all of it
3. Paste into the SQL editor and click "Run"
4. You should see "Success" — this creates the `venues` and `leads` tables

## 3. Get your API keys
1. Go to Project Settings -> API
2. Copy:
   - "Project URL" -> this is `NEXT_PUBLIC_SUPABASE_URL`
   - "anon public" key -> this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> This app uses **no service-role / secret key**. The public client uses the anon
> key (RLS-bound) and admin actions run as the logged-in admin's session JWT. Do
> not add a service-role key — it isn't needed and would be a liability if leaked.

## 4. Add them to your project
1. Copy `.env.example` to a new file named `.env.local`
2. Paste in your real values from step 3, and set `ADMIN_EMAILS` (see `.env.example`
   and `docs/pre-launch-checklist.md` for the full list of variables)
3. Never commit `.env.local` to git (it's already in `.gitignore`)

## 5. Load the placeholder venues (optional, for demo data)
```
npm install
node scripts/seed.mjs
```
This pushes the original 6 placeholder venues into your new database so
the site isn't empty. Skip this if you'd rather start with your own real
venues from day one.

## 6. Run it
```
npm run dev
```
Go to `/admin` -> Venues tab -> click any price -> change it -> Save.
Refresh the page — the new price is now really saved in the database,
not just in memory.

## 7. When you deploy to Vercel
Add the same environment variables in:
Vercel dashboard -> your project -> Settings -> Environment Variables
(Use the exact same names as in `.env.local`.)
