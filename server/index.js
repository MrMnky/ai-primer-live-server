/* ============================================
   AI Primer Live — Server
   Express + Socket.io + Supabase persistence
   ============================================ */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://ai-primer-live.netlify.app,http://localhost:3000').split(',');
const io = new Server(server, { cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] } });

const PORT = process.env.PORT || 3000;

// --- Supabase Client (service role — bypasses RLS) ---
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://vwrwdzdievlmftrfusna.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// --- In-Memory Caches (for real-time performance) ---
// Sessions cache: code -> session object
const sessionCache = {};

// Live participant tracking (socket-based, not persisted)
const liveParticipants = {}; // sessionCode -> [{ id, name, socketId }]

// Response cache for real-time aggregation (rebuilt from DB on startup for active sessions)
const responseCache = {}; // sessionCode -> [{ slideIndex, type, data, participantId, participantName, ... }]

// --- Load active sessions from Supabase on startup ---
async function loadActiveSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .in('status', ['active', 'started', 'paused']);

  if (error) {
    console.error('Failed to load sessions from Supabase:', error.message);
    return;
  }

  if (data) {
    data.forEach(s => {
      sessionCache[s.code] = {
        id: s.id,
        code: s.code,
        title: s.title,
        presenterName: s.presenter_name,
        slideCount: s.slide_count,
        currentSlide: s.current_slide,
        status: s.status,
        createdAt: s.created_at,
        startedAt: s.started_at,
        endedAt: s.ended_at,
      };
      liveParticipants[s.code] = [];
      responseCache[s.code] = [];
    });

    // Load responses for active sessions (for aggregation)
    for (const s of data) {
      const { data: responses } = await supabase
        .from('interactions')
        .select('*')
        .eq('session_code', s.code)
        .in('event_type', ['quiz_answer', 'poll_vote', 'text_response']);

      if (responses) {
        responseCache[s.code] = responses.map(r => ({
          sessionCode: r.session_code,
          slideIndex: r.slide_index,
          type: r.event_type === 'quiz_answer' ? 'quiz' :
                r.event_type === 'poll_vote' ? 'poll' : 'text',
          data: r.event_data,
          participantId: r.participant_id,
          participantName: r.participant_name,
          createdAt: r.created_at,
        }));
      }
    }

    console.log(`Loaded ${data.length} active session(s) from Supabase`);
  }
}

// --- Interaction Logger (async, non-blocking) ---
function logInteraction(sessionCode, eventType, opts = {}) {
  const row = {
    session_code: sessionCode,
    event_type: eventType,
    participant_id: opts.participantId || null,
    participant_name: opts.participantName || null,
    slide_index: opts.slideIndex ?? null,
    event_data: opts.eventData || {},
  };

  // Fire and forget — don't block the socket event
  supabase.from('interactions').insert(row).then(({ error }) => {
    if (error) console.error(`Failed to log ${eventType}:`, error.message);
  });
}

// --- CORS ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- Static Files ---
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), sessions: Object.keys(sessionCache).length });
});

// --- Session Code Generator ---
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// --- API Routes ---

// List all sessions (newest first)
app.get('/api/sessions', async (req, res) => {
  const status = req.query.status;

  // Fetch from Supabase (includes ended sessions too)
  let query = supabase.from('sessions').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data || []).map(s => ({
    id: s.id,
    code: s.code,
    title: s.title,
    presenterName: s.presenter_name,
    slideCount: s.slide_count,
    currentSlide: s.current_slide,
    status: s.status,
    createdAt: s.created_at,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    participantCount: (liveParticipants[s.code] || []).length,
  })));
});

