/* ============================================
   Section 4 — How AI Works
   Text completion, tokens, chat windows, context, reasoning
   5 modules · ~17 minutes
   ============================================ */

const SECTION_4_HOW_AI_WORKS = [

  // ── 4.0  Section opener ──────────────────────
  {
    type: 'section',
    theme: 'gradient',
    sectionLabel: 'SECTION 4',
    title: 'How AI Works',
    subtitle: 'The mechanics behind the magic',
    notes: `This section gets into the actual mechanics. Text completion, tokens, the chat window, context windows, and System 1 vs System 2 thinking. By the end, people should understand the machinery well enough to use it better. This is where the "aha" moments pile up.`,
  },

  // ── 4.1  Text Completion ─────────────────────
  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'HOW AI WORKS',
    title: 'An LLM does exactly one thing. It completes text.',
    body: '<p>You give it some words, and it predicts what comes next. Token by token. Each prediction based on one question: given everything so far, what\'s the most probable next thing?</p>',
    notes: `Start simple. The core function is text completion — nothing more. "You say 'I like to...' and the model thinks: what's the most probable next word?" Walk through it: "eat" → "pizza" → "on weekends". Word by word. Token by token. No plan. No goal. No understanding. Just probability.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'HOW AI WORKS',
    title: 'How simplicity scales into brilliance',
    body: `<p>This dumb, simple mechanism — picking the most likely next word over and over — scales into full sentences, paragraphs, entire narratives. It produces tone. Structure. Persuasion. Insight.</p>
<p>Why? Because the patterns it learned from training data included brilliant writing, good explanations, persuasive arguments. So when it's predicting the next word, it's statistically likely to pick words that flow together the way those well-written sources did.</p>`,
    callout: {
      title: 'A line worth remembering',
      body: 'AI doesn\'t understand meaning. It understands momentum. It\'s completing a pattern, not reporting a truth.',
    },
    notes: `The "momentum not meaning" line is a mini-revelation. Pause before and after. This explains why AI can sound brilliant: the training data included brilliant writing, so the patterns reproduce brilliance. But fluency is seductive — when something sounds coherent, we believe it. That coherence comes from pattern-matching, not knowing.`,
  },

  // ── 4.1b Text Completion Interactive ────────
  {
    type: 'graphic',
    theme: 'dark',
    sectionLabel: 'HOW AI WORKS',
    title: 'Try it: Text Completion',
    subtitle: 'See how an LLM predicts the next word — one token at a time.',
    graphic: {
      id: 'text-completion',
      responsive: true,
      preload: true,
    },
    notes: `Interactive activity. Let participants explore for 2-3 minutes. They type a prompt and see the model complete it token by token. Debrief: "Notice how each word choice opens up different paths? That's probability in action."`,
  },

  // ── 4.2  Tokens ──────────────────────────────
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'HOW AI WORKS',
    title: 'Tokens: the currency of AI',
    body: `<p>AI doesn't see words the way you do. It sees <strong>tokens</strong> — roughly chunks of language. Sometimes a full word, sometimes part of a word, sometimes just punctuation.</p>
<p>"unhappy" → <strong>un</strong> + <strong>happy</strong> (2 tokens)<br>
"it's" → <strong>it</strong> + <strong>'</strong> + <strong>s</strong> (3 tokens)</p>
<p>Everything is measured in tokens: input limits, conversation memory, processing cost, your bill. Tokens are the unit for every constraint you run into.</p>`,
    notes: `Keep this brisk and functional — it's a building block, not an emotional moment. The examples make tokenisation real. The practical implication is the payoff: "This is why long documents hit limits. Why conversations drift. Why you sometimes hit a wall." Tokens come up again and again.`,
  },

  // ── 4.3  Chat Window ─────────────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'HOW AI WORKS',
    title: 'What happens when you hit send',
    body: `<p>Four things happen in sequence:</p>
<p><strong>1. System prompt</strong> — invisible instructions shaping the AI's behaviour.<br>
<strong>2. Conversation window</strong> — every message you've sent and received, bundled together.<br>
<strong>3. Safety system</strong> — filters checking if the response is harmful or unsafe.<br>
<strong>4. Model response</strong> — text completion, token by token.</p>`,
    notes: `Set up the four components simply. The conversation window is the one that matters most — zoom in on it next. People don't realise all four things are happening every time they hit send.`,
  },

  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'HOW AI WORKS',
    title: 'The model doesn\'t remember your conversation. It re-reads it.',
    body: '<p>Every time you hit send, the entire conversation history gets re-sent to the model. Every message. Every response. All of it. The model re-reads everything from scratch.</p>',
    notes: `"Re-reads, not remembers" is the pivot. Pause before and after. This distinction explains so much about AI behaviour that people find confusing. Walk through the implications: each message you send, the model sees *everything* from the beginning.`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'HOW AI WORKS',
    title: 'Why this matters',
    body: `<p><strong>Earlier messages matter</strong> — they're literally part of the context every time, shaping what comes next.</p>
<p><strong>Tone persists</strong> — set a frustrated tone early? It's in the window for every response that follows.</p>
<p><strong>Bad assumptions compound</strong> — a misunderstanding in message 2 gets amplified through messages 3, 4, 5. You're both locked into the wrong path.</p>
<p><strong>Fresh chat fixes things</strong> — clear the window, lose the bad context, start clean.</p>`,
    callout: {
      title: 'The fundamental reframe',
      body: 'You are not having a conversation with a mind. You are co-authoring a document. And the AI is completing it.',
    },
    notes: `Four implications, each one a lightbulb. Walk through them methodically. The reframe to "document co-authoring" should feel like the biggest insight of this section. "Think like an editor. You're setting up the document. You're priming the context. The model isn't reading your mind — it's reading your document and continuing the pattern."`,
  },

  // ── 4.4  Context Window ──────────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'HOW AI WORKS',
    title: 'The context window',
    body: `<p>The model's <strong>working memory</strong> — the maximum amount of text it can see at once. Everything goes in: system prompt, full conversation history, uploaded documents, your current question.</p>
<p>Different models have different sizes (4k to 100k+ tokens). But there's always a limit. And performance follows a curve.</p>`,
    notes: `Set up the context window concept, then move to the quality curve. This is one of the highest-ROI practical concepts in the whole course — people who understand context windows use AI dramatically better than those who don't.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'HOW AI WORKS',
    badge: 'KEY CONCEPT',
    title: 'The quality curve',
    body: `<p><strong>Too little context</strong> → poor, confused, generic responses. The model has to guess.</p>
