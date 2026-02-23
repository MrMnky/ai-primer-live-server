# AI Primer Live — Project Context

**Created:** 23 February 2026
**Status:** MVP built with auth system, ready for content porting
**Location:** `projects/ai-primer-live/`
**GitHub:** `MrMnky/ai-primer-live` (private repo)
**Netlify:** Connected to GitHub for static frontend deployment
**Supabase:** Connected — handles auth and database (PostgreSQL)

---

## What This Is

An interactive HTML/JS presentation platform that replaces the 171-slide Keynote AI Primer deck with a live, web-based experience. The presenter controls the flow while participants follow along on their phones, answering quizzes, polls, and open-text questions in real time. All responses are captured to a database for post-workshop analysis.

## Why We Built It

The Keynote deck is static. Mike can't collect audience input, run live polls, or adapt based on what the room is thinking. This platform gives the AI Primer interactivity, a mobile-friendly participant experience, and a data trail of every session.

## Architecture Decisions

These decisions were made in the initial planning conversation:

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| **Frontend framework** | Vanilla HTML/CSS/JS | Simple for Claude to generate and iterate. No build step needed. Easy for the team to understand. |
| **Database (local)** | JSON file store (Node.js) | Minimal dependencies, full ownership, zero native compilation issues. Used for local dev. |
| **Database (production)** | Supabase (PostgreSQL) | Hosted PostgreSQL with built-in auth, Row Level Security, magic links. Free tier covers workshop scale. |
| **Authentication** | Supabase Auth | Email/password and magic link login. Role-based: admin, presenter, participant. RLS policies enforce data access. |
| **Real-time sync** | Socket.io (WebSockets) | Essential requirement — presenter drives the experience. Participants follow in lockstep. |
| **Slide authoring** | JSON objects in JS files | Each slide is a plain object: type, theme, title, body, notes, interactive config. Claude generates these directly. |
| **Brand system** | CSS custom properties | Full AIA palette (Gable Green, Turquoise, Dodger Blue, etc.), Poppins typography, WCAG-compliant contrast tiers. |
| **Hosting (static)** | Netlify | Auto-deploys from GitHub. Serves self-paced mode and all static pages. |
| **Hosting (server)** | TBD — Railway or Render | WebSocket server needs a persistent host. Netlify can't do this. |

We explicitly chose NOT to use React, Lovable, or the existing spec in `00-AI-Primer-App-Specification.md` in favour of simplicity and iterability.

## How It Works

### Three Views

1. **Self-paced** (`index.html`) — Individual learner navigates freely. No server needed for this mode.
2. **Presenter** (`presenter.html`) — Creates a session, gets a join code + QR. Shows current slide (high-res), speaker notes, next-slide preview, and live response stream. Controls navigation for all participants.
3. **Participant** (`join.html`) — Enters session code + name. Mobile-first. Follows the presenter's position. Can interact with quizzes, polls, and text inputs.

### Flow

1. Presenter opens `presenter.html` → server creates a session with a 5-character code
2. Participants scan QR or go to `join.html?code=XXXXX`
3. Presenter advances slides → WebSocket pushes state to all participants
4. Interactive slides (quiz, poll, text input) collect responses → stored in `data/store.json` (local) or Supabase (production)
5. Presenter sees responses streaming in real time
6. After the session: `GET /api/sessions/{code}/export` returns all data grouped by slide

### Authentication Modes

- **Local dev** (`CONFIG.LOCAL_DEV = true`): Auth bypassed entirely. A stub admin user is injected. All pages work without Supabase.
- **Production** (`CONFIG.LOCAL_DEV = false`): Full Supabase auth. Users must sign in. Presenters need presenter/admin role. Participants can self-register.

### Slide Definition Format

Each slide is a JS object:

```js
{
  type: 'content',           // cover | content | statement | split | quiz | poll | text-input | video | section
  theme: 'dark',             // dark | light | gradient
  sectionLabel: 'WHAT IS AI',
  title: 'Slide title',
  subtitle: 'Optional',
  body: '<p>HTML content</p>',
  notes: 'Speaker notes for presenter view',
  badge: 'QUICK CHECK',      // turquoise pill badge
  stats: [{ number: '+86%', label: 'Knowledge gain' }],
  callout: { title: '...', body: '...' },
  media: { type: 'image', src: 'assets/photo.jpg', alt: '...' },
  quiz: { question: '...', options: ['A', 'B', 'C', 'D'], correct: 1 },
  poll: { question: '...', options: ['Opt 1', 'Opt 2'] },
  textInput: { prompt: '...', placeholder: '...' },
}
```

