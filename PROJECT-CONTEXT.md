# AI Primer Live — Project Context

**Created:** 23 February 2026
**Last updated:** 27 February 2026
**Status:** Full slide content ported, auth working, presenter dashboard built, WebSocket server needs hosting
**GitHub (org):** `AI-Accelerator-Ltd/AI-Primer-Live`
**GitHub (personal):** `MrMnky/AI-Primer-Live` (mirror — kept in sync)
**Netlify:** `ai-primer-live.netlify.app` — auto-deploys from GitHub (static frontend)
**Supabase:** `vwrwdzdievlmftrfusna.supabase.co` — handles auth (PostgreSQL)
**Railway:** Needs fresh deployment (see Deployment section below)

---

## What This Is

An interactive HTML/JS presentation platform that replaces the 171-slide Keynote AI Primer deck with a live, web-based experience. The presenter controls the flow while participants follow along on their phones, answering quizzes, polls, and open-text questions in real time. All responses are captured for post-workshop analysis.

## Why We Built It

The Keynote deck is static. Mike can't collect audience input, run live polls, or adapt based on what the room is thinking. This platform gives the AI Primer interactivity, a mobile-friendly participant experience, and a data trail of every session.

---

## Architecture

| Component | Choice | Notes |
|-----------|--------|-------|
| **Frontend** | Vanilla HTML/CSS/JS | No build step. Static files served by Netlify. |
| **Server** | Express + Socket.IO (Node.js) | Handles WebSocket sync, REST API, JSON file store. |
| **Auth** | Supabase Auth | Email/password login. Role-based: admin, presenter, participant. |
| **Database** | JSON file store (server-side) | `data/store.json` — sessions and responses. Simple, no external DB needed for session data. |
| **Hosting (static)** | Netlify | Auto-deploys from GitHub. Serves all HTML/CSS/JS. |
| **Hosting (server)** | Railway (TBD) | WebSocket server needs a Node.js host. See deployment section. |
| **Real-time sync** | Socket.IO | Presenter drives slides. Participants follow in lockstep. |
| **Slide format** | JSON objects in JS files | Each slide is a plain object with type, theme, content, interactivity config. |
| **Brand system** | CSS custom properties | AIA palette (Gable Green, Turquoise, Dodger Blue), Poppins font, WCAG contrast tiers. |

---

## How It Works

### Four Views

1. **Self-paced** (`app.html`) — Individual learner navigates freely through all slides. No server connection needed.
2. **Presenter Dashboard** (`presenter.html`) — Lists all sessions. Create new sessions, resume paused ones, export ended ones. Gateway to the presentation view.
3. **Presenter View** (launched from dashboard) — Shows slides full-screen with a "Pause & Exit" button. Controls navigation for all connected participants.
4. **Participant** (`join.html`) — Enter session code + name. Mobile-first. Follows the presenter's slides. Can interact with quizzes, polls, and text inputs.

### Session Lifecycle

```
active → started → paused → started → ended
  │         │         │         │         │
  │         │         │         │         └─ Session over. Export data.
  │         │         │         └─ Presenter resumed from dashboard.
  │         │         └─ Presenter clicked "Pause & Exit".
  │         └─ Presenter clicked "Start Presentation".
  └─ Session created, waiting for participants.
```

### Flow

1. Presenter opens `presenter.html` → sees the **Dashboard** listing all sessions
2. Clicks **"+ New Session"** → server creates a session with a 5-character code
3. **Setup screen** shows the code, QR, and live participant count
4. Participants scan QR or go to `join.html?code=XXXXX` → enter name → see a **lobby screen** ("You're in! Waiting for presenter...")
5. Presenter clicks **"Start Presentation"** → lobby clears, slides begin
6. Presenter advances slides → WebSocket pushes state to all participants
7. Interactive slides (quiz, poll, text input) collect responses in real time
8. Presenter clicks **"⏸ Pause & Exit"** → participants see "Presenter has paused" overlay → presenter returns to dashboard
9. Presenter clicks **"Resume"** on dashboard → drops back into slides at the same position, participants' overlay clears
10. After the session: click **"Export"** on dashboard to download all response data as JSON

### Authentication

- **Presenters** must sign in with an admin or presenter role (Supabase Auth)
- **Participants** do NOT need accounts — they just enter a name and session code
- **Self-paced** (`app.html`) requires sign-in
- **Login page** is `index.html` (the root)

### Participant Experience

- Join page is mobile-first
- Auth is optional — if logged in, name pre-fills from profile
- Lobby screen with pulsing dot while waiting for presenter
- Overlays for pause ("Sit tight"), resume (overlay clears), and end ("Thank you")
- Cannot navigate slides independently — follows presenter

---

## Slide Content

All 7 sections of the AI Primer have been ported from Keynote to slide definitions:

