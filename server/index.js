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
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

const PORT = process.env.PORT || 3000;

// --- CORS (allow Netlify frontend to call this server) ---
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
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
