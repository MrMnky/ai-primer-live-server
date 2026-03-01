/* ============================================
   Section 2 — What is AI
   Understanding AI, LLMs, and the landscape
   9 modules · ~21 minutes
   ============================================ */

const SECTION_2_WHAT_IS_AI = [

  // ── 2.0  Section opener ──────────────────────
  {
    type: 'section',
    theme: 'dark',
    sectionLabel: 'SECTION 2',
    title: 'What is AI',
    subtitle: 'From pattern recognition to platform shift',
    notes: `This is the meatiest section of the course. We go from the fundamental definition of AI through LLMs, emergence, progress trajectory, and the foundation model landscape. The goal is that by the end, people understand how these systems actually work — not at an engineering level, but enough to make informed decisions.`,
  },

  // ── 2.1  What is AI? ────────────────────────
  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'AI is any situation where a machine carries out a task that usually requires human intelligence.',
    body: '<p>Not mysterious. Not magic. Just a tool doing something we\'d normally have to think through ourselves. Think of it as outsourced cognitive effort.</p>',
    notes: `Start with the definition, plain and simple. Don't dress it up. The "outsourced cognitive effort" framing is important — it demystifies the whole thing. If someone asks "but what about consciousness?" you can say: "That's not what's happening here. AI isn't conscious. It's very good at spotting patterns and replicating them."`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'WHAT IS AI',
    badge: 'KEY CONCEPT',
    title: 'Deterministic vs Probabilistic',
    body: `<p><strong>Traditional software is deterministic.</strong> Same input, same output, every time. You press save, the file saves. Predictable. Reliable.</p>
<p><strong>AI is probabilistic.</strong> It doesn't calculate the correct answer — it predicts the most likely response. When you use ChatGPT or Claude, it's saying: "Given everything I've learned, what would a human most likely write here?"</p>
<p>This is the single most important distinction in the entire course.</p>`,
    notes: `Land this hard. Deterministic vs. probabilistic is the anchor concept for everything that follows. People are used to software being deterministic — same input, same output. AI doesn't work that way, and that's not a flaw, it's the mechanism. Make sure this sinks in before moving on.`,
  },

  {
    type: 'statement',
    theme: 'gradient',
    sectionLabel: 'WHAT IS AI',
    title: 'AI generates plausible responses. Not correct ones.',
    body: '<p>Plausible does not mean correct. This is not a limitation we\'ll fix with better engineering. This is how the system fundamentally works.</p>',
    callout: {
      title: 'The intern analogy',
      body: 'Imagine a very fast intern who has read everything on the internet but understood none of it. They produce fluent first drafts — but you can\'t trust them without checking. That\'s AI.',
    },
    notes: `The "plausible not correct" insight is the payload. Don't rush past it. The intern analogy always lands — it's relatable and it sets the right expectation. The question isn't "How do we make AI correct?" It's "How do we use something that's very good at plausibility in places where plausibility is actually useful?" That reframe changes everything.`,
  },

  // ── 2.2  Training vs Inference ───────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'Training vs Inference',
    body: `<p>Two completely different phases:</p>
<p><strong>Training</strong> — slow, expensive, happens once. The model is shown vast amounts of data and adjusts itself based on patterns. Like learning to bake over months or years.</p>
<p><strong>Inference</strong> — fast, cheap, happens billions of times a day. You type a question, you get a response. Like baking a cake using what you already know.</p>
<p>During inference, the model is not learning anything new. It's applying what it already knows.</p>`,
    notes: `The baking analogy works well here. Training = learning to bake (slow, developmental). Inference = actually baking a cake (fast, applying what you know). Emphasise that inference doesn't involve any learning. This sets up the misconception debunk on the next slide.`,
  },

  // ── 2.2b  Training vs Inference Interactive ──
  {
    type: 'graphic',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'Explore: Training vs Inference',
    subtitle: 'See the two phases side by side — what happens during each one.',
    graphic: {
      id: 'training-vs-inference',
      responsive: true,
      preload: true,
    },
    notes: `Interactive deep-dive into the two phases. Participants explore what happens during training (data ingestion, pattern learning, parameter tuning) versus inference (prompt processing, token generation, response). Debrief: "Why does it matter that inference doesn't involve learning?"`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    badge: 'MISCONCEPTION',
    title: 'ChatGPT does not learn from your conversations.',
    body: `<p>People often think that chatting with an AI makes it smarter. That your input gets absorbed into the model. <strong>This is not true</strong> — not on paid plans.</p>
<p>The model is a snapshot, frozen at a specific moment in time. Your conversations don't change it. Your input doesn't get absorbed.</p>`,
    callout: {
      title: 'The encyclopaedia analogy',
      body: 'Imagine an encyclopaedia from 2023. You can read it, ask it questions, have a conversation with it. But it doesn\'t change because you\'re using it. In a year, it\'s still the 2023 version.',
    },
    stats: [
      { number: 'Frozen', label: 'Model is a snapshot' },
      { number: 'Private', label: 'Data not absorbed' },
      { number: 'Dated', label: 'Knowledge has a cut-off' },
    ],
    notes: `Clear, definitive, myth-busting. Two implications to land: (1) Privacy — your data isn't being absorbed into the model on paid plans. That's a relief. (2) Currency — the model only knows what it knew when training finished. That's why it can't tell you what happened last week. Both matter for how people think about using these tools.`,
  },

  // ── 2.3  What is AI Summary ──────────────────
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'WHAT IS AI',
    badge: 'RECAP',
    title: 'What we\'ve established so far',
    body: `<p><strong>AI is a program</strong> that handles tasks usually requiring human thinking — by spotting patterns and replicating them.</p>
<p><strong>The model is trained once, then frozen.</strong> It doesn't learn from you. You're using a snapshot.</p>
<p><strong>AI generates plausible responses</strong> based on probability — not correct ones. That distinction changes how you use it.</p>
<p><strong>Data is compressed into patterns</strong>, not stored as facts. The training data is gone. What remains are statistical relationships.</p>`,
    notes: `Quick recap — brisk and confident. This is a tether-back, not new information. Don't linger. Sound like you're checking a box before moving to the interesting bit. Bridge naturally to LLMs: "Now we've got the fundamentals, let's look specifically at Large Language Models."`,
  },

  // ── 2.4  What are LLMs? ─────────────────────
  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'Large Language Models changed everything.',
    body: '<p>Before LLMs, most AI was purpose-built. One system for image recognition, another for chess, another for recommendations. LLMs are different — they\'re general-purpose. You can throw almost anything at them and they\'ll have a go.</p>',
    notes: `Set up the LLM section with the key distinction: general-purpose vs purpose-built. That's why LLMs have taken over. ChatGPT, Claude, Gemini, LLaMA — all LLMs. The flexibility is the breakthrough.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'Why "Large"?',
    body: '<p>Three things make these models "large":</p>',
    stats: [
      { number: 'Petabytes', label: 'of training data' },
      { number: 'Billions', label: 'of parameters (weights)' },
      { number: 'Months', label: 'of compute time' },
    ],
    callout: {
      title: 'The mixing desk',
      body: 'Parameters are like knobs on a studio mixing desk. Billions of them, each tuned during training to capture patterns in the data. That\'s what "large" means — a huge number of tunable components.',
    },
    notes: `The mixing desk analogy is the one that lands best. People can picture a studio desk with hundreds of knobs — now imagine billions. Each one adjusted during training to capture some pattern. That's what the model "knows" — not facts in a database, but a vast set of tuned parameters.`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'WHAT IS AI',
    badge: 'KEY CONCEPT',
    title: 'Patterns, not facts',
    body: `<p>Once training finishes, the data is gone. All those petabytes of text are deleted. What remains are <strong>parameters</strong> — statistical patterns.</p>
<p>The model doesn't have a file that says "Paris is the capital of France." Instead, it learned that "Paris" clusters near "capital", which clusters near "France". It generates the answer from statistical relationships.</p>
<p>That's why it can sound absolutely confident about something completely wrong. It's not evaluating truth. It's predicting what's likely to come next.</p>`,
    notes: `This is the "aha" moment for most people. The Paris example makes it concrete — the model doesn't look up facts, it follows statistical patterns. That's why fluency doesn't equal truth. Land this clearly and let it sink in.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'Many interfaces, few models',
    body: `<p>There are hundreds of AI tools out there — ChatGPT, Claude, Gemini, Copilot, Perplexity, Cursor. They all feel different.</p>
