# Supabase Setup Guide

**Time required:** 10 minutes

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account)
2. Click **New Project**
3. Name it `ai-primer-live`
4. Set a strong database password (save it somewhere safe)
5. Choose the region closest to your users (London: `eu-west-2`)
6. Click **Create new project** and wait for it to provision (~2 minutes)

## Step 2: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open `supabase/schema.sql` from this project
4. Paste the entire contents into the SQL editor
5. Click **Run**
6. You should see "Success. No rows returned" — that's correct

This creates four tables (profiles, sessions, session_participants, responses) with Row Level Security policies.

## Step 3: Get Your Keys

1. Go to **Settings** → **API** in the Supabase dashboard
2. Copy these two values:
   - **Project URL** (looks like `https://abcdef.supabase.co`)
   - **anon / public** key (starts with `eyJhbGc...`)

## Step 4: Configure the Frontend

Open `public/config.js` and replace the placeholder values:

```js
const CONFIG = {
  SUPABASE_URL: 'https://your-actual-project.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGc...your-actual-anon-key',
};
```

**Note:** The anon key is safe to include in frontend code. It's locked down by Row Level Security — users can only access what the RLS policies allow.

## Step 5: Configure Auth Settings

In the Supabase dashboard:

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Optionally enable **Magic Link** (passwordless login)

**Email templates** (optional but recommended):
1. Go to **Authentication** → **Email Templates**
2. Customise the confirmation email with your AIA branding

**Redirect URLs:**
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your Netlify URL (e.g. `https://ai-primer-live.netlify.app`)
3. Add redirect URLs for both local dev and production:
   - `http://localhost:3000`
   - `https://ai-primer-live.netlify.app`
   - `https://your-railway-url.railway.app` (once deployed)

## Step 6: Create Your First Presenter Account

1. Go to your deployed site (or `http://localhost:3000/login.html`)
2. Create an account using the **Create Account** tab
3. Confirm your email
4. Now promote yourself to presenter in Supabase:
   - Go to **Table Editor** → **profiles**
   - Find your row
   - Change `role` from `participant` to `admin`
   - Click **Save**

You now have full presenter access.

## Step 7: Environment Variables for Server (Railway/Render)

When deploying the Node.js server, set these environment variables:

| Variable | Where to find it | Used for |
|----------|-----------------|----------|
| `PORT` | Set to `3000` (or let Railway auto-assign) | Server port |
| `SUPABASE_URL` | Supabase → Settings → API | Server-side DB access |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → `service_role` key | Server-side auth (bypasses RLS) |

**Warning:** The `service_role` key is SECRET. Never expose it in frontend code or commit it to git.

## Step 8: Netlify Environment Variables

In your Netlify project settings:

1. Go to **Site settings** → **Environment variables**
2. Add:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_ANON_KEY` = your anon key

These aren't used directly (since config.js is static), but they're useful if you later add a build step.

---

## How Auth Works

| User type | How they access | What they can do |
|-----------|----------------|-----------------|
| **Admin** | Email + password login | Create sessions, present, view all data |
| **Presenter** | Email + password login | Create sessions, present |
| **Participant** | Email + password OR magic link | Join sessions, submit responses |

- All pages require authentication (redirect to `/login.html` if not logged in)
- Presenter pages additionally check for `presenter` or `admin` role
- Participant name auto-fills from their profile
- Session code + QR still work, but participants must be logged in first

## Role Management

To promote a user to presenter:
1. Go to Supabase → **Table Editor** → **profiles**
2. Find the user by email
3. Change `role` to `presenter` (or `admin`)

To do this programmatically in future, we can build an admin panel.

---

## File Reference

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Database tables, functions, RLS policies |
| `public/config.js` | Supabase URL + anon key (edit this) |
| `public/auth.js` | Auth module (login, signup, role checks, guards) |
| `public/login.html` | Sign in / create account page |
