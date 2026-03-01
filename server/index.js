/* ============================================
   AI Primer Live — Server
   Express + Socket.io + Supabase REST API
   ============================================ */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://ai-primer-live.netlify.app,http://localhost:3000').split(',');
const io = new Server(server, { cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] } });

const PORT = process.env.PORT || 3000;

// --- Supabase REST API helper ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vwrwdzdievlmftrfusna.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function supabaseQuery(table, method, opts = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
  };

  if (opts.select) headers['Accept'] = 'application/json';
  if (opts.filters) url += `?${opts.filters}`;
  if (opts.select && !opts.filters) url += `?select=${opts.select}`;
  else if (opts.select && opts.filters) url += `&select=${opts.select}`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: (method === 'POST' || method === 'PATCH') ? JSON.stringify(opts.body) : undefined,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Supabase ${method} ${table} failed:`, err);
      return { data: null, error: err };
    }

    if (method === 'PATCH' && headers['Prefer'] === 'return=minimal') {
      return { data: null, error: null };
    }

    // DELETE and some responses return empty body
    const text = await res.text();
    if (!text) return { data: null, error: null };
    const data = JSON.parse(text);
    return { data, error: null };
  } catch (err) {
    console.error(`Supabase ${method} ${table} error:`, err.message);
    return { data: null, error: err.message };
  }
}

// Convenience wrappers
const db = {
  async select(table, filters = '', select = '*') {
    return supabaseQuery(table, 'GET', { filters: `select=${select}&${filters}`, select: null });
  },
  async insert(table, body) {
    return supabaseQuery(table, 'POST', { body, select: '*' });
  },
  async update(table, filters, body) {
    return supabaseQuery(table, 'PATCH', { filters, body });
  },
  async delete(table, filters) {
    return supabaseQuery(table, 'DELETE', { filters });
  },
};

// --- In-Memory Caches (for real-time performance) ---
const sessionCache = {};
const liveParticipants = {};
const responseCache = {};
const questionCache = {};  // Q&A questions per session { sessionCode: [{ id, text, participantId, participantName, slideIndex, upvotes: Set, answered, dismissed, createdAt }] }

// --- Load active sessions from Supabase on startup ---
async function loadActiveSessions() {
  if (!SUPABASE_KEY) {
    console.warn('No SUPABASE_SERVICE_KEY set — running without persistence');
    return;
  }

  const { data, error } = await db.select('sessions', 'status=in.(active,started,paused)&order=created_at.desc');

  if (error) {
    console.error('Failed to load sessions from Supabase:', error);
    return;
  }

  if (data) {
    for (const s of data) {
      sessionCache[s.code] = {
        id: s.id,
        code: s.code,
        title: s.title,
        presenterName: s.presenter_name,
        slideCount: s.slide_count,
        currentSlide: s.current_slide,
        status: s.status,
        courseId: s.course_id || null,
        customCourseId: s.custom_course_id || null,
        language: s.language || 'en',
        revealedSlides: {},
        createdAt: s.created_at,
        startedAt: s.started_at,
        endedAt: s.ended_at,
      };
      liveParticipants[s.code] = [];
      responseCache[s.code] = [];
      questionCache[s.code] = [];
    }

    // Load responses for active sessions (for real-time aggregation)
    for (const s of data) {
      const { data: responses } = await db.select(
        'interactions',
        `session_code=eq.${s.code}&event_type=in.(quiz_answer,poll_vote,text_response,graphic_interaction)&order=created_at.asc`
      );

      if (responses) {
        responseCache[s.code] = responses.map(r => ({
          sessionCode: r.session_code,
          slideIndex: r.slide_index,
          type: r.event_type === 'quiz_answer' ? 'quiz' :
                r.event_type === 'poll_vote' ? 'poll' :
                r.event_type === 'graphic_interaction' ? 'graphic' : 'text',
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
  if (!SUPABASE_KEY) return;

  const row = {
    session_code: sessionCode,
    event_type: eventType,
    participant_id: opts.participantId || null,
    participant_name: opts.participantName || null,
    slide_index: opts.slideIndex ?? null,
    event_data: opts.eventData || {},
  };

  db.insert('interactions', row).catch(() => {});
}

// --- CORS ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- Static Files ---
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json({ limit: '10mb' }));

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

  if (SUPABASE_KEY) {
    let filters = 'order=created_at.desc';
    if (status) filters += `&status=eq.${status}`;
    const { data, error } = await db.select('sessions', filters);
    if (error) return res.status(500).json({ error });

    return res.json((data || []).map(s => ({
      id: s.id,
      code: s.code,
      title: s.title,
      presenterName: s.presenter_name,
      slideCount: s.slide_count,
      currentSlide: s.current_slide,
      status: s.status,
      courseId: s.course_id || null,
      customCourseId: s.custom_course_id || null,
      language: s.language || 'en',
      createdAt: s.created_at,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      participantCount: (liveParticipants[s.code] || []).length,
    })));
  }

  // Fallback: in-memory only
  let sessions = Object.values(sessionCache);
  if (status) sessions = sessions.filter(s => s.status === status);
  sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sessions.map(s => ({ ...s, participantCount: (liveParticipants[s.code] || []).length })));
});

// Create session
app.post('/api/sessions', async (req, res) => {
  const { title, presenterName, slideCount, courseId, language, customCourseId } = req.body;
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
    course_id: courseId || null,
    custom_course_id: customCourseId || null,
    language: language || 'en',
  };

  if (SUPABASE_KEY) {
    let { error } = await db.insert('sessions', session);
    // If insert fails (e.g. course_id/language column missing), retry without new columns
    if (error) {
      console.warn('[Sessions] Insert failed, retrying without new columns:', error.message || error);
      const { course_id, language: _lang, ...sessionWithoutNew } = session;
      const retry = await db.insert('sessions', sessionWithoutNew);
      if (retry.error) {
        console.error('[Sessions] Insert retry also failed:', retry.error);
        return res.status(500).json({ error: retry.error });
      }
    }
  }

  sessionCache[code] = {
    id: session.id,
    code,
    title: session.title,
    presenterName: session.presenter_name,
    slideCount: session.slide_count,
    courseId: session.course_id,
    customCourseId: session.custom_course_id,
    language: session.language || 'en',
    revealedSlides: {},
    currentSlide: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  liveParticipants[code] = [];
  responseCache[code] = [];
  questionCache[code] = [];

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

// Get all responses for a session
app.get('/api/sessions/:code/responses', async (req, res) => {
  if (!sessionCache[req.params.code]) return res.status(404).json({ error: 'Session not found' });

  if (SUPABASE_KEY) {
    const { data, error } = await db.select(
      'interactions',
      `session_code=eq.${req.params.code}&event_type=in.(quiz_answer,poll_vote,text_response)&order=created_at.asc`
    );
    if (error) return res.status(500).json({ error });
    return res.json(data || []);
  }

  res.json(responseCache[req.params.code] || []);
});

// Get Q&A questions for a session
app.get('/api/sessions/:code/questions', (req, res) => {
  if (!sessionCache[req.params.code]) return res.status(404).json({ error: 'Session not found' });
  const questions = (questionCache[req.params.code] || [])
    .filter(q => !q.dismissed)
    .map(q => ({ ...q, upvotes: q.upvotes ? q.upvotes.size : 0 }));
  res.json(questions);
});

// Get responses for a specific slide
app.get('/api/sessions/:code/responses/:slideIndex', async (req, res) => {
  if (!sessionCache[req.params.code]) return res.status(404).json({ error: 'Session not found' });

  const slideIndex = parseInt(req.params.slideIndex);

  if (SUPABASE_KEY) {
    const { data, error } = await db.select(
      'interactions',
      `session_code=eq.${req.params.code}&slide_index=eq.${slideIndex}&event_type=in.(quiz_answer,poll_vote,text_response)&order=created_at.asc`
    );
    if (error) return res.status(500).json({ error });
    return res.json(data || []);
  }

  const responses = (responseCache[req.params.code] || []).filter(r => r.slideIndex === slideIndex);
  res.json(responses);
});

// Get aggregated results for a slide (for graphics requesting session data)
app.get('/api/sessions/:code/slides/:slideIndex/results', (req, res) => {
  if (!sessionCache[req.params.code]) return res.status(404).json({ error: 'Session not found' });

  const slideIndex = parseInt(req.params.slideIndex);
  const responses = (responseCache[req.params.code] || []).filter(r => r.slideIndex === slideIndex);

  if (responses.length === 0) return res.json({ total: 0, responses: [] });

  const type = responses[0].type;
  const result = { total: responses.length, type };

  if (type === 'poll' || type === 'quiz') {
    const counts = {};
    responses.forEach(r => { counts[r.data.option] = (counts[r.data.option] || 0) + 1; });
    const maxOpt = Math.max(...Object.keys(counts).map(Number), 0);
    result.options = [];
    for (let i = 0; i <= maxOpt; i++) result.options.push(counts[i] || 0);
  } else if (type === 'text') {
    result.texts = responses.map(r => ({ name: r.participantName, text: r.data.text }));
  } else if (type === 'graphic') {
    result.interactions = responses.map(r => ({ name: r.participantName, data: r.data }));
  }

  res.json(result);
});

// Export session data (full event log)
app.get('/api/sessions/:code/export', async (req, res) => {
  const session = sessionCache[req.params.code];

  if (SUPABASE_KEY) {
    // Get session from DB if not in cache (ended sessions)
    let sessionData = session;
    if (!sessionData) {
      const { data } = await db.select('sessions', `code=eq.${req.params.code}`);
      if (!data || !data.length) return res.status(404).json({ error: 'Session not found' });
      sessionData = data[0];
    }

    const { data: interactions, error } = await db.select(
      'interactions',
      `session_code=eq.${req.params.code}&order=created_at.asc`
    );
    if (error) return res.status(500).json({ error });

    const responses = (interactions || []).filter(i =>
      ['quiz_answer', 'poll_vote', 'text_response'].includes(i.event_type)
    );

    const responsesBySlide = {};
    responses.forEach(r => {
      if (!responsesBySlide[r.slide_index]) responsesBySlide[r.slide_index] = [];
      responsesBySlide[r.slide_index].push(r);
    });

    const timeline = (interactions || []).map(i => ({
      time: i.created_at,
      event: i.event_type,
      participant: i.participant_name,
      slide: i.slide_index,
      data: i.event_data,
    }));

    return res.json({
      session: sessionData,
      totalInteractions: (interactions || []).length,
      totalResponses: responses.length,
      responsesBySlide,
      timeline,
    });
  }

  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ session, totalResponses: (responseCache[req.params.code] || []).length });
});

// Delete a session (and its interactions)
app.delete('/api/sessions/:code', async (req, res) => {
  const code = req.params.code;

  if (SUPABASE_KEY) {
    // Delete interactions first (foreign key), then session
    await db.delete('interactions', `session_code=eq.${code}`);
    const { error } = await db.delete('sessions', `code=eq.${code}`);
    if (error) return res.status(500).json({ error });
  }

  // Clean up in-memory caches
  delete sessionCache[code];
  delete responseCache[code];
  delete questionCache[code];
  delete liveParticipants[code];

  // Disconnect any remaining sockets in this room
  const room = io.sockets.adapter.rooms.get(code);
  if (room) {
    for (const socketId of room) {
      io.sockets.sockets.get(socketId)?.disconnect(true);
    }
  }

  res.json({ ok: true });
});

// --- Custom Course API ---

// List custom courses (optionally filter by presenter_id)
app.get('/api/courses', async (req, res) => {
  if (!SUPABASE_KEY) return res.json([]);

  const presenterId = req.query.presenter_id;
  let filters = 'order=updated_at.desc';
  if (presenterId) filters += `&presenter_id=eq.${presenterId}`;

  const { data, error } = await db.select('custom_courses', filters);
  if (error) return res.status(500).json({ error });
  res.json(data || []);
});

// Get a single custom course
app.get('/api/courses/:id', async (req, res) => {
  if (!SUPABASE_KEY) return res.status(404).json({ error: 'No database' });

  const { data, error } = await db.select('custom_courses', `id=eq.${req.params.id}`);
  if (error) return res.status(500).json({ error });
  if (!data || !data.length) return res.status(404).json({ error: 'Course not found' });
  res.json(data[0]);
});

// Create custom course
app.post('/api/courses', async (req, res) => {
  if (!SUPABASE_KEY) return res.status(500).json({ error: 'No database configured' });

  const { title, description, presenterId, slides, sections, language, translations } = req.body;
  if (!title || !presenterId) return res.status(400).json({ error: 'title and presenterId are required' });

  const course = {
    title,
    description: description || '',
    presenter_id: presenterId,
    slides: slides || [],
    sections: sections || [],
    language: language || 'en',
    translations: translations || {},
  };

  const { data, error } = await db.insert('custom_courses', course);
  if (error) return res.status(500).json({ error });
  res.json(data?.[0] || course);
});

// Update custom course
app.put('/api/courses/:id', async (req, res) => {
  if (!SUPABASE_KEY) return res.status(500).json({ error: 'No database configured' });

  const updates = {};
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.slides !== undefined) updates.slides = req.body.slides;
  if (req.body.sections !== undefined) updates.sections = req.body.sections;
  if (req.body.language !== undefined) updates.language = req.body.language;
  if (req.body.translations !== undefined) updates.translations = req.body.translations;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  const { error } = await db.update('custom_courses', `id=eq.${req.params.id}`, updates);
  if (error) return res.status(500).json({ error });

  // Fetch updated record
  const { data } = await db.select('custom_courses', `id=eq.${req.params.id}`);
  res.json(data?.[0] || { id: req.params.id, ...updates });
});

// --- Translation API ---

app.post('/api/translate', async (req, res) => {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(501).json({ error: 'Translation not configured — set ANTHROPIC_API_KEY' });
  }

  const { content, targetLang, sourceLang } = req.body;
  if (!content || !targetLang) {
    return res.status(400).json({ error: 'content and targetLang are required' });
  }

  const LANG_NAMES = {
    en: 'English', fr: 'French', de: 'German', es: 'Spanish',
    it: 'Italian', pt: 'Portuguese', nl: 'Dutch', ja: 'Japanese',
    zh: 'Chinese (Simplified)', ar: 'Arabic',
  };

  const fromName = LANG_NAMES[sourceLang || 'en'] || sourceLang || 'English';
  const toName = LANG_NAMES[targetLang] || targetLang;

  // Build a description of what to translate
  const fields = Object.entries(content)
    .filter(([_, v]) => v && String(v).trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n\n');

  if (!fields) {
    return res.status(400).json({ error: 'No translatable content provided' });
  }

  const prompt = `Translate the following presentation slide content from ${fromName} to ${toName}.