<p>But most run on a small number of underlying models. Like how hundreds of apps exist on iOS, but they all run on the same operating system underneath.</p>
<p>Switching tools often means switching the UI, not the intelligence.</p>`,
    notes: `The app/OS analogy makes the landscape legible. People feel overwhelmed by the number of AI tools. This reframe helps: you're not choosing between hundreds of different intelligences. You're choosing between a handful of core models and a lot of different interfaces. That's much more manageable.`,
  },

  // ── 2.5  Emergent Abilities ──────────────────
  {
    type: 'statement',
    theme: 'gradient',
    sectionLabel: 'WHAT IS AI',
    title: 'Models are developing abilities nobody trained them to have.',
    body: '<p>This is called emergence — capabilities that appear without being explicitly programmed. The model develops abilities it was never trained to have. And we don\'t fully understand why.</p>',
    notes: `Set up the emergence concept with genuine curiosity. This should feel a bit wonder-struck but grounded — not mystical. You're naming something real that researchers are actively studying.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'Real examples of emergence',
    body: `<p><strong>Befriending a crow</strong> — a model understood social dynamics well enough to generate advice that actually worked. Not trained in ornithology.</p>
<p><strong>Converting obsolete video codecs</strong> — a model understood patterns in binary data well enough to reason about format conversion. Not trained for that.</p>
<p><strong>Analysing rail signalling diagrams</strong> — a model caught design errors in a system diagram created by a domain expert. Not trained in rail engineering.</p>
<p>This isn't isolated. Researchers regularly find new things models can do that weren't explicitly taught.</p>`,
    callout: {
      title: 'Why it happens',
      body: 'At large scale, patterns learned for one domain transfer to others. Understanding language deeply enough seems to mean understanding a lot of other things too.',
    },
    notes: `The examples should feel concrete and interesting. The crow story always gets a reaction. The rail signalling one resonates with more technical audiences. Pick whichever lands best for your room. The point is: these aren't cherry-picked — this is a regular pattern.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'Why emergence matters',
    body: `<p>We're in a <strong>discovery phase</strong>. Someone, somewhere, might find an ability in today's models that no one else has discovered yet. A better way to diagnose disease. A clever engineering solution. Something we haven't thought of.</p>
<p>But unpredictability cuts both ways. If models develop abilities we don't expect, that's exciting — and it's also a reminder that we're less in control of what they can do.</p>`,
    stats: [
      { number: 'Discovery', label: 'phase we\'re in' },
      { number: 'Exciting', label: 'new capabilities emerging' },
      { number: 'Concerning', label: 'less predictable systems' },
    ],
    notes: `Balance the dual nature: exciting and concerning, without being alarmist. This is the honest state of things. Models are revealing capabilities we didn't know were in there. That's a discovery opportunity — but it also means we can't fully predict what these systems will do as they scale.`,
  },

  // ── 2.5b Capabilities Explorer Interactive ──
  {
    type: 'graphic',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'Explore: AI Capabilities',
    subtitle: 'What are LLMs good at — and where should you be cautious?',
    graphic: {
      id: 'capabilities-explorer',
      responsive: true,
      preload: true,
    },
    notes: `Interactive exploration. Let participants browse the capability categories for 2-3 minutes. Debrief: "Notice how many of these capabilities weren't explicitly trained — they emerged from understanding language at scale."`,
  },

  // ── 2.6  LLM Progress ───────────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'The trajectory of LLM capabilities',
    body: `<p>The progression isn't linear — it's compounding:</p>
<p><strong>Word Predictors</strong> → <strong>Chat Assistants</strong> → <strong>Tool Users</strong> → <strong>Multimodal</strong> → <strong>Agents</strong> → <strong>Reasoning</strong></p>
<p>Each capability builds on the ones before. And when you combine certain capabilities, you get something qualitatively different — not just incremental improvement.</p>`,
    callout: {
      title: 'The combination effect',
      body: 'Reasoning + tool access is different. A model that can break down a complex problem, plan an approach, use tools to gather information, and adjust based on what it finds. That\'s not a smarter chatbot. That\'s a different category.',
    },
    notes: `Walk through the progression clearly — word predictors, chat, tools, multimodal, agents, reasoning. Then hit the compounding insight: these capabilities don't just add up, they multiply. Reasoning plus tool access isn't "reasoning + tools" — it's something qualitatively new. The combination effect is the real story.`,
  },

  // ── 2.6b  LLM Progress Interactive ──────────
  {
    type: 'graphic',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'Explore: The Evolution of AI Models',
    subtitle: 'Navigate the timeline of LLM capabilities — from word predictors to reasoning agents.',
    graphic: {
      id: 'llm-progress-v2',
      responsive: true,
      preload: true,
    },
    notes: `Interactive timeline of AI model evolution. Participants explore eras and see how capabilities built on each other. Debrief: "Which capability jump surprised you most? Which combination do you think matters most for your work?"`,
  },

  {
    type: 'statement',
    theme: 'gradient',
    sectionLabel: 'WHAT IS AI',
    title: 'This is a platform shift. Not a tool upgrade.',
    body: '<p>Think about smartphones. At first, just phones. Then email. Then apps. Then sensors. Then APIs connecting to your life. At each step, someone could have said "It\'s just a phone with more features." That would have missed the point entirely.</p><p>LLM progress isn\'t a feature roadmap. It\'s platforms changing. It\'s how work gets done changing.</p>',
    notes: `The smartphone analogy is the payload. Land it clearly — not as hype, but as a genuine shift in category. "This is like that" should feel like a measured observation, not breathless excitement. The question at the end: "Are we ready for what gets unlocked when they do?" — leave it hanging. That's the bridge to risks.`,
  },

  // ── 2.6b  Media Demo: Background Image ──────
  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'We\'re building on a foundation that didn\'t exist five years ago.',
    body: '<p>The infrastructure, the models, the interfaces — all new. And all accelerating.</p>',
    media: {
      type: 'image',
      src: '/media/ai-network-bg.svg',
      position: 'background',
      fit: 'cover',
      overlay: 0.55,
      alt: 'AI neural network visualisation',
    },
    notes: `Background image demo slide — statement over a full-bleed visual. The overlay keeps text readable. This shows how a bold visual can add emotional weight to a simple statement without distracting from it.`,
  },

  // ── 2.6c  Media Demo: Split Image ─────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'AI milestones: faster than you think',
    body: `<p>From academic curiosity to global platform in under a decade.</p>
<p>The timeline isn't just accelerating — the gaps between breakthroughs are shrinking. Each one builds on the last.</p>`,
    media: {
      type: 'image',
      src: '/media/ai-timeline.svg',
      position: 'split',
      fit: 'contain',
      alt: 'Timeline of key AI milestones from 1956 to 2022',
    },
    notes: `Split layout demo — text on left, image on right. The timeline visual gives people a reference point. Don't read the timeline out — let people absorb it while you narrate the acceleration story.`,
  },

  // ── 2.6d  Media Demo: Inline Video ────────
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'WHAT IS AI',
    title: 'See it in action',
    body: `<p>A quick look at how these models actually work in practice — from prompt to response.</p>`,
    media: {
      type: 'video',
      src: 'https://youtu.be/IpEA12_6VFc',
      position: 'inline',
      aspectRatio: '16/9',
    },
    notes: `Inline video demo — YouTube embed below the text content. This is 3Blue1Brown's neural network explainer. Good for visual learners. Play 1-2 minutes if time allows, otherwise skip — it's here as a reference people can revisit.`,
  },

  // ── 2.7  Foundation Models ───────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'The foundation model landscape',
    body: `<p>Training an LLM costs billions. Only a handful of organisations can do it:</p>
<p><strong>OpenAI</strong> — GPT models<br>
<strong>Anthropic</strong> — Claude<br>
<strong>Google</strong> — Gemini<br>
<strong>Meta</strong> — LLaMA<br>
<strong>Microsoft</strong> — partnerships with OpenAI</p>
<p>That's the foundation layer. Everything else is wrapping and interface.</p>`,
    notes: `Keep this practical and matter-of-fact. The room needs to understand the actual structure: few model providers, many tool wrappers. This isn't about picking favourites — it's about understanding concentration. When you choose a tool, you're partly choosing which foundation model you're reliant on.`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'WHAT IS AI',
    title: 'Strategic implications',
    body: `<p>When you choose an AI tool, you're also choosing:</p>
<p><strong>Cost</strong> — different models, different pricing at scale.<br>
<strong>Risk</strong> — dependent on one organisation's uptime and roadmap.<br>
<strong>Data governance</strong> — where does your data go? Different providers, different policies.<br>
<strong>Capabilities</strong> — locked into that model's strengths and weaknesses.<br>
<strong>Vendor dependency</strong> — switching means more than changing the UI.</p>`,
    notes: `Move through the five implications briskly. Each one clearly stated, not laboured. This is practical thinking for decision-makers. The tone is advisory, not alarmist. The concentration point matters but isn't frightening — it's just reality.`,
  },

  // ── 2.8  LLMs Summary ───────────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    badge: 'RECAP',
    title: 'What we know about LLMs',
    body: `<p><strong>General-purpose systems</strong> trained on vast data, billions of parameters.</p>
<p><strong>We\'re still discovering</strong> what they can do — emergent abilities appear regularly.</p>
<p><strong>Most tools sit on a few big models</strong> — the landscape is concentrated.</p>
<p><strong>Progress is compounding</strong>, not linear — each capability becomes a building block.</p>`,
    notes: `Quick anchor before the handoff. Don't linger — this is a checkpoint, not new content. The energy should say "we've covered a lot, and it all holds together."`,
  },

  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'The question isn\'t "Will this get better?" — of course it will.',
    body: '<p>The real question: <strong>Are we ready for what comes next?</strong></p><p>That\'s what we need to focus on. Not whether the technology will improve. It will. The question is whether we understand where it fails, and how to use it effectively.</p>',
    notes: `This is the bridge to Section 3 (Risks). The rhetorical question should land with weight — not as hype, but as a genuine shift in focus. "So let's talk about what can go wrong." That's the natural transition.`,
  },

  // ── 2.9  Break Transition ────────────────────
  {
    type: 'section',
    theme: 'gradient',
    sectionLabel: 'BREAK',
    title: 'Quick break',
    subtitle: 'We\'ve covered what AI is and how it works. After the break: what can go wrong, and how do we actually use it.',
    notes: `Brisk, confident, light. This is a palate cleanser. Quick energy, natural pacing. "Right, we've covered a lot of ground. Have a quick break. Back in a few." Don't oversell it.`,
  },

];
