/* ============================================
   Section 1 — Foundation
   Establishing a Foundation for AI Literacy
   4 modules · ~11 minutes
   ============================================ */

const SECTION_1_FOUNDATION = [

  // ── 1.0  Section opener ──────────────────────
  {
    type: 'section',
    theme: 'gradient',
    sectionLabel: 'SECTION 1',
    title: 'Foundation',
    subtitle: 'Establishing a Foundation for AI Literacy',
    notes: `This is the opening section. The goal is to set the tone, frame the course, and make the case for why the foundational work matters more than jumping to tools and pilots. Keep it warm, direct, and reassuring — the room needs to feel like this is going to be useful, not academic.`,
  },

  // ── 1.1  Course Welcome ──────────────────────
  {
    type: 'cover',
    theme: 'gradient',
    title: 'AI Primer',
    subtitle: 'Get your team aligned and AI-ready. Built for any tool. Designed to last.',
    notes: `Welcome everyone. This is the AI Primer — a half-day workshop designed to give your team a shared understanding of AI: what it is, how it works, and how to start using it well. We're not here to turn you into engineers. We're here to make sure you can have a smart conversation about AI and start applying it tomorrow.`,
  },

  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'FOUNDATION',
    title: 'This isn\'t about turning you into an AI engineer.',
    body: '<p>It\'s about building a solid mental model — a framework you can use to understand how generative AI works, make sensible decisions, spot genuine opportunity, and know when someone\'s talking nonsense.</p>',
    callout: {
      title: 'The real test',
      body: 'If you can explain AI to someone else — actually explain it, not just repeat the buzzwords — then you\'ve understood it.',
    },
    notes: `Land this early. The room needs to know the bar isn't technical — it's practical. The "explain it to someone else" framing always resonates. Pause after the callout and ask: "Does that feel like a reasonable bar?" You'll get nods. That's your permission to move forward.`,
  },

  // ── 1.2  Objectives & Agenda ─────────────────
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'FOUNDATION',
    title: 'What you\'ll walk away with',
    body: `<p>By the end of this course, you'll have four things:</p>
<p><strong>1. A clear mental model</strong> of how generative AI actually works — not watered down, not oversimplified.</p>
<p><strong>2. Understanding of large language models</strong> — how they\'re trained, how they think, why they sometimes work brilliantly and sometimes completely miss the mark.</p>
<p><strong>3. Practical exercises completed</strong> — not watching someone else do them. You'll have done them.</p>
<p><strong>4. A framework for concepts, techniques, and skills</strong> that make AI genuinely useful in practice.</p>`,
    notes: `Walk through each objective deliberately — each one gets its own beat. Emphasise the third point: "not watching me do them — you'll have done them." That sets the expectation that this is participatory. People need to hear that early.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'FOUNDATION',
    title: 'How we\'ll get there',
    body: `<p>We're organised into five sections, each building on the last:</p>