| File | Section | Slides |
|------|---------|--------|
| `section-1-foundation.js` | Foundation & Welcome | Cover, intro, ground rules, agenda |
| `section-2-what-is-ai.js` | What Is AI? | AI definition, capabilities, fluency levels, industry adoption |
| `section-3-ai-risks.js` | AI Risks & Guardrails | Hallucinations, bias, data privacy, deepfakes, risk radar |
| `section-4-how-ai-works.js` | How AI Works | Neural networks, training, tokens, text completion, model types |
| `section-5-prompting.js` | Prompting Foundations | Prompt anatomy, frameworks (4Ds, CO-STAR), tips, practice |
| `section-6-applying-ai.js` | Applying AI at Work | Delegation mindset, use cases, 3 horizons, action planning |
| `section-7-close.js` | Close | Summary, resources, Q&A |
| `all-slides.js` | Combined | `AI_PRIMER_SLIDES` array — all sections concatenated |
| `standard-slides.js` | Utilities | Reusable slides (break, Q&A, transition) |
| `ai-primer-demo.js` | Demo | 6-slide demo deck for testing |

### Interactive Components

Each slide can include one interactive element:

- **Quiz** — Multiple choice with correct answer reveal. Results aggregated across participants.
- **Poll** — Multiple choice, no correct answer. Live bar chart updates.
- **Text Input** — Open text responses. Word cloud generation + response wall.

### Embedded Interactives

Self-contained HTML files in `public/interactives/` for workshop activities:

| File | Purpose |
|------|---------|
| `capabilities-explorer.html` | Explore AI capabilities by category |
| `fluency-levels.html` | Self-assess AI fluency level |
| `four-ds.html` | 4Ds prompting framework interactive |
| `risk-radar.html` | AI risk assessment tool |
| `text-completion.html` | Demonstrate how LLMs predict next tokens |

---

## File Structure

```
AI-Primer-Live/
├── package.json              # Dependencies: express, socket.io, uuid
├── package-lock.json
├── Procfile                  # Railway: web: node server/index.js
├── netlify.toml              # Netlify build config (publish: public)
├── .gitignore                # node_modules, data/, .DS_Store, *.log
├── PROJECT-CONTEXT.md        # This file
├── SUPABASE-SETUP.md         # Supabase configuration guide
├── server/
│   └── index.js              # Express + Socket.IO + JSON store + REST API
├── public/
│   ├── index.html            # Login / sign-in page (root)
│   ├── app.html              # Self-paced slide viewer (requires auth)
│   ├── presenter.html        # Presenter dashboard + presentation view
│   ├── join.html             # Participant join + lobby + session overlays
│   ├── styles.css            # Full AIA brand CSS system
│   ├── engine.js             # Slide engine (rendering, nav, WebSocket, interactivity)
│   ├── config.js             # Supabase keys, SERVER_URL, LOCAL_DEV toggle
│   ├── auth.js               # Auth module (wraps Supabase, role checks)
│   ├── assets/
│   │   ├── AIA_Logo_White.svg
│   │   └── AIA_Logo_GableGreen.svg
│   ├── slides/
│   │   ├── section-1-foundation.js
│   │   ├── section-2-what-is-ai.js
│   │   ├── section-3-ai-risks.js
│   │   ├── section-4-how-ai-works.js
│   │   ├── section-5-prompting.js
│   │   ├── section-6-applying-ai.js
│   │   ├── section-7-close.js
│   │   ├── all-slides.js       # Combined slide array (AI_PRIMER_SLIDES)
│   │   ├── standard-slides.js  # Reusable utility slides
│   │   └── ai-primer-demo.js   # Demo deck (6 slides)
│   └── interactives/
│       ├── capabilities-explorer.html
│       ├── fluency-levels.html
│       ├── four-ds.html
│       ├── risk-radar.html
│       └── text-completion.html
├── supabase/
│   └── schema.sql              # Database tables, RLS policies
└── data/
    └── store.json              # Session + response data (auto-created, not committed)
```

---

## Server API

### REST Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/sessions` | List all sessions (optional `?status=` filter) |
| `POST` | `/api/sessions` | Create a new session |
| `GET` | `/api/sessions/:code` | Get session details + participants |
| `GET` | `/api/sessions/:code/responses` | Get all responses for a session |
| `GET` | `/api/sessions/:code/responses/:slideIndex` | Get responses for a specific slide |
| `GET` | `/api/sessions/:code/export` | Export all session data (grouped by slide) |

### WebSocket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `session-start` | Presenter → Server → All | Releases participant lobby |
| `session-pause` | Presenter → Server → All | Pauses session, shows participant overlay |
| `session-resume` | Presenter → Server → All | Resumes session, clears overlay |
| `session-end` | Presenter → Server → All | Ends session permanently |
| `session-state` | Server → Presenter | Reconnection state (currentSlide, status, participants) |
| `slide-change` | Presenter → Server → Participants | Sync slide position |
| `participant-joined` | Server → Presenter | New participant notification + count |
| `participant-left` | Server → Presenter | Participant disconnected + count |
| `response` | Participant → Server → Presenter | Quiz/poll/text response |
| `poll-update` | Server → All | Aggregated poll results |
| `quiz-update` | Server → All | Aggregated quiz results |
| `text-update` | Server → All | Aggregated text responses + word cloud |