Return ONLY a JSON object with the same keys, translated values. Keep any HTML tags intact.
Do not add any explanation or markdown formatting — just the raw JSON object.

${fields}`;

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text();
      console.error('[Translate] Anthropic API error:', err);
      return res.status(502).json({ error: 'Translation API error' });
    }

    const result = await apiRes.json();
    const text = result.content?.[0]?.text || '';

    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Translate] Could not parse JSON from response:', text);
      return res.status(502).json({ error: 'Could not parse translation response' });
    }

    const translated = JSON.parse(jsonMatch[0]);
    res.json(translated);
  } catch (err) {
    console.error('[Translate] Error:', err.message);
    res.status(500).json({ error: 'Translation failed: ' + err.message });
  }
});

// Delete custom course
app.delete('/api/courses/:id', async (req, res) => {
  if (!SUPABASE_KEY) return res.status(500).json({ error: 'No database configured' });

  // Clear custom_course_id from any sessions referencing this course
  await db.update('sessions', `custom_course_id=eq.${req.params.id}`, { custom_course_id: null });

  const { error } = await db.delete('custom_courses', `id=eq.${req.params.id}`);
  if (error) return res.status(500).json({ error });
  res.json({ ok: true });
});

// --- Asset Upload (Supabase Storage) ---

const ASSETS_BUCKET = 'assets';

// Ensure the assets bucket exists
async function ensureAssetsBucket() {
  if (!SUPABASE_KEY) return;
  try {
    // Try to get bucket info — if it 404s, create it
    const checkRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${ASSETS_BUCKET}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });
    if (checkRes.status === 404 || checkRes.status === 400) {
      const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: ASSETS_BUCKET, name: ASSETS_BUCKET, public: true }),
      });
      if (createRes.ok) {
        console.log(`  Storage bucket '${ASSETS_BUCKET}' created`);
      } else {
        const err = await createRes.text();
        console.warn(`  Could not create bucket: ${err}`);
      }
    } else {
      console.log(`  Storage bucket '${ASSETS_BUCKET}' exists`);
    }
  } catch (err) {
    console.warn('  Storage bucket check failed:', err.message);
  }
}

// Upload an asset
app.post('/api/assets/upload', async (req, res) => {
  if (!SUPABASE_KEY) return res.status(500).json({ error: 'No database configured' });

  const { file, filename, contentType } = req.body;
  if (!file || !filename) return res.status(400).json({ error: 'file (base64) and filename are required' });

  // Sanitise filename: prefix with timestamp to avoid collisions
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${Date.now()}-${safeName}`;

  try {
    // Decode base64 to buffer
    const buffer = Buffer.from(file, 'base64');
    const mime = contentType || 'application/octet-stream';

    // Upload to Supabase Storage
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${ASSETS_BUCKET}/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': mime,
          'x-upsert': 'true',
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('[Assets] Upload failed:', err);
      return res.status(502).json({ error: 'Upload failed' });
    }

    // Build public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${ASSETS_BUCKET}/${storagePath}`;
    res.json({ url: publicUrl, path: storagePath, filename: safeName });
  } catch (err) {
    console.error('[Assets] Error:', err.message);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// List assets
app.get('/api/assets', async (req, res) => {
  if (!SUPABASE_KEY) return res.json([]);

  try {
    const listRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/list/${ASSETS_BUCKET}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefix: '', limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } }),
      }
    );

    if (!listRes.ok) {
      const err = await listRes.text();
      return res.status(502).json({ error: 'List failed: ' + err });
    }

    const files = await listRes.json();
    // Add public URL to each file
    const withUrls = (files || [])
      .filter(f => f.name && !f.name.endsWith('/'))
      .map(f => ({
        name: f.name,
        size: f.metadata?.size || 0,
        contentType: f.metadata?.mimetype || '',
        createdAt: f.created_at,
        url: `${SUPABASE_URL}/storage/v1/object/public/${ASSETS_BUCKET}/${f.name}`,
      }));
    res.json(withUrls);
  } catch (err) {
    console.error('[Assets] List error:', err.message);
    res.status(500).json({ error: 'List failed' });
  }
});