To add new slides, create or edit files in `public/slides/`. The demo deck is `ai-primer-demo.js`.

## File Structure

```
projects/ai-primer-live/
├── package.json              # Dependencies: express, socket.io, uuid
├── .gitignore                # node_modules, data/, .DS_Store, *.log
├── PROJECT-CONTEXT.md        # This file
├── SUPABASE-SETUP.md         # Step-by-step Supabase configuration guide
├── server/
│   └── index.js              # Express + Socket.io + JSON store
├── public/
│   ├── index.html            # Self-paced entry point (requires auth in prod)
│   ├── presenter.html        # Presenter view (requires presenter role in prod)
│   ├── join.html             # Participant join screen (requires auth in prod)
│   ├── login.html            # Sign in / create account page
│   ├── styles.css            # Full AIA brand CSS system
│   ├── engine.js             # Slide engine (rendering, nav, interactivity, WebSocket)
│   ├── config.js             # Supabase URL/key + LOCAL_DEV toggle
│   ├── auth.js               # Auth module (wraps Supabase, stubs for local dev)
│   ├── assets/               # Logos, images, videos (drop files here)
│   │   ├── AIA_Logo_White.svg
│   │   └── AIA_Logo_GableGreen.svg
│   └── slides/
│       └── ai-primer-demo.js # Demo slide deck (6 slides)
├── supabase/
│   └── schema.sql            # Full database schema (profiles, sessions, participants, responses, RLS)
└── data/
    └── store.json            # Session + response data (local dev, auto-created)
```

## Running Locally

```bash
cd projects/ai-primer-live
npm install
npm start
# → http://localhost:3000
```

With `LOCAL_DEV: true` in `config.js` (the default), auth is bypassed and everything works immediately.

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `SUPABASE_URL` | `config.js` (frontend) + server env | Supabase project URL |
| `SUPABASE_ANON_KEY` | `config.js` (frontend) | Public anon key (safe to expose) |
| `SUPABASE_SERVICE_KEY` | Server env only | Service role key (secret — never commit) |

## What's Built (MVP)

- Full CSS brand system (AIA palette, Poppins, all component styles)
- Slide engine: renders slides from JSON, handles navigation (keyboard + touch), manages state
- Three interactive component types: quiz (with correct/incorrect feedback), poll (with live bar charts), open text input
- WebSocket-based presenter → participant sync (real-time slide control)
- Presenter view: current slide, speaker notes, next-slide preview, live response stream, participant count
- Participant view: mobile-first, follows presenter, join screen with code + name
- JSON file store for sessions and responses (local dev)
- Supabase auth system: email/password, magic links, role-based access (admin/presenter/participant)
- Supabase database schema with RLS policies (profiles, sessions, session_participants, responses)
- Login page with sign-in / create-account tabs
- LOCAL_DEV mode for zero-config local development
- REST API for session creation, response retrieval, and data export
- 6 demo AI Primer slides covering: cover, statement, stats, quiz, poll, and text input

## What's Next

These are the natural next steps, in priority order:

1. **Port the full AI Primer content** — Convert all 32+ modules from the Keynote into slide definitions. The content exists in `projects/ai-primer/` and `24-WORKSHOP-CONTENT-MODULES.md`.
2. **Deploy server to Railway/Render** — Netlify serves static files but can't run the WebSocket server. Need a Node.js host for live sessions.
3. **Server-side JWT verification** — The server doesn't yet validate Supabase JWT tokens on WebSocket connections. Needed before production use.
4. **Images and video** — Drop media files into `public/assets/` and reference them in slide definitions. The engine already supports `media: { type: 'image' | 'video' | 'iframe', src: '...' }`.
5. **Progressive reveal (build steps)** — The slide format includes a `build` array for stepping through content within a slide. Needs engine support.
6. **Timer/countdown** — For timed activities (e.g. "you have 2 minutes to answer").
7. **Results display slide** — A slide type that shows aggregated poll/quiz results from the session.
8. **Word cloud** — Aggregate text responses into a live word cloud.
9. **QR code generation** — Render the join QR directly (currently uses an external API).

## Relationship to Existing AI Primer

The existing AI Primer materials live in:
- `projects/ai-primer/` — Keynote slides, prototypes, master course document
- `projects/ai-primer/00-AI-Primer-App-Specification.md` — The original React/Supabase/Lovable spec (now superseded by this simpler approach)
- `11-AI-PRIMER-APP.md` — Context file describing the app's purpose and methodology
- `24-WORKSHOP-CONTENT-MODULES.md` — Full content modules, speaker notes, and run orders

This project (`ai-primer-live`) is the replacement build. The content and pedagogy are the same; the delivery platform is new.