<p><strong>Foundation</strong> — Building the mental model before we do anything else.</p>
<p><strong>Capabilities</strong> — What AI can actually do. Not the marketing version.</p>
<p><strong>Limitations &amp; Risks</strong> — Understanding what AI can\'t do is just as important.</p>
<p><strong>Techniques</strong> — The practical methods that make the difference between using AI well and using it poorly.</p>
<p><strong>Implementation</strong> — How to integrate this into your work and your organisation.</p>`,
    callout: {
      title: 'What success looks like',
      body: 'You can explain to a colleague how a language model works. You can spot when AI is the right tool and when it isn\'t. You can use it effectively. And you can help others do the same.',
    },
    notes: `The course structure slide. Don't rush this — it's the roadmap. Emphasise that each section builds on the previous one: "If the mental model isn't solid, the rest becomes harder. That's why we're spending time here." The callout is the bar. Keep it simple and grounded.`,
  },

  // ── 1.3  AI Adoption Curve ───────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'FOUNDATION',
    title: 'The AI Adoption Curve',
    body: '<p>There are four stages of AI adoption in an organisation:</p><p><strong>Understanding → Relevance → Framework → Implementation</strong></p><p>Most organisations spend about a week on Understanding, half-do Relevance, struggle with Framework, and then jump straight to Implementation.</p>',
    stats: [
      { number: '1 week', label: 'Average time on Understanding' },
      { number: 'Skipped', label: 'Relevance stage' },
      { number: '80%', label: 'Jump straight to tools' },
    ],
    notes: `This is the adoption curve slide. Name the four stages clearly, then reveal the pattern: most organisations jump straight to Implementation. Let that sink in. The stats reinforce the message — you've seen this play out repeatedly across clients. This is hard-won observation, not theory.`,
  },

  {
    type: 'statement',
    theme: 'gradient',
    sectionLabel: 'FOUNDATION',
    title: 'The real value is on the left side of the curve.',
    body: '<p>Understanding and Relevance — that\'s where you avoid costly mistakes. That\'s where people develop genuine confidence instead of anxiety. Skip it, and implementation becomes expensive trial-and-error.</p>',
    callout: {
      title: 'Think of it like building a house',
      body: 'If you don\'t get the foundation and the structure right, you can paint the walls and fit the furniture, but the house isn\'t sound. It\'s not going to last.',
    },
    notes: `This is the payload of the adoption curve module. The house metaphor always lands — pause after it. You're making the case for why this course exists, and specifically why the Foundation section matters. Don't rush. Let people absorb the implication: "So that's what we're doing in this Foundation section. We're building that left side properly."`,
  },

  // ── 1.4  Organisation AI Adoption ────────────
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'FOUNDATION',
    title: 'What adoption actually looks like',
    body: `<p>Imagine three people on your team:</p>
<p><strong>Person A</strong> uses AI every day. They prompt engineer. They experiment. They've built processes around it.</p>
<p><strong>Person B</strong> dabbles. They've tried it a few times. But it's not embedded in how they work.</p>
<p><strong>Person C</strong> hasn't really started. Maybe sceptical. Maybe just hasn't had a reason to try.</p>
<p>All three are in the same organisation, doing the same job function. That's your adoption curve right there.</p>`,
    notes: `Ground the abstract concept in something real. Everyone in the room will recognise these three people — they'll probably identify which one they are. Don't name names or make it awkward. Just describe it matter-of-factly and let them self-identify. The point is: adoption is uneven, and that's normal.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'FOUNDATION',
    title: 'Knowledge ≠ Confidence',
    body: '<p>These two metrics are different, and they matter in different ways:</p><p><strong>High knowledge, low confidence:</strong> understands AI but nervous about using it. Worried about making mistakes.</p><p><strong>High confidence, low knowledge:</strong> dives in, tries everything, might get lucky — but isn\'t sure what they don\'t know.</p><p>The sweet spot is both together. That\'s what this course builds.</p>',
    stats: [
      { number: '3', label: 'Metrics that matter' },
      { number: 'Frequency', label: 'How often they use it' },
      { number: 'K + C', label: 'Knowledge × Confidence' },
    ],
    notes: `The knowledge vs. confidence distinction is a key insight. Let it land with a pause. People will nod at the high-confidence-low-knowledge person — they've all met one. The three metrics (Frequency, Knowledge, Confidence) frame how you measure adoption properly.`,
  },

  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'FOUNDATION',
    title: 'Most AI use today is invisible.',
    body: '<p>Someone\'s using ChatGPT to draft an email. Someone else is brainstorming with it. Someone\'s summarising documents. It\'s happening everywhere — but you can\'t see it. So you can\'t manage it, measure it, or build capability around it.</p>',
    notes: `This should feel slightly surprising — like naming something people hadn't quite articulated. "Most AI use today is invisible" is the headline. Let it breathe. The implication is: you can't govern what you can't see, and that's the real challenge for most organisations.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'FOUNDATION',
    badge: 'KEY INSIGHT',
    title: 'FOMO is a terrible strategy',
    body: '<p>What fills the gap when you can\'t see what\'s happening and don\'t have a clear strategy? Fear of missing out.</p><p>FOMO leads to solutions in search of problems. Tools that don\'t get used. Pilots that don\'t scale. Initiatives that start with momentum and then stall because the foundation wasn\'t there.</p>',
    callout: {
      title: 'The better question',
      body: 'Not "Should we use AI?" — that ship has sailed. The question is: "How is AI already being used in our organisation, and what do we do with that?"',
    },
    notes: `The FOMO call-out should be matter-of-fact, not preachy. You've seen this pattern. You're naming it, not judging it. The question reframe at the end is the real payload of this whole module — it's the mindset shift. Pause after the callout. Let people sit with the reframe. This changes how they think about the problem.`,
  },

  // ── Foundation: Pulse Check ──────────────────
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'FOUNDATION',
    title: 'Where is your team right now?',
    poll: {
      question: 'How would you describe your organisation\'s current relationship with AI?',
      options: [
        'Curious but cautious — we haven\'t really started',
        'Experimenting — some people are using it individually',
        'Adopting — we have some structured initiatives',
        'Scaling — AI is part of how we work',
      ],
    },
    notes: `This poll tells you where the room is. In most sessions, the majority lands on "Experimenting" — which is the sweet spot for this workshop. If they're mostly "Curious but cautious", slow down the pace and add more foundational context. If they're "Adopting" or "Scaling", push deeper on governance and use case prioritisation. Read the results aloud and acknowledge them — it makes people feel seen.`,
  },

];
