/* ============================================
   AI Primer — Demo Slide Deck
   6 slides demonstrating all slide types
   ============================================ */

const AI_PRIMER_SLIDES = [

  // 1. Cover
  {
    type: 'cover',
    theme: 'gradient',
    title: 'AI Primer',
    subtitle: 'Get your team aligned and AI-ready. Built for any tool. Designed to last.',
    notes: `Welcome everyone. This is the AI Primer — a half-day workshop designed to give your team a shared understanding of AI: what it is, how it works, and how to start using it well. We're not here to turn you into engineers. We're here to make sure you can have a smart conversation about AI and start applying it tomorrow.`,
  },

  // 2. Statement slide (dark)
  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'FOUNDATION',
    title: 'AI isn\'t magic. It\'s pattern recognition at scale.',
    body: '<p>The key thing to understand is that AI systems learn from examples, spot patterns, and make predictions. That\'s it. Everything else — the hype, the fear, the excitement — sits on top of that simple idea.</p>',
    callout: {
      title: 'Think of it this way',
      body: 'When you teach a child to recognise a cat, you show them lots of cats. AI works the same way — just with millions of examples and mathematical patterns instead of a toddler\'s intuition.',
    },
    notes: `This is the anchor idea for the whole session. If they get nothing else, they should leave understanding that AI = pattern recognition at scale. Use the cat analogy — it always lands. Pause here and ask: "Does that framing make sense?" before moving on.`,
  },

  // 3. Stats slide
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHY THIS MATTERS',
    title: 'What happens after an AI Primer',
    body: '<p>Based on 224 interviews across our 2024–2025 workshops, here\'s what changes when teams go through this programme:</p>',
    stats: [
      { number: '+86%', label: 'Knowledge of AI' },
      { number: '+55%', label: 'Confidence in use' },
      { number: '+50%', label: 'Frequency of AI use' },
    ],
    notes: `These are real numbers from our post-workshop interviews. 224 people across multiple clients. The confidence number is the one to emphasise — people don't just learn about AI, they feel ready to use it. That's the gap we're closing.`,
  },

  // 4. Quiz slide
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'WHAT IS AI',
    badge: 'QUICK CHECK',
    title: 'Let\'s test that',
    quiz: {
      question: 'Which of these is the best description of how a large language model (like ChatGPT) generates text?',
      options: [
        'It searches the internet for the best answer',
        'It predicts the most likely next word based on patterns in its training data',
        'It understands language the same way humans do',
        'It copies and pastes from a database of pre-written responses',
      ],
      correct: 1,
    },
    notes: `This is a good pulse-check. Most people will guess wrong — and that's fine. The common wrong answer is A (searching the internet). Use this to explain that LLMs are prediction engines, not search engines. The correct answer is B. After they answer, explain: "It's literally predicting the next word, one token at a time. That's why it can sometimes be confidently wrong — it's optimising for plausibility, not truth."`,
  },

  // 5. Poll slide
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'YOUR CONTEXT',
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
    notes: `This tells you where the room is. In most sessions, the majority lands on "Experimenting" — which is the sweet spot for this workshop. If they're mostly "Curious but cautious", slow down the pace and add more foundational context. If they're "Adopting" or "Scaling", you can push deeper on governance and use case prioritisation.`,
  },

  // 6. Text input slide
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'APPLYING AI',
    title: 'Your first use case',
    body: '<p>Think about your own role. What\'s one task you do regularly that involves summarising, drafting, analysing, or categorising information? That\'s probably a good candidate for AI.</p>',
    textInput: {
      prompt: 'Describe one task in your role where AI could save you time or improve quality:',
      placeholder: 'e.g. "I spend 2 hours every week summarising client meeting notes into action items..."',
    },
    callout: {
      title: 'Good use cases tend to be...',
      body: 'Repetitive, language-heavy, and not safety-critical. If you do it every week, it takes 30+ minutes, and a small error won\'t cause real harm — that\'s a great starting point.',
    },
    notes: `This is where it gets personal and practical. Give them 2 minutes to think and type. Read a few responses aloud (with permission) and validate them. Common good answers: meeting summaries, email drafting, report writing, data categorisation. If someone says something risky (like "medical diagnosis"), use it as a teachable moment about where AI needs human oversight.`,
  },

];
