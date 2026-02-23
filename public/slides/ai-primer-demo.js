/* ============================================
   AI Primer — Full Slide Deck
   Built from AIA Workshop Content Modules
   7 sections, ~30 slides
   ============================================ */

const AI_PRIMER_SLIDES = [

  // ============================================
  // SECTION 1: FOUNDATION & WELCOME (4 slides)
  // ============================================

  // 1. Cover
  {
    type: 'cover',
    theme: 'gradient',
    title: 'AI Primer',
    subtitle: 'Get your team aligned and AI-ready. Built for any tool. Designed to last.',
    notes: `Welcome everyone. This is the AI Primer — a half-day workshop designed to give your team a shared understanding of AI: what it is, how it works, and how to start using it well. We're not here to turn you into engineers. We're here to make sure you can have a smart conversation about AI and start applying it tomorrow.`,
  },

  // 2. Statement — anchor idea
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

  // 3. Impact stats
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

  // 4. Opening poll — where is the room?
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
    notes: `This tells you where the room is. In most sessions, the majority lands on "Experimenting" — which is the sweet spot. If mostly "Curious but cautious", slow down. If "Adopting" or "Scaling", push deeper on governance and use case prioritisation.`,
  },


  // ============================================
  // SECTION 2: WHAT IS AI (6 slides)
  // ============================================

  // 5. Section divider
  {
    type: 'section',
    theme: 'gradient',
    sectionLabel: 'SECTION 2',
    title: 'What is AI?',
    subtitle: 'From pattern recognition to large language models',
    notes: `Transition: "Now that we know where the room is, let's build a shared foundation. What is AI actually doing?"`,
  },

  // 6. Training vs inference
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'Two phases of every AI system',
    body: '<p><strong>Training</strong> is when the AI learns. It processes vast amounts of data — text, images, code — and builds an internal model of patterns and relationships. This takes weeks and costs millions.</p><p><strong>Inference</strong> is when you use it. The model applies what it learned to new inputs. This is what happens every time you send a prompt. It takes seconds.</p>',
    callout: {
      title: 'The key distinction',
      body: 'AI doesn\'t think when you use it. It pattern-matches. The training baked the patterns in. Inference just activates them. That\'s why it can be confidently wrong — it\'s optimising for plausibility, not truth.',
    },
    notes: `This is crucial. Most people think AI "thinks" in real-time. It doesn't. The training is the learning phase. Using it is just activating those frozen patterns. Use this to explain why hallucinations happen.`,
  },

  // 7. Quiz — how does an LLM work?
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
    notes: `Good pulse-check. Most people guess wrong — common wrong answer is A (searching the internet). Use this to explain that LLMs are prediction engines, not search engines. Correct answer is B. After they answer, explain: "It's literally predicting the next word, one token at a time. That's why it can sometimes be confidently wrong."`,
  },

  // 8. Interactive — text completion visualisation
  {
    type: 'split',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'See it in action: next-token prediction',
    body: '<p>This is how AI writes. One word at a time, each chosen from a probability distribution. It doesn\'t plan a sentence — it predicts the next most likely word, then the next, then the next.</p>',
    media: { type: 'iframe', src: 'interactives/text-completion.html' },
    notes: `This interactive demo shows the prediction process in real time. Click through each step to show how the model selects from candidate words based on probability. Use the different example prompts (business email, creative story, AI explanation) to show it works across contexts. Key teaching point: "No understanding. No planning. Just probability."`,
  },

  // 9. Emergent abilities
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'WHAT IS AI',
    title: 'What emerged from scale',
    body: '<p>As language models got bigger, something unexpected happened. Abilities appeared that nobody explicitly programmed:</p>',
    stats: [
      { number: 'Reasoning', label: 'Step-by-step logic' },
      { number: 'Translation', label: 'Between languages' },
      { number: 'Code', label: 'Writing & debugging' },
    ],
    callout: {
      title: 'Why this matters',
      body: 'These "emergent abilities" are why AI feels different now. The model wasn\'t taught to reason — but with enough patterns, something that looks like reasoning appeared. This is both exciting and worth being cautious about.',
    },
    notes: `This explains why AI feels like a step change. GPT-2 couldn't do this. GPT-4 can. The capabilities emerged from scale, not programming. But "looks like reasoning" is different from "actually reasoning" — important nuance.`,
  },

  // 10. Mental model — System 1 and System 2
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'WHAT IS AI',
    title: 'A useful mental model',
    body: '<p>Daniel Kahneman described two types of human thinking:</p><p><strong>System 1:</strong> Fast, intuitive, automatic — like recognising a face or catching a ball.</p><p><strong>System 2:</strong> Slow, deliberate, analytical — like solving a maths problem or planning a trip.</p><p>Current AI is extremely good System 1 thinking — fast pattern recognition at scale. It\'s getting better at System 2, but that\'s where humans still have the edge.</p>',
    callout: {
      title: 'What this means in practice',
      body: 'Use AI where speed and pattern-matching matter (drafting, summarising, brainstorming). Keep humans in the loop where careful reasoning and judgment matter (strategy, ethics, high-stakes decisions).',
    },
    notes: `Kahneman's framework gives people a mental model for when to use AI and when not to. System 1 = AI's sweet spot. System 2 = humans still needed. This maps directly to the delegation question in the 4 Ds.`,
  },


  // ============================================
  // SECTION 3: RISKS & RESPONSIBILITIES (5 slides)
  // ============================================

  // 11. Section divider
  {
    type: 'section',
    theme: 'gradient',
    sectionLabel: 'SECTION 3',
    title: 'Risks & Responsibilities',
    subtitle: 'What can go wrong and how to stay safe',
    notes: `Transition: "Now you understand what AI is doing under the hood. But what happens when it goes wrong? Let's talk about the real risks — not to scare you, but so you can use AI with your eyes open."`,
  },

  // 12. Interactive — risk radar
  {
    type: 'split',
    theme: 'dark',
    sectionLabel: 'RISKS',
    title: 'The AI risk landscape',
    body: '<p>Every powerful technology comes with risks. AI is no different. The difference is how prepared you are.</p><p>Explore the six key risk areas your team needs to understand.</p>',
    media: { type: 'iframe', src: 'interactives/risk-radar.html' },
    notes: `Walk through each risk on the radar. Start with hallucinations — it's the most common and most relatable. Ask: "Has anyone had AI confidently tell them something wrong?" Usually gets good stories. Then cover bias and data security. Save regulation and deepfakes for lighter treatment unless the audience is in a regulated sector.`,
  },

  // 13. Quiz — hallucination scenario
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'RISKS',
    badge: 'SCENARIO',
    title: 'Spot the risk',
    quiz: {
      question: 'A colleague uses AI to draft a client proposal and sends it without review. The proposal cites three case studies that don\'t exist. What type of AI risk is this?',
      options: [
        'Bias — the AI favoured certain outcomes',
        'Hallucination — the AI generated plausible but false information',
        'Data security — the AI leaked confidential data',
        'Over-reliance — the colleague trusted AI output without verification',
      ],
      correct: 1,
    },
    notes: `This is a trick question — B and D are both correct. The primary risk is hallucination (B), but the root cause is over-reliance (D). Use this to teach: "The AI will hallucinate. That's a feature of how it works, not a bug you can fix. Your job is to have processes that catch it." This is the human-in-the-loop principle.`,
  },

  // 14. Human in the loop
  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'RISKS',
    title: 'The non-negotiable: human in the loop',
    body: '<p>Every AI workflow needs a point where a human reviews, validates, and takes responsibility for the output. This isn\'t optional — it\'s the foundation of responsible AI use.</p>',
    callout: {
      title: 'The rule of thumb',
      body: 'If you wouldn\'t let an enthusiastic but inexperienced intern publish it without review, don\'t let AI do it either. Same energy, same oversight.',
    },
    notes: `This is the single most important risk mitigation message. The intern analogy always lands. Reinforce: "AI is a tool. You are responsible for what it produces. Every time." This maps to the Diligence dimension of the 4 Ds.`,
  },

  // 15. EU AI Act awareness
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'RISKS',
    title: 'The regulatory landscape is moving fast',
    body: '<p>The EU AI Act creates a risk-based framework for AI regulation. It classifies AI systems into risk tiers — from minimal to unacceptable — with increasing compliance requirements.</p><p>Even if you\'re not in the EU, this matters. It sets the global standard, much like GDPR did for data privacy.</p>',
    callout: {
      title: 'What this means for your team',
      body: 'Build governance early. Document your AI usage. Know which risk tier your use cases fall into. It\'s much easier to build compliance in from the start than to retrofit it later.',
    },
    notes: `Light touch on regulation unless the audience is in a regulated sector. Key message: governance isn't a "later" problem. The EU AI Act is real, it's happening, and it follows the GDPR playbook. If the audience is public sector or financial services, spend more time here.`,
  },


  // ============================================
  // SECTION 4: HOW IT WORKS (4 slides)
  // ============================================

  // 16. Section divider
  {
    type: 'section',
    theme: 'gradient',
    sectionLabel: 'SECTION 4',
    title: 'How It Works',
    subtitle: 'Tokens, context windows, and the machinery of language',
    notes: `Transition: "We've covered what AI is and what can go wrong. Now let's peek under the hood — just enough to make you a better user. You don't need to be an engineer, but understanding a few key concepts makes everything else click."`,
  },

  // 17. Tokens and context
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'HOW IT WORKS',
    title: 'Tokens: the atoms of AI language',
    body: '<p>AI doesn\'t read words — it reads <strong>tokens</strong>. A token is roughly ¾ of a word. "Unbelievable" becomes three tokens: "un", "believ", "able".</p><p>The <strong>context window</strong> is how many tokens the AI can see at once — like its working memory. Bigger windows mean longer conversations and more context, but there are always limits.</p>',
    stats: [
      { number: '~¾', label: 'Words per token' },
      { number: '128K', label: 'Tokens (GPT-4 window)' },
      { number: '200K', label: 'Tokens (Claude window)' },
    ],
    notes: `Tokens are important because they explain why AI sometimes "forgets" earlier parts of a long conversation — it literally runs out of working memory. The token count also affects cost. Key teaching: "Every prompt you send costs tokens. Every response costs tokens. Being concise isn't just good practice — it's efficient."`,
  },

  // 18. System prompts
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'HOW IT WORKS',
    title: 'System prompts: setting the stage',
    body: '<p>Before you type anything, the AI has already received instructions. These <strong>system prompts</strong> define its personality, rules, and constraints.</p><p>When you use ChatGPT, Claude, or Copilot — each has been given a system prompt that shapes how it responds. This is why different tools feel different even though they use similar models.</p>',
    callout: {
      title: 'Think of it like a job brief',
      body: 'The system prompt says: "You are a helpful assistant. Be concise. Don\'t make things up." Your prompt then says what you actually want. The better both are, the better the output.',
    },
    notes: `System prompts explain why custom AI tools (like copilots) feel different from generic ChatGPT. They also lead into prompting — if the system prompt sets the stage, your prompt directs the performance. This is the bridge to Section 5.`,
  },

  // 19. Temperature and randomness
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'HOW IT WORKS',
    title: 'Temperature: creativity vs precision',
    body: '<p><strong>Temperature</strong> controls how "creative" the AI is. At low temperature, it always picks the most probable next word — safe, predictable, repetitive. At high temperature, it explores less likely options — surprising, creative, sometimes wild.</p>',
    stats: [
      { number: '0.0', label: 'Deterministic — same answer every time' },
      { number: '0.7', label: 'Balanced — creative but coherent' },
      { number: '1.5', label: 'High creativity — unpredictable' },
    ],
    callout: {
      title: 'When it matters',
      body: 'Writing a legal summary? Low temperature. Brainstorming campaign slogans? High temperature. Most tools set this for you, but understanding it helps you get better results.',
    },
    notes: `This connects back to the text completion demo. In that demo, the "pick" wasn't always the highest probability word — that's temperature at work. Most users don't set temperature directly, but understanding it explains why AI sometimes gives different answers to the same question.`,
  },


  // ============================================
  // SECTION 5: PROMPTING & CONTEXT ENGINEERING (6 slides)
  // ============================================

  // 20. Section divider
  {
    type: 'section',
    theme: 'gradient',
    sectionLabel: 'SECTION 5',
    title: 'Prompting & Context Engineering',
    subtitle: 'The skill that makes everything else work',
    notes: `Transition: "This is the practical section. Everything we've covered so far — pattern recognition, tokens, temperature — it all comes together in how you talk to AI. This is the skill that separates people who get mediocre results from people who get great ones."`,
  },

  // 21. Five core techniques
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    title: 'Five techniques that change everything',
    body: '<p>You don\'t need to memorise prompting frameworks. You need five principles:</p><p><strong>1. Be clear and specific</strong> — vague prompts get vague answers</p><p><strong>2. Provide context</strong> — tell the AI who you are, what you need, and why</p><p><strong>3. Assign a role</strong> — "Act as a senior marketing strategist" changes everything</p><p><strong>4. Iterate</strong> — treat it as a conversation, not a search engine</p><p><strong>5. Shape the output</strong> — specify format, length, tone, and audience</p>',
    notes: `Walk through each technique briefly. The most powerful shift for beginners is usually #3 (role-playing) and #4 (iteration). Most people use AI like Google — one shot, hope for the best. Teach them it's a conversation. "Your first prompt is a draft. Refine it."`,
  },

  // 22. The world's most powerful prompt
  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    title: '"What questions should you ask me before you start?"',
    body: '<p>This single prompt transforms your AI interaction. Instead of trying to anticipate everything the AI needs, let it tell you. It will ask clarifying questions, surface assumptions, and identify gaps in your brief — just like a good colleague would.</p>',
    callout: {
      title: 'Try it now',
      body: 'Next time you\'re about to write a complex prompt, start with this question instead. Watch how much better the output gets when the AI has the context it needs.',
    },
    notes: `This is the single most memorable takeaway for most attendees. Say it dramatically: "This is the world's most powerful prompt." Pause. Let it land. Then explain why: it flips the dynamic. Instead of you guessing what AI needs, AI tells you. It's collaborative. It's how experts use AI.`,
  },

  // 23. Context engineering
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'PROMPTING',
    title: 'From prompting to context engineering',
    body: '<p>Prompting is what you type. <strong>Context engineering</strong> is what you set up <em>before</em> you type. It\'s the difference between a one-off question and a system that consistently delivers great results.</p>',
    stats: [
      { number: 'Embeddings', label: 'Structured document chunks' },
      { number: 'RAG', label: 'AI that searches your data' },
      { number: 'Few-shot', label: 'Learning from examples' },
    ],
    callout: {
      title: 'The direction of travel',
      body: 'These are the techniques behind AI assistants that "know" your company information or can search your documents. They\'re powerful, increasingly accessible, and worth understanding.',
    },
    notes: `This is forward-looking content. Most attendees won't build RAG systems, but they should know these concepts exist. The key message: "Prompting is step one. Context engineering is what makes AI genuinely useful at work."`,
  },

  // 24. Quiz — prompting
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'PROMPTING',
    badge: 'QUICK CHECK',
    title: 'Which prompt would get better results?',
    quiz: {
      question: 'You need help writing a client update email. Which prompt would produce a better result?',
      options: [
        '"Write me an email"',
        '"Write a concise client update email for a project manager audience. The project is on track, budget is 10% under, and the next milestone is in two weeks. Use a professional but warm tone."',
        '"Write an email. Make it good."',
        '"Email about the project"',
      ],
      correct: 1,
    },
    notes: `Obviously B. But use this to show the contrast. Read option A aloud, then B. Ask: "Which one gives the AI more to work with?" Then: "Notice what B includes: audience, context, constraints, tone. Every one of those details makes the output better."`,
  },

  // 25. Text input — write a prompt
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    title: 'Your turn: write a prompt',
    body: '<p>Think about a real task from your work. Using the five techniques we just covered, write a prompt that would get you a genuinely useful result from an AI.</p>',
    textInput: {
      prompt: 'Write a prompt for a real work task. Include: role, context, specific request, and desired output format.',
      placeholder: 'e.g. "Act as a senior HR consultant. I\'m preparing for a difficult performance conversation with a team member who has missed three deadlines. Draft 5 key talking points that are direct but empathetic, in bullet format..."',
    },
    callout: {
      title: 'Remember the five principles',
      body: 'Be specific. Provide context. Assign a role. Plan to iterate. Shape the output.',
    },
    notes: `Give them 2 minutes. Walk the room. Read a few responses aloud with permission and provide feedback. Look for: specificity, role-setting, context, output shaping. Common mistake: still too vague. Push them to add detail.`,
  },


  // ============================================
  // SECTION 6: APPLYING AI (4 slides)
  // ============================================

  // 26. Section divider
  {
    type: 'section',
    theme: 'gradient',
    sectionLabel: 'SECTION 6',
    title: 'Applying AI',
    subtitle: 'From understanding to action',
    notes: `Transition: "You now know what AI is, how it works, the risks, and how to talk to it. This section is about putting it all together — expanding your sense of what's possible and giving you a framework for deciding where to start."`,
  },

  // 27. Interactive — capabilities explorer
  {
    type: 'split',
    theme: 'light',
    sectionLabel: 'APPLYING AI',
    title: 'What AI can (and can\'t) do',
    body: '<p>Most people\'s idea of what AI can do is narrower than reality. Explore the capabilities where AI genuinely excels — and where you still need humans in the loop.</p>',
    media: { type: 'iframe', src: 'interactives/capabilities-explorer.html' },
    notes: `Use the toggle between "AI excels at" and "Humans needed" to expand people's thinking. Key message: "AI is great at generating options and exploring angles. Humans are great at judgment and decision-making. The best results come from collaboration."`,
  },

  // 28. Interactive — The 4 Ds framework
  {
    type: 'split',
    theme: 'dark',
    sectionLabel: 'APPLYING AI',
    title: 'The 4 Ds: your decision framework',
    body: '<p>Before applying AI to any task, run it through four questions. This framework helps you decide what to delegate, how to describe it, whether you can judge the output, and if you\'re being responsible.</p>',
    media: { type: 'iframe', src: 'interactives/four-ds.html' },
    notes: `The 4 Ds is the practical expression of everything they've learned. Walk through each D with the interactive. Delegation maps to System 1/2. Description maps to prompting. Discernment maps to risk awareness. Diligence maps to human-in-the-loop. Ask: "Can anyone think of a task that fails one of these tests?"`,
  },

  // 29. Text input — your first use case
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
    notes: `This is where it gets personal and practical. Give them 2 minutes to think and type. Read a few responses aloud (with permission) and validate them. Common good answers: meeting summaries, email drafting, report writing, data categorisation. If someone says something risky ("medical diagnosis"), use it as a teachable moment about where AI needs human oversight.`,
  },


  // ============================================
  // SECTION 7: AI FLUENCY & CLOSE (5 slides)
  // ============================================

  // 30. Section divider
  {
    type: 'section',
    theme: 'gradient',
    sectionLabel: 'SECTION 7',
    title: 'AI Fluency',
    subtitle: 'The capability that brings it all together',
    notes: `Transition: "We're in the home stretch. Everything we've covered today — understanding, risk awareness, prompting skills — adds up to something bigger. We call it AI fluency."`,
  },

  // 31. Interactive — fluency levels
  {
    type: 'split',
    theme: 'dark',
    sectionLabel: 'AI FLUENCY',
    title: 'Three levels of AI fluency',
    body: '<p>AI fluency is knowing when and how to use AI — and crucially, when not to. It\'s judgment. It\'s confidence grounded in understanding.</p><p>Progression means moving from "What can AI do for me?" to "How do we build together?"</p>',
    media: { type: 'iframe', src: 'interactives/fluency-levels.html' },
    notes: `Walk through the three levels. Most attendees after this workshop are moving from Literacy to Fluency. Emphasise that fluency is where most value happens — you don't need to be an architect to get massive benefit. The interactive auto-reveals, then they can click to explore.`,
  },

  // 32. Poll — where are you now?
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'AI FLUENCY',
    title: 'Where are you now?',
    poll: {
      question: 'After today\'s session, which level of AI fluency best describes where you are?',
      options: [
        'Basic Literacy — I can use AI for defined tasks',
        'Moving to Fluency — I\'m starting to think with AI',
        'Fluency — I collaborate with AI effectively',
        'Moving to Expertise — I\'m designing AI workflows',
      ],
    },
    notes: `This mirrors the opening poll and shows progression. Compare the results: most people should have moved at least one level from where they started. If the room started at "Curious but cautious" and is now at "Basic Literacy / Moving to Fluency", that's a great outcome.`,
  },

  // 33. Five takeaways
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'SUMMARY',
    title: 'Five things to remember',
    body: '<p><strong>1. AI is pattern recognition.</strong> It\'s not intelligent in the human sense, but it\'s remarkably useful.</p><p><strong>2. AI has real capabilities and real limits.</strong> Know both.</p><p><strong>3. Prompting is just clear thinking.</strong> Write clearly, you\'ll get better results.</p><p><strong>4. Fluency is judgment.</strong> Move from "I can use this tool" to "I know when and how to use AI well".</p><p><strong>5. Human + AI is the future.</strong> Not humans replaced by AI. Humans working better with AI.</p>',
    callout: {
      title: 'The rest is implementation detail',
      body: 'If you understand these five things, you can learn anything else you need to learn.',
    },
    notes: `This is the summary slide. Read each point slowly. Pause after #5. Then: "The rest is implementation detail. If you understand these five things, you can learn anything else you need to learn." Let that land. This is the mic-drop moment of the workshop.`,
  },

  // 34. Close
  {
    type: 'cover',
    theme: 'gradient',
    title: 'Thank You',
    subtitle: 'Start using AI this week. Start small. Stay curious. Stay critical.',
    notes: `Final slide. Keep it brief: "Thank you for your time and engagement. My challenge to you: use AI for one real task this week. Start small. Stay curious. And most importantly — stay critical. You now have the knowledge to use AI well. Go use it." Then open for questions.`,
  },

];