<p><strong>Sweet spot</strong> → enough context to understand your situation. Not so much that it gets lost. This is where you want to be.</p>
<p><strong>Too much context</strong> → quality drops. The model gets confused, loses focus. Like being handed every email your company has ever sent and asked to summarise the current project.</p>`,
    callout: {
      title: 'The goal',
      body: 'Don\'t think "how much context can I give the model." Think "what\'s the minimum useful context this task needs." Give it that. Operate there.',
    },
    notes: `The quality curve is visual and important. Spend time on it. The distinction between "maximum context" and "useful context" is the key insight — emphasise it twice. People's instinct is to give more context. The counterintuitive advice is: give the right context, not the most context.`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'HOW AI WORKS',
    title: 'Signals your context window is full',
    body: `<p><strong>Forgetting agreements</strong> — you said "use formal tone" and it switches to casual halfway through.</p>
<p><strong>Answering the wrong question</strong> — your question is specific but the response is generic or off-topic.</p>
<p><strong>Going vague</strong> — responses get evasive and non-committal. Too much noise, not enough signal.</p>
<p><strong>What to do:</strong> start a fresh chat, curate the context (trim irrelevant messages), or work in shorter sprints with summaries between them.</p>`,
    notes: `These three signals are things people recognise but don't understand. Naming them is valuable — you'll see people nodding. The practical strategies (fresh chat, curate context, shorter sprints) are immediately actionable. This is advice, not theory.`,
  },

  // ── 4.5  System 1 vs System 2 ───────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'HOW AI WORKS',
    title: 'System 1 vs System 2',
    body: `<p><strong>System 1</strong> — fast, automatic, intuitive. You see 2 + 2, you say "4" without thinking. AI defaults to this mode: pattern-based, confident, quick.</p>
<p><strong>System 2</strong> — slow, deliberate, careful. You work through a tricky problem step by step. Full attention. No autopilot.</p>
<p>By default, AI operates in System 1. That's how it makes confident mistakes.</p>`,
    notes: `Start with the Kahneman reference lightly — don't make it academic. The human analogy (2+2 vs complex maths) sets up the AI application. System 1 works for simple stuff. But System 1 is also how AI confidently gets things wrong.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'HOW AI WORKS',
    badge: 'EXAMPLE',
    title: 'Why System 1 fails',
    body: `<p>"What is 250 × 23?"</p>
<p><strong>System 1:</strong> fast, automatic → answers 5,650 (wrong).</p>
<p><strong>System 2:</strong> "Break this into steps" → 250 × 20 = 5,000. 250 × 3 = 750. Total = 5,750 (correct).</p>
<p>The model's not pattern-completing anymore. It's breaking the problem down and showing work. Same applies to legal analysis, strategic thinking, debugging, persuasive writing.</p>`,
    notes: `The maths example is the core clarity moment. Use it. Let it sink in. System 1 gets it wrong. System 2 gets it right. The mechanism is the same — you're just asking the model to decompose the problem instead of pattern-matching the answer.`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'HOW AI WORKS',
    title: 'How to prompt for System 2',
    body: `<p>The language matters. Don't just say "analyse this." Use these instead:</p>
<p>"Let\'s think about this step by step."<br>
"Break this into stages and explain each one."<br>
"What assumptions are you making?"<br>
"How would you justify that?"<br>
"Is there anything that could contradict this conclusion?"</p>
<p>These shift the model into deliberate, careful processing — and produce dramatically better results on complex tasks.</p>`,
    callout: {
      title: 'The caveat',
      body: 'Better reasoning doesn\'t mean the model suddenly knows what\'s true. It can reason beautifully through a false premise. System 2 makes AI more useful — it doesn\'t make it reliable. You still have to check the work.',
    },
    notes: `Walk through the prompt examples clearly — these are templates people can use immediately. The caveat is crucial: System 2 ≠ truth. A model can reason beautifully through a completely false premise. The work is clearer, so you can spot where it went wrong — but it can still be wrong. Verification still matters.`,
  },

  // ── How AI Works: Quick Check ────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'HOW AI WORKS',
    badge: 'QUICK CHECK',
    title: 'Test that understanding',
    quiz: {
      question: 'Your AI conversation has been going for 30 messages and the model starts forgetting things you agreed on earlier. What\'s most likely happening?',
      options: [
        'The model is experiencing a technical glitch',
        'The context window is filling up and older messages are being deprioritised',
        'The model has learned your preferences wrong',
        'You need to upgrade to a more powerful model',
      ],
      correct: 1,
    },
    notes: `This reinforces the context window lesson. The correct answer is B. A is unlikely — it's not a glitch, it's by design. C is wrong because models don't learn preferences. D might help but misses the point. After the answer, remind them: "Start a fresh chat, curate the context, or work in shorter sprints."`,
  },

];