---

## Deployment

### Netlify (Frontend — Working)

- **URL:** `ai-primer-live.netlify.app`
- Auto-deploys from `AI-Accelerator-Ltd/AI-Primer-Live` main branch
- Serves everything in `public/`
- No build step — static files only

### Railway (WebSocket Server — Not Yet Working)

The WebSocket server needs a Node.js host. Railway was chosen but we hit GitHub org permission issues. The server has been fully tested locally.

**What needs to happen:**

1. Create a new Railway service connected to a GitHub repo Railway can access
2. Set environment variable: `ALLOWED_ORIGINS` = `https://ai-primer-live.netlify.app`
3. Generate a public domain (`.up.railway.app`)
4. Update `CONFIG.SERVER_URL` in `public/config.js` with the new Railway URL
5. Push and verify `/api/health` returns `{"status":"ok",...}`
6. Verify `/api/sessions` returns `[]`

**Previous Railway URL** (now deleted): `ai-primer-live-production.up.railway.app`

**Known issue:** Railway's GitHub app couldn't deploy from `AI-Accelerator-Ltd` org repo despite correct permissions. Options:
- Deploy from `MrMnky/AI-Primer-Live` (personal mirror) instead
- Try Render.com as an alternative
- Use Railway CLI to deploy without GitHub integration

**Server configuration:**
- `Procfile`: `web: node server/index.js`
- Node.js >=18
- Port: reads from `PORT` env var (Railway sets this automatically)
- CORS: reads from `ALLOWED_ORIGINS` env var (comma-separated)

---

## Credentials & Services

| Service | Detail |
|---------|--------|
| **Supabase URL** | `https://vwrwdzdievlmftrfusna.supabase.co` |
| **Supabase anon key** | In `public/config.js` |
| **GitHub org repo** | `AI-Accelerator-Ltd/AI-Primer-Live` |
| **GitHub personal repo** | `MrMnky/AI-Primer-Live` (mirror) |
| **Netlify site** | `ai-primer-live.netlify.app` |
| **Railway** | Needs fresh setup (see Deployment section) |

---

## Running Locally

```bash
cd AI-Primer-Live
npm install
npm start
# → http://localhost:3000
```

Set `LOCAL_DEV: true` in `config.js` to bypass auth. Set `SERVER_URL: ''` (empty string) to use local server.

---

## What's Built

- Full CSS brand system (AIA palette, Poppins, WCAG contrast tiers)
- Slide engine: renders slides from JSON, keyboard + touch navigation, presenter/participant/self-paced modes
- All 7 sections of AI Primer content ported to slide definitions
- Three interactive types: quiz, poll, open text — all with live aggregation
- WebSocket presenter → participant sync (real-time slide control)
- Presenter dashboard: session listing, create/resume/pause/end/export
- Participant lobby screen (waiting for presenter to start)
- Participant session overlays (pause, resume, end states)
- Presenter reconnection (resume mid-session from dashboard)
- Supabase auth: email/password, role-based access (admin/presenter/participant)
- Participants don't need accounts — just name + session code
- Self-paced mode for individual learners
- REST API for sessions, responses, and data export
- JSON file store persistence
- 5 embedded interactive HTML activities
- QR code generation for session join links

## What's Next

1. **Deploy the server** — Railway or alternative. This is the immediate blocker for live use.
2. **Images and video** — Add media to slides. The engine supports `media: { type: 'image' | 'video', src: '...' }` but no assets have been added yet.
3. **Progressive reveal (build steps)** — Step through content within a slide. Format supports `build` arrays but the engine doesn't process them yet.
4. **Timer/countdown** — For timed activities.
5. **Results display slide** — Show aggregated poll/quiz results as a dedicated slide type.
6. **Server-side JWT verification** — Validate Supabase tokens on WebSocket connections before production use.
7. **Admin panel** — Manage presenter accounts without editing Supabase directly.

---

## Relationship to Existing AI Primer

The existing materials live in:
- `projects/ai-primer/` — Keynote slides, prototypes, master course document
- `projects/ai-primer/00-AI-Primer-App-Specification.md` — Original React/Supabase/Lovable spec (superseded)
- `11-AI-PRIMER-APP.md` — Context file describing the app's purpose
- `24-WORKSHOP-CONTENT-MODULES.md` — Full content modules, speaker notes, run orders

This project (`AI-Primer-Live`) is the replacement build. Same content and pedagogy, new delivery platform.