// Create session
app.post('/api/sessions', async (req, res) => {
  const { title, presenterName, slideCount } = req.body;
  let code = generateCode();
  while (sessionCache[code]) code = generateCode();

  const session = {
    id: uuidv4(),
    code,
    title: title || 'AI Primer',
    presenter_name: presenterName || 'Presenter',
    slide_count: slideCount || 0,
    current_slide: 0,
    status: 'active',
  };

  const { error } = await supabase.from('sessions').insert(session);
  if (error) return res.status(500).json({ error: error.message });

  // Update cache
  sessionCache[code] = {
    id: session.id,
    code,
    title: session.title,
    presenterName: session.presenter_name,
    slideCount: session.slide_count,
    currentSlide: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  liveParticipants[code] = [];
  responseCache[code] = [];

  logInteraction(code, 'session_created', {
    eventData: { title: session.title, presenterName: session.presenter_name },
  });

  res.json({ id: session.id, code });
});

// Get session
app.get('/api/sessions/:code', (req, res) => {
  const session = sessionCache[req.params.code];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  res.json({
    ...session,
    participants: (liveParticipants[req.params.code] || []).map(p => ({ id: p.id, name: p.name })),
  });
});

// Get all responses for a session (from Supabase)
app.get('/api/sessions/:code/responses', async (req, res) => {
  const session = sessionCache[req.params.code];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('session_code', req.params.code)
    .in('event_type', ['quiz_answer', 'poll_vote', 'text_response'])
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// Get responses for a specific slide
app.get('/api/sessions/:code/responses/:slideIndex', async (req, res) => {
  const session = sessionCache[req.params.code];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const slideIndex = parseInt(req.params.slideIndex);
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('session_code', req.params.code)
    .eq('slide_index', slideIndex)
    .in('event_type', ['quiz_answer', 'poll_vote', 'text_response'])
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// Export session data (full event log for post-workshop analysis)
app.get('/api/sessions/:code/export', async (req, res) => {
  const session = sessionCache[req.params.code];
  if (!session) {
    // Try Supabase directly (may be an old ended session not in cache)
    const { data: s } = await supabase.from('sessions').select('*').eq('code', req.params.code).single();
    if (!s) return res.status(404).json({ error: 'Session not found' });
  }

  const { data: interactions, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('session_code', req.params.code)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Group responses by slide
  const responsesBySlide = {};
  const responses = (interactions || []).filter(i =>
    ['quiz_answer', 'poll_vote', 'text_response'].includes(i.event_type)
  );
  responses.forEach(r => {
    if (!responsesBySlide[r.slide_index]) responsesBySlide[r.slide_index] = [];
    responsesBySlide[r.slide_index].push(r);
  });

  // Session timeline (all events)
  const timeline = (interactions || []).map(i => ({
    time: i.created_at,
    event: i.event_type,
    participant: i.participant_name,
    slide: i.slide_index,
    data: i.event_data,
  }));

  res.json({
    session: session || { code: req.params.code },
    totalInteractions: (interactions || []).length,
    totalResponses: responses.length,
    responsesBySlide,
    timeline,
  });
});

// --- Socket.io ---
io.on('connection', (socket) => {
  const { sessionCode, mode, participantName, participantId } = socket.handshake.query;

  if (!sessionCode || !sessionCache[sessionCode]) {
    socket.emit('error', { message: 'Session not found' });
    socket.disconnect();
    return;
  }

  socket.join(sessionCode);

  if (mode === 'presenter') {
    socket.join(`${sessionCode}:presenter`);
    console.log(`Presenter connected: ${sessionCode}`);

    // Send current session state so presenter can resume
    socket.emit('session-state', {
      currentSlide: sessionCache[sessionCode].currentSlide,
      status: sessionCache[sessionCode].status,
      participants: (liveParticipants[sessionCode] || []).map(p => ({ id: p.id, name: p.name })),
    });
  }

  if (mode === 'participant') {
    const pId = participantId || uuidv4();
    const participant = { id: pId, name: participantName || 'Anonymous', socketId: socket.id };

    if (!liveParticipants[sessionCode]) liveParticipants[sessionCode] = [];
    liveParticipants[sessionCode].push(participant);

    // Send current slide
    socket.emit('slide-change', { slideIndex: sessionCache[sessionCode].currentSlide });

    // Notify presenter
    io.to(`${sessionCode}:presenter`).emit('participant-joined', {
      participantName: participant.name,
      participants: liveParticipants[sessionCode].map(p => ({ id: p.id, name: p.name })),
    });

    // Log interaction
    logInteraction(sessionCode, 'participant_joined', {
      participantId: pId,
      participantName: participant.name,
    });

    console.log(`"${participant.name}" joined ${sessionCode} (${liveParticipants[sessionCode].length} total)`);
  }

  // Presenter starts session (releases lobby)
  socket.on('session-start', () => {
    if (mode !== 'presenter') return;
    sessionCache[sessionCode].status = 'started';
    sessionCache[sessionCode].startedAt = new Date().toISOString();

    supabase.from('sessions')
      .update({ status: 'started', started_at: sessionCache[sessionCode].startedAt })
      .eq('code', sessionCode).then(({ error }) => {
        if (error) console.error('Failed to update session status:', error.message);
      });

    logInteraction(sessionCode, 'session_started');
    io.to(sessionCode).emit('session-start');
    console.log(`Session ${sessionCode} started by presenter`);
  });

  // Presenter pauses session
  socket.on('session-pause', () => {
    if (mode !== 'presenter') return;
    sessionCache[sessionCode].status = 'paused';

    supabase.from('sessions').update({ status: 'paused' }).eq('code', sessionCode).then(({ error }) => {
      if (error) console.error('Failed to update session status:', error.message);
    });

    logInteraction(sessionCode, 'session_paused');
    io.to(sessionCode).emit('session-pause');
    console.log(`Session ${sessionCode} paused`);
  });

  // Presenter resumes session
  socket.on('session-resume', () => {
    if (mode !== 'presenter') return;
    sessionCache[sessionCode].status = 'started';

    supabase.from('sessions').update({ status: 'started' }).eq('code', sessionCode).then(({ error }) => {
      if (error) console.error('Failed to update session status:', error.message);
    });

    logInteraction(sessionCode, 'session_resumed');
    io.to(sessionCode).emit('session-resume');
    console.log(`Session ${sessionCode} resumed`);
  });

  // Presenter ends session
  socket.on('session-end', () => {
    if (mode !== 'presenter') return;
    sessionCache[sessionCode].status = 'ended';
    sessionCache[sessionCode].endedAt = new Date().toISOString();

    supabase.from('sessions')
      .update({ status: 'ended', ended_at: sessionCache[sessionCode].endedAt })
      .eq('code', sessionCode).then(({ error }) => {
        if (error) console.error('Failed to update session status:', error.message);
      });

    logInteraction(sessionCode, 'session_ended');
    io.to(sessionCode).emit('session-end');
    console.log(`Session ${sessionCode} ended`);
  });

  // Presenter changes slide
  socket.on('slide-change', (data) => {
    if (mode !== 'presenter') return;
    sessionCache[sessionCode].currentSlide = data.slideIndex;

    supabase.from('sessions').update({ current_slide: data.slideIndex }).eq('code', sessionCode).then(({ error }) => {
      if (error) console.error('Failed to update current slide:', error.message);
    });

    logInteraction(sessionCode, 'slide_change', {
      slideIndex: data.slideIndex,
      eventData: { from: sessionCache[sessionCode].currentSlide, to: data.slideIndex },
    });

    socket.to(sessionCode).emit('slide-change', data);
  });

  // Response from participant
  socket.on('response', (data) => {
    // Map to event type for Supabase
    const eventTypeMap = { quiz: 'quiz_answer', poll: 'poll_vote', text: 'text_response' };
    const eventType = eventTypeMap[data.type] || data.type;

    // Log to Supabase
    logInteraction(sessionCode, eventType, {
      participantId: data.participantId,
      participantName: data.participantName,
      slideIndex: data.slideIndex,
      eventData: data.data,
    });

    // Cache for real-time aggregation
    const cached = {
      sessionCode,
      slideIndex: data.slideIndex,
      type: data.type,
      data: data.data,
      participantId: data.participantId,
      participantName: data.participantName,
      createdAt: new Date().toISOString(),
    };
    if (!responseCache[sessionCode]) responseCache[sessionCode] = [];
    responseCache[sessionCode].push(cached);

    // Forward to presenter
    io.to(`${sessionCode}:presenter`).emit('response', data);

    // Poll aggregation
    if (data.type === 'poll') {
      const pollResponses = responseCache[sessionCode].filter(
        r => r.slideIndex === data.slideIndex && r.type === 'poll'
      );

      const counts = {};
      pollResponses.forEach(r => {
        counts[r.data.option] = (counts[r.data.option] || 0) + 1;
      });

      const maxOpt = Math.max(...Object.keys(counts).map(Number), 0);
      const options = [];
      for (let i = 0; i <= maxOpt; i++) options.push(counts[i] || 0);

      io.to(sessionCode).emit('poll-update', {
        slideIndex: data.slideIndex,
        results: { options, total: pollResponses.length },
      });
    }

    // Quiz aggregation
    if (data.type === 'quiz') {
      const quizResponses = responseCache[sessionCode].filter(
        r => r.slideIndex === data.slideIndex && r.type === 'quiz'
      );

      const counts = {};
      quizResponses.forEach(r => {
        counts[r.data.option] = (counts[r.data.option] || 0) + 1;
      });

      const maxOpt = Math.max(...Object.keys(counts).map(Number), 0);
      const options = [];
      for (let i = 0; i <= maxOpt; i++) options.push(counts[i] || 0);

      io.to(sessionCode).emit('quiz-update', {
        slideIndex: data.slideIndex,
        results: { options, total: quizResponses.length },
      });
    }

    // Text aggregation
    if (data.type === 'text') {
      const textResponses = responseCache[sessionCode].filter(
        r => r.slideIndex === data.slideIndex && r.type === 'text'
      );

      const wordCounts = {};
      const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','can','could','and','but','or','nor','for','yet','so','in','on','at','to','of','by','with','from','up','out','it','its','i','we','they','you','he','she','my','our','their','your','his','her','this','that','these','those','not','no','all','each','every','both','few','more','most','other','some','such','than','too','very']);

      textResponses.forEach(r => {
        const text = (r.data.text || '').toLowerCase().replace(/[^a-z0-9\s'-]/g, '');
        text.split(/\s+/).forEach(w => {
          if (w.length > 2 && !stopWords.has(w)) {
            wordCounts[w] = (wordCounts[w] || 0) + 1;
          }
        });
      });

      const words = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([word, count]) => ({ word, count }));

      const texts = textResponses.map(r => ({
        name: r.participantName || 'Anonymous',
        text: r.data.text || '',
      }));

      io.to(sessionCode).emit('text-update', {
        slideIndex: data.slideIndex,
        results: { words, texts, total: textResponses.length },
      });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (mode === 'participant' && liveParticipants[sessionCode]) {
      liveParticipants[sessionCode] = liveParticipants[sessionCode].filter(p => p.socketId !== socket.id);

      logInteraction(sessionCode, 'participant_left', {
        participantId: participantId,
        participantName: participantName,
      });

      io.to(`${sessionCode}:presenter`).emit('participant-left', {
        participants: liveParticipants[sessionCode].map(p => ({ id: p.id, name: p.name })),
      });
    }
  });
});

// --- Start ---
async function start() {
  await loadActiveSessions();

  server.listen(PORT, () => {
    console.log(`\n  AI Primer Live running on http://localhost:${PORT}\n`);
    console.log(`  Self-paced:   http://localhost:${PORT}/`);
    console.log(`  Presenter:    http://localhost:${PORT}/presenter.html`);
    console.log(`  Participant:  http://localhost:${PORT}/join.html\n`);
  });
}

start();
