/* ============================================
   AI Primer Live — Server
   Express + Socket.io + JSON file store
   ============================================ */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://ai-primer-live.netlify.app,http://localhost:3000').split(',');
const io = new Server(server, { cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] } });

const PORT = process.env.PORT || 3000;

// --- CORS (allow Netlify frontend to call this server) ---
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

// --- JSON File Store ---
const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

function loadStore() {
  const file = path.join(DATA_DIR, 'store.json');
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return { sessions: {}, responses: [] };
}

function saveStore(store) {
  fs.writeFileSync(path.join(DATA_DIR, 'store.json'), JSON.stringify(store, null, 2));
}

// In-memory store (persisted to disk on changes)
let store = loadStore();

// Live participant tracking (not persisted — socket-based)
const liveParticipants = {}; // sessionCode -> [{ id, name, socketId }]

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Session Code Generator ---
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// --- API Routes ---

// Create session
app.post('/api/sessions', (req, res) => {
  const { title, presenterName, slideCount } = req.body;
  let code = generateCode();
  while (store.sessions[code]) code = generateCode();

  store.sessions[code] = {
    id: uuidv4(),
    code,
    title: title || 'AI Primer',
    presenterName: presenterName || 'Presenter',
    slideCount: slideCount || 0,
    currentSlide: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  saveStore(store);
  liveParticipants[code] = [];

  res.json({ id: store.sessions[code].id, code });
});

// Get session
app.get('/api/sessions/:code', (req, res) => {
  const session = store.sessions[req.params.code];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  res.json({
    ...session,
    participants: (liveParticipants[req.params.code] || []).map(p => ({ id: p.id, name: p.name })),
  });
});

// Get all responses for a session
app.get('/api/sessions/:code/responses', (req, res) => {
  const session = store.sessions[req.params.code];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const responses = store.responses.filter(r => r.sessionCode === req.params.code);
  res.json(responses);
});

// Get responses for a specific slide
app.get('/api/sessions/:code/responses/:slideIndex', (req, res) => {
  const session = store.sessions[req.params.code];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const slideIndex = parseInt(req.params.slideIndex);
  const responses = store.responses.filter(r => r.sessionCode === req.params.code && r.slideIndex === slideIndex);
  res.json(responses);
});

// Export session data (for post-workshop analysis)
app.get('/api/sessions/:code/export', (req, res) => {
  const session = store.sessions[req.params.code];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const responses = store.responses.filter(r => r.sessionCode === req.params.code);

  // Group by slide
  const bySlide = {};
  responses.forEach(r => {
    if (!bySlide[r.slideIndex]) bySlide[r.slideIndex] = [];
    bySlide[r.slideIndex].push(r);
  });

  res.json({
    session,
    totalResponses: responses.length,
    responsesBySlide: bySlide,
  });
});

// --- Socket.io ---
io.on('connection', (socket) => {
  const { sessionCode, mode, participantName, participantId } = socket.handshake.query;

  if (!sessionCode || !store.sessions[sessionCode]) {
    socket.emit('error', { message: 'Session not found' });
    socket.disconnect();
    return;
  }

  socket.join(sessionCode);

  if (mode === 'presenter') {
    socket.join(`${sessionCode}:presenter`);
    console.log(`Presenter connected: ${sessionCode}`);
  }

  if (mode === 'participant') {
    const pId = participantId || uuidv4();
    const participant = { id: pId, name: participantName || 'Anonymous', socketId: socket.id };

    if (!liveParticipants[sessionCode]) liveParticipants[sessionCode] = [];
    liveParticipants[sessionCode].push(participant);

    // Send current slide
    socket.emit('slide-change', { slideIndex: store.sessions[sessionCode].currentSlide });

    // Notify presenter
    io.to(`${sessionCode}:presenter`).emit('participant-joined', {
      participantName: participant.name,
      participants: liveParticipants[sessionCode].map(p => ({ id: p.id, name: p.name })),
    });

    console.log(`"${participant.name}" joined ${sessionCode} (${liveParticipants[sessionCode].length} total)`);
  }

  // Presenter starts session (releases lobby)
  socket.on('session-start', () => {
    if (mode !== 'presenter') return;
    store.sessions[sessionCode].status = 'started';
    saveStore(store);
    io.to(sessionCode).emit('session-start');
    console.log(`Session ${sessionCode} started by presenter`);
  });

  // Presenter changes slide
  socket.on('slide-change', (data) => {
    if (mode !== 'presenter') return;
    store.sessions[sessionCode].currentSlide = data.slideIndex;
    saveStore(store);
    socket.to(sessionCode).emit('slide-change', data);
  });

  // Response from participant
  socket.on('response', (data) => {
    const response = {
      ...data,
      sessionCode,
      createdAt: new Date().toISOString(),
    };
    store.responses.push(response);
    saveStore(store);

    // Forward to presenter
    io.to(`${sessionCode}:presenter`).emit('response', data);

    // Poll aggregation
    if (data.type === 'poll') {
      const pollResponses = store.responses.filter(
        r => r.sessionCode === sessionCode && r.slideIndex === data.slideIndex && r.type === 'poll'
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

    // Quiz aggregation (same pattern as polls)
    if (data.type === 'quiz') {
      const quizResponses = store.responses.filter(
        r => r.sessionCode === sessionCode && r.slideIndex === data.slideIndex && r.type === 'quiz'
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

    // Text aggregation (word frequency + response wall)
    if (data.type === 'text') {
      const textResponses = store.responses.filter(
        r => r.sessionCode === sessionCode && r.slideIndex === data.slideIndex && r.type === 'text'
      );

      // Build word frequency map
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

      io.to(`${sessionCode}:presenter`).emit('participant-left', {
        participants: liveParticipants[sessionCode].map(p => ({ id: p.id, name: p.name })),
      });
    }
  });
});

// --- Start ---
server.listen(PORT, () => {
  console.log(`\n  AI Primer Live running on http://localhost:${PORT}\n`);
  console.log(`  Self-paced:   http://localhost:${PORT}/`);
  console.log(`  Presenter:    http://localhost:${PORT}/presenter.html`);
  console.log(`  Participant:  http://localhost:${PORT}/join.html\n`);
});