// Delete an asset
app.delete('/api/assets/:path', async (req, res) => {
  if (!SUPABASE_KEY) return res.status(500).json({ error: 'No database configured' });

  try {
    const delRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${ASSETS_BUCKET}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefixes: [req.params.path] }),
      }
    );

    if (!delRes.ok) {
      const err = await delRes.text();
      return res.status(502).json({ error: 'Delete failed: ' + err });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
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

    socket.emit('session-state', {
      currentSlide: sessionCache[sessionCode].currentSlide,
      status: sessionCache[sessionCode].status,
      revealedSlides: sessionCache[sessionCode].revealedSlides || {},
      participants: (liveParticipants[sessionCode] || []).map(p => ({
        id: p.id, name: p.name, currentSlide: p.currentSlide,
        joinedAt: p.joinedAt, lastActivity: p.lastActivity, lastActivityType: p.lastActivityType,
      })),
    });

    // Send existing Q&A questions to presenter
    const presenterQuestions = (questionCache[sessionCode] || [])
      .filter(q => !q.dismissed)
      .map(q => ({ ...q, upvotes: q.upvotes ? q.upvotes.size : 0 }));
    if (presenterQuestions.length) {
      socket.emit('questions-update', { questions: presenterQuestions });
    }
  }

  if (mode === 'participant') {
    const pId = participantId || uuidv4();
    const participant = {
      id: pId,
      name: participantName || 'Anonymous',
      socketId: socket.id,
      currentSlide: sessionCache[sessionCode].currentSlide,
      joinedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      lastActivityType: 'joined',
    };

    if (!liveParticipants[sessionCode]) liveParticipants[sessionCode] = [];
    liveParticipants[sessionCode].push(participant);

    socket.emit('slide-change', { slideIndex: sessionCache[sessionCode].currentSlide });
    // Send revealed slides state for late joiners
    const sessionState = {};
    if (sessionCache[sessionCode].revealedSlides && Object.keys(sessionCache[sessionCode].revealedSlides).length) {
      sessionState.revealedSlides = sessionCache[sessionCode].revealedSlides;
    }
    if (sessionCache[sessionCode].resources) {
      sessionState.resources = sessionCache[sessionCode].resources;
    }
    sessionState.currentSlide = sessionCache[sessionCode].currentSlide;
    if (sessionCache[sessionCode].availableLanguages) {
      sessionState.availableLanguages = sessionCache[sessionCode].availableLanguages;
    }
    socket.emit('session-state', sessionState);

    // Send existing Q&A questions
    const participantQuestions = (questionCache[sessionCode] || [])
      .filter(q => !q.dismissed)
      .map(q => ({ ...q, upvotes: q.upvotes ? q.upvotes.size : 0 }));
    if (participantQuestions.length) {
      socket.emit('questions-update', { questions: participantQuestions });
    }

    const participantList = liveParticipants[sessionCode].map(p => ({
      id: p.id, name: p.name, currentSlide: p.currentSlide,
      joinedAt: p.joinedAt, lastActivity: p.lastActivity, lastActivityType: p.lastActivityType,
    }));

    io.to(`${sessionCode}:presenter`).emit('participant-joined', {
      participantName: participant.name,
      participants: participantList,
    });

    logInteraction(sessionCode, 'participant_joined', {
      participantId: pId,
      participantName: participant.name,
    });

    console.log(`"${participant.name}" joined ${sessionCode} (${liveParticipants[sessionCode].length} total)`);
  }

  // Session lifecycle events
  socket.on('session-start', () => {
    if (mode !== 'presenter') return;
    sessionCache[sessionCode].status = 'started';
    sessionCache[sessionCode].startedAt = new Date().toISOString();
    db.update('sessions', `code=eq.${sessionCode}`, { status: 'started', started_at: sessionCache[sessionCode].startedAt });
    logInteraction(sessionCode, 'session_started');
    io.to(sessionCode).emit('session-start');
    console.log(`Session ${sessionCode} started`);
  });

  socket.on('session-pause', () => {
    if (mode !== 'presenter') return;
    sessionCache[sessionCode].status = 'paused';
    db.update('sessions', `code=eq.${sessionCode}`, { status: 'paused' });
    logInteraction(sessionCode, 'session_paused');
    io.to(sessionCode).emit('session-pause');
    console.log(`Session ${sessionCode} paused`);
  });

  socket.on('session-resume', () => {
    if (mode !== 'presenter') return;
    sessionCache[sessionCode].status = 'started';
    db.update('sessions', `code=eq.${sessionCode}`, { status: 'started' });
    logInteraction(sessionCode, 'session_resumed');
    io.to(sessionCode).emit('session-resume');
    console.log(`Session ${sessionCode} resumed`);
  });

  socket.on('session-end', () => {
    if (mode !== 'presenter') return;
    sessionCache[sessionCode].status = 'ended';
    sessionCache[sessionCode].endedAt = new Date().toISOString();
    db.update('sessions', `code=eq.${sessionCode}`, { status: 'ended', ended_at: sessionCache[sessionCode].endedAt });
    logInteraction(sessionCode, 'session_ended');
    io.to(sessionCode).emit('session-end');
    console.log(`Session ${sessionCode} ended`);
  });

  // Slide changes
  socket.on('slide-change', (data) => {
    if (mode !== 'presenter') return;
    const prevSlide = sessionCache[sessionCode].currentSlide;
    sessionCache[sessionCode].currentSlide = data.slideIndex;
    db.update('sessions', `code=eq.${sessionCode}`, { current_slide: data.slideIndex });
    logInteraction(sessionCode, 'slide_change', {
      slideIndex: data.slideIndex,
      eventData: { from: prevSlide, to: data.slideIndex },
    });
    // Update all participants' tracked slide position
    if (liveParticipants[sessionCode]) {
      liveParticipants[sessionCode].forEach(p => { p.currentSlide = data.slideIndex; });
    }
    socket.to(sessionCode).emit('slide-change', data);
  });

  // Available languages (presenter broadcasts to all participants)
  socket.on('available-languages', (data) => {
    if (mode !== 'presenter') return;
    if (data.languages && Array.isArray(data.languages)) {
      sessionCache[sessionCode].availableLanguages = data.languages;
      // Send to all participants
      socket.to(sessionCode).emit('session-state', { availableLanguages: data.languages });
    }
  });

  // Language change (presenter-only, broadcast to all participants)
  socket.on('language-change', (data) => {
    if (mode !== 'presenter') return;
    const language = data.language || 'en';
    sessionCache[sessionCode].language = language;
    db.update('sessions', `code=eq.${sessionCode}`, { language });
    logInteraction(sessionCode, 'language_change', { eventData: { language } });
    socket.to(sessionCode).emit('language-change', { language });
  });

  // Results reveal (presenter-only)
  socket.on('results-reveal', (data) => {
    if (mode !== 'presenter') return;
    const slideIndex = data.slideIndex;

    // Track revealed state
    if (!sessionCache[sessionCode].revealedSlides) sessionCache[sessionCode].revealedSlides = {};
    sessionCache[sessionCode].revealedSlides[slideIndex] = true;

    // Aggregate current results for this slide
    const responses = (responseCache[sessionCode] || []).filter(r => r.slideIndex === slideIndex);
    const type = data.type || (responses[0] ? responses[0].type : 'poll');
    let resultPayload;

    if (type === 'text') {
      // Text aggregation: word cloud + response wall
      const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','can','could','and','but','or','nor','for','yet','so','in','on','at','to','of','by','with','from','up','out','it','its','i','we','they','you','he','she','my','our','their','your','his','her','this','that','these','those','not','no','all','each','every','both','few','more','most','other','some','such','than','too','very']);
      const wordCounts = {};
      responses.forEach(r => {
        const text = (r.data.text || '').toLowerCase().replace(/[^a-z0-9\s'-]/g, '');
        text.split(/\s+/).forEach(w => {
          if (w.length > 2 && !stopWords.has(w)) wordCounts[w] = (wordCounts[w] || 0) + 1;
        });
      });
      const words = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([word, count]) => ({ word, count }));
      const texts = responses.map(r => ({ name: r.participantName || 'Anonymous', text: r.data.text || '' }));
      resultPayload = { words, texts, total: responses.length };
    } else {
      // Poll/quiz aggregation: option counts
      const counts = {};
      responses.forEach(r => { counts[r.data.option] = (counts[r.data.option] || 0) + 1; });
      const maxOpt = Math.max(...Object.keys(counts).map(Number), 0);
      const options = [];
      for (let i = 0; i <= maxOpt; i++) options.push(counts[i] || 0);
      resultPayload = { options, total: responses.length };
    }

    // Broadcast to all clients in session
    io.to(sessionCode).emit('results-revealed', {
      slideIndex,
      type,
      results: resultPayload,
    });

    logInteraction(sessionCode, 'results_revealed', {
      slideIndex,
      eventData: { type, total: responses.length },
    });

    console.log(`Results revealed for slide ${slideIndex} in ${sessionCode} (${responses.length} responses)`);
  });

  // Participant responses
  socket.on('response', (data) => {
    const eventTypeMap = { quiz: 'quiz_answer', poll: 'poll_vote', text: 'text_response', graphic: 'graphic_interaction' };
    const eventType = eventTypeMap[data.type] || data.type;

    logInteraction(sessionCode, eventType, {
      participantId: data.participantId,
      participantName: data.participantName,
      slideIndex: data.slideIndex,
      eventData: data.data,
    });

    // Cache for aggregation
    if (!responseCache[sessionCode]) responseCache[sessionCode] = [];
    responseCache[sessionCode].push({
      sessionCode,
      slideIndex: data.slideIndex,
      type: data.type,
      data: data.data,
      participantId: data.participantId,
      participantName: data.participantName,
      createdAt: new Date().toISOString(),
    });

    // Update participant activity tracking
    if (liveParticipants[sessionCode]) {
      const participant = liveParticipants[sessionCode].find(p => p.id === data.participantId);
      if (participant) {
        participant.lastActivity = new Date().toISOString();
        participant.lastActivityType = data.type;
      }
    }

    // Forward to presenter (include updated participant list)
    const participantList = (liveParticipants[sessionCode] || []).map(p => ({
      id: p.id, name: p.name, currentSlide: p.currentSlide,
      joinedAt: p.joinedAt, lastActivity: p.lastActivity, lastActivityType: p.lastActivityType,
    }));
    io.to(`${sessionCode}:presenter`).emit('response', { ...data, participants: participantList });

    // Poll aggregation
    if (data.type === 'poll') {
      const pollResponses = responseCache[sessionCode].filter(
        r => r.slideIndex === data.slideIndex && r.type === 'poll'
      );
      const counts = {};
      pollResponses.forEach(r => { counts[r.data.option] = (counts[r.data.option] || 0) + 1; });
      const maxOpt = Math.max(...Object.keys(counts).map(Number), 0);
      const options = [];
      for (let i = 0; i <= maxOpt; i++) options.push(counts[i] || 0);
      io.to(sessionCode).emit('poll-update', { slideIndex: data.slideIndex, results: { options, total: pollResponses.length } });
    }

    // Quiz aggregation
    if (data.type === 'quiz') {
      const quizResponses = responseCache[sessionCode].filter(
        r => r.slideIndex === data.slideIndex && r.type === 'quiz'
      );
      const counts = {};
      quizResponses.forEach(r => { counts[r.data.option] = (counts[r.data.option] || 0) + 1; });
      const maxOpt = Math.max(...Object.keys(counts).map(Number), 0);
      const options = [];
      for (let i = 0; i <= maxOpt; i++) options.push(counts[i] || 0);
      io.to(sessionCode).emit('quiz-update', { slideIndex: data.slideIndex, results: { options, total: quizResponses.length } });
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
          if (w.length > 2 && !stopWords.has(w)) wordCounts[w] = (wordCounts[w] || 0) + 1;
        });
      });
      const words = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([word, count]) => ({ word, count }));
      const texts = textResponses.map(r => ({ name: r.participantName || 'Anonymous', text: r.data.text || '' }));
      io.to(sessionCode).emit('text-update', { slideIndex: data.slideIndex, results: { words, texts, total: textResponses.length } });
    }

    // Graphic interaction — broadcast to all participants + presenter for real-time sync
    if (data.type === 'graphic') {
      const graphicResponses = responseCache[sessionCode].filter(
        r => r.slideIndex === data.slideIndex && r.type === 'graphic'
      );
      io.to(sessionCode).emit('graphic-update', {
        slideIndex: data.slideIndex,
        results: {
          interactions: graphicResponses.map(r => ({
            participantId: r.participantId,
            participantName: r.participantName,
            data: r.data,
          })),
          total: graphicResponses.length,
          latest: data.data,
        },
      });
    }
  });

  // --- Q&A System ---

  // Submit a question (participant)
  socket.on('question-submit', (data) => {
    if (!questionCache[sessionCode]) questionCache[sessionCode] = [];

    const question = {
      id: uuidv4(),
      text: (data.text || '').trim().slice(0, 500),
      participantId: data.participantId || participantId || 'anon',
      participantName: data.participantName || participantName || 'Anonymous',
      slideIndex: data.slideIndex || sessionCache[sessionCode].currentSlide,
      upvotes: new Set(),
      upvoteCount: 0,
      answered: false,
      dismissed: false,
      createdAt: new Date().toISOString(),
    };

    if (!question.text) return;

    questionCache[sessionCode].push(question);

    logInteraction(sessionCode, 'question_submitted', {
      participantId: question.participantId,
      participantName: question.participantName,
      slideIndex: question.slideIndex,
      eventData: { questionId: question.id, text: question.text },
    });

    // Broadcast to all clients
    const questions = questionCache[sessionCode]
      .filter(q => !q.dismissed)
      .map(q => ({ ...q, upvotes: q.upvotes ? q.upvotes.size : 0 }));
    io.to(sessionCode).emit('questions-update', {
      questions,
      latestFrom: question.participantName,
    });

    console.log(`Q&A: "${question.participantName}" asked in ${sessionCode}`);
  });

  // Upvote a question (any participant)
  socket.on('question-upvote', (data) => {
    if (!questionCache[sessionCode]) return;
    const question = questionCache[sessionCode].find(q => q.id === data.questionId);
    if (!question) return;

    const voterId = data.participantId || participantId || socket.id;

    // Toggle upvote
    if (question.upvotes.has(voterId)) {
      question.upvotes.delete(voterId);
    } else {
      question.upvotes.add(voterId);
    }

    // Broadcast update
    const questions = questionCache[sessionCode]
      .filter(q => !q.dismissed)
      .map(q => ({ ...q, upvotes: q.upvotes ? q.upvotes.size : 0 }));
    io.to(sessionCode).emit('questions-update', { questions });
  });

  // Mark question as answered (presenter only)
  socket.on('question-answered', (data) => {
    if (mode !== 'presenter') return;
    if (!questionCache[sessionCode]) return;
    const question = questionCache[sessionCode].find(q => q.id === data.questionId);
    if (!question) return;

    question.answered = !question.answered; // Toggle

    logInteraction(sessionCode, 'question_answered', {
      eventData: { questionId: question.id, answered: question.answered },
    });

    const questions = questionCache[sessionCode]
      .filter(q => !q.dismissed)
      .map(q => ({ ...q, upvotes: q.upvotes ? q.upvotes.size : 0 }));
    io.to(sessionCode).emit('questions-update', { questions });

    console.log(`Q&A: Question ${question.answered ? 'answered' : 'unmarked'} in ${sessionCode}`);
  });

  // Dismiss question (presenter only)
  socket.on('question-dismiss', (data) => {
    if (mode !== 'presenter') return;
    if (!questionCache[sessionCode]) return;
    const question = questionCache[sessionCode].find(q => q.id === data.questionId);
    if (!question) return;

    question.dismissed = true;

    logInteraction(sessionCode, 'question_dismissed', {
      eventData: { questionId: question.id, text: question.text },
    });

    const questions = questionCache[sessionCode]
      .filter(q => !q.dismissed)
      .map(q => ({ ...q, upvotes: q.upvotes ? q.upvotes.size : 0 }));
    io.to(sessionCode).emit('questions-update', { questions });

    console.log(`Q&A: Question dismissed in ${sessionCode}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (mode === 'participant' && liveParticipants[sessionCode]) {
      const leaving = liveParticipants[sessionCode].find(p => p.socketId === socket.id);
      liveParticipants[sessionCode] = liveParticipants[sessionCode].filter(p => p.socketId !== socket.id);
      logInteraction(sessionCode, 'participant_left', {
        participantId: leaving?.id || participantId,
        participantName: leaving?.name || participantName,
      });
      const participantList = liveParticipants[sessionCode].map(p => ({
        id: p.id, name: p.name, currentSlide: p.currentSlide,
        joinedAt: p.joinedAt, lastActivity: p.lastActivity, lastActivityType: p.lastActivityType,
      }));
      io.to(`${sessionCode}:presenter`).emit('participant-left', {
        participantName: leaving?.name || participantName,
        participants: participantList,
      });
    }
  });
});

// --- Start ---
async function start() {
  await loadActiveSessions();
  await ensureAssetsBucket();
  server.listen(PORT, () => {
    console.log(`\n  AI Primer Live running on http://localhost:${PORT}`);
    console.log(`  Supabase: ${SUPABASE_KEY ? 'connected' : 'NOT configured (in-memory only)'}\n`);
  });
}

start();
