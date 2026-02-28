/* ============================================
   Section 5 — Prompting & Context Engineering
   Techniques, levels, tips, context blocks
   7 modules · ~26 minutes
   ============================================ */

const SECTION_5_PROMPTING = [

  // ── 5.0  Section opener ──────────────────────
  {
    type: 'section',
    theme: 'gradient',
    sectionLabel: 'SECTION 5',
    title: 'Prompting & Context Engineering',
    subtitle: 'Structured thinking, not clever wording',
    notes: `This is the practical heart of the course. Move from demystifying what prompting is, through ten techniques and four maturity levels, to context engineering as organisational infrastructure. By the end, people should be able to write dramatically better prompts and understand why context blocks matter more than syntax.`,
  },

  // ── 5.1  Prompting Introduction ───────────────
  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    title: 'Prompting is steering probability, not issuing commands.',
    body: '<p>You give the model clear instruction and enough context for useful output. That\'s it. No secret syntax. No magic words. Just structured thinking.</p>',
    notes: `Demystify immediately. Most people think prompting is about clever wording — it isn't. Use the directions analogy: "Go north" is useless. "Go north for two miles past the church" is precision. AI works the same way. Your job is to give the model fewer guesses.`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'PROMPTING',
    title: 'What prompting actually achieves',
    body: `<p><strong>Narrows the solution space</strong> — you're steering the model toward what you need, not hoping it guesses right.</p>
<p><strong>Reduces hallucinations</strong> — when the model's confused about what you want, it makes things up. Clarity stops that.</p>
<p><strong>Controls the shape</strong> — list, table, step-by-step plan. Form is part of the instruction, not decoration.</p>`,
    callout: {
      title: 'The reframe',
      body: 'You\'re not having a conversation with a mind. You\'re designing an interaction that makes it easy for the model to understand what useful looks like.',
    },
    notes: `Three clear outcomes. Each one practical and immediately applicable. The reframe at the end connects back to Section 4's "co-authoring a document" insight. Tone is matter-of-fact and grounding.`,
  },

  // ── 5.2  Prompting Techniques ─────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    badge: 'TECHNIQUES 1–5',
    title: 'Ten techniques — the first five',
    body: `<p><strong>1. Instructions</strong> — just tell the AI what you want. Directly. Most underrated technique.</p>
<p><strong>2. Summarisation</strong> — highest-value, lowest-risk. Compressing what exists, not inventing. Also optimises your context window.</p>
<p><strong>3. Few-Shot</strong> — show examples of what good looks like. The model learns from pattern, not explanation.</p>
<p><strong>4. Priming</strong> — load context first: "Read the following and say only OK." Forces absorption before action.</p>
<p><strong>5. Meta Prompting</strong> — tell the AI how to behave. "Always ask a clarifying question." "If you're not sure, say so."</p>`,
    notes: `Ten techniques split across two slides. Keep pace steady — one concrete example per technique. Instructions is most underrated. Summarisation is safest. Few-Shot uses pattern over explanation. Priming interrupts the model's eagerness. Meta Prompting turns the AI from vending machine to collaborator.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    badge: 'TECHNIQUES 6–10',
    title: 'Ten techniques — the next five',
    body: `<p><strong>6. Output Form</strong> — specify the shape: bullets, table, checklist, narrative. Form changes how the model structures its thinking.</p>
<p><strong>7. Roles</strong> — "Think like a product manager." Narrows probability space. But caution: roles increase confidence, not correctness.</p>
<p><strong>8. Chain of Thought</strong> — "Walk me through this step by step." Activates System 2 thinking. Slower but more accurate.</p>
<p><strong>9. Tree of Thought</strong> — "Generate three options with trade-offs." Prevents tunnel vision.</p>
<p><strong>10. Generate Knowledge</strong> — "What do we know about X? Now how should we approach Y?" Think out loud before committing.</p>`,
    callout: {
      title: 'The principle',
      body: 'These techniques stack. A strong prompt might combine instructions, meta prompting, and chain of thought together. You layer them — you don\'t use them in isolation.',
    },
    notes: `Complete the ten techniques. Roles gets a caution: "increases confidence, not correctness." Chain of Thought links to System 2 from Section 4. The stacking principle is key — people shouldn't think of these as one-at-a-time tools.`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'PROMPTING',
    title: 'Three principles to remember',
    stats: [
      { number: '1', label: 'Context is king' },
      { number: '2', label: 'Design interactions, not questions' },
      { number: '3', label: 'Structured thinking, not clever wording' },
    ],
    body: '<p>Everything flows from context. Better prompts don\'t come from trickier syntax — they come from richer, more relevant context. You\'re not wordsmithing. You\'re designing how the conversation goes.</p>',
    notes: `Three anchoring principles that govern all ten techniques. Deliver with conviction. These are the lines people should remember when they've forgotten the individual technique names.`,
  },

  // ── 5.3  Prompting Levels ─────────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    badge: 'KEY CONCEPT',
    title: 'Four levels of prompting maturity',
    body: `<p><strong>Level 1: Steering Output</strong> — control what the model produces. Instructions, summarisation, output form, constraints.</p>
<p><strong>Level 2: Context & Teaching</strong> — shape how the model understands the task. Priming, roles, few-shot, context blocks.</p>
<p><strong>Level 3: Designing Thinking</strong> — for hard, ambiguous, high-stakes tasks. Decomposition, tree of thought, chain of thought, self-check loops.</p>
<p><strong>Level 4: Building Systems</strong> — prompting becomes infrastructure. Prompt chaining, structured outputs, meta-prompting at scale.</p>`,
    callout: {
      title: 'The critical insight',
      body: 'You don\'t graduate from Level 1. You layer. All levels remain useful — they address different problems. Most people stay at Level 1. Nothing wrong with that. But knowing Level 2 and 3 exist changes how you see problems.',
    },
    notes: `Four levels, each briefly stated. The layering concept is crucial — don't let the audience think it's a hierarchy. Level 1 handles most daily tasks. Level 2 is where quality jumps. Level 3 is for hard problems. Level 4 is for teams building systems. Reassure: "most people stay at Level 1" removes pressure.`,
  },

  // ── 5.3b Fluency Levels Interactive ──────────
  {
    type: 'graphic',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    title: 'Explore: Prompting Maturity Levels',
    subtitle: 'Click through each level to see what it looks like in practice.',
    graphic: {
      id: 'fluency-levels',
      responsive: true,
      preload: true,
    },
    notes: `Interactive reinforcement of the four levels. Participants click through each level seeing practical examples and characteristics. Debrief: "Which level do you operate at now? Which level would make the biggest difference to your work?"`,
  },

  // ── 5.4  Prompting Tips ───────────────────────
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'PROMPTING',
    title: 'Intent, Context, Constraints',
    body: `<p>Every good prompt balances three things:</p>
<p><strong>Intent</strong> — what are you actually trying to achieve? Not the surface question — the goal underneath.</p>
<p><strong>Context</strong> — what information does the model need? Background, examples, standards, data.</p>
<p><strong>Constraints</strong> — what boundaries matter? Length, format, tone, audience.</p>`,
    notes: `The ICC framework underpins everything. It's the diagnostic tool when prompts aren't working: "Something in Intent, Context, or Constraints is missing." Walk through it, then move to practical tips.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    title: 'Practical dos and don\'ts',
    body: `<p><strong>Don't add context without purpose</strong> — noise hurts signal. If it doesn't change the answer, leave it out.</p>
<p><strong>State positives, not negatives</strong> — "Use a professional tone" beats "Don't be too informal." The model moves toward things better than away from them.</p>
<p><strong>Control output shape</strong> — form is part of the instruction, not an afterthought.</p>
<p><strong>State what the answer is for</strong> — "Summarise this for a board presentation" changes what matters.</p>
<p><strong>Iterate</strong> — iteration isn't failure, it's refinement. Your first prompt won't be perfect. Nobody's is.</p>`,
    notes: `Five actionable tips, each with a concrete rationale. The iteration point is empowering — remove the stigma of not getting it right first time. "If your prompt isn't working, don't assume the AI's failing. Assume the prompt's unclear."`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'PROMPTING',
    badge: 'EXAMPLE',
    title: 'Before and after',
    body: `<p><strong>Before:</strong> "Write a marketing email."</p>
<p>Vague. The model guesses. Output is generic.</p>
<p><strong>After:</strong> "Write a marketing email for small business owners considering switching accounting software. Emphasise time savings, not features. Keep it to 150 words. Purpose: open rate, not immediate conversion."</p>
<p>Now the model has intent, context, and constraints. It knows the audience, the angle, the goal. Output is tighter, more useful.</p>`,
    callout: {
      title: 'The difference',
      body: 'Clarity. That\'s it.',
    },
    notes: `The before/after is a revelation moment. Pause before showing "after." Let the contrast do the work. The closing line — "Clarity. That's it." — should land with quiet confidence.`,
  },

  // ── 5.5  Context Engineering ──────────────────
  {
    type: 'statement',
    theme: 'gradient',
    sectionLabel: 'PROMPTING',
    title: 'Better answers don\'t come from smarter AI. They come from better context.',
    body: '<p>Individual prompting doesn\'t scale. Context engineering does. It\'s the shift from one person asking one question to an organisation sharing a baseline.</p>',
    notes: `This is the pivot from individual technique to systemic thinking. The statement should feel like a gear shift — we're moving from "how do I prompt?" to "how does my team prompt consistently?" Energy rises slightly.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    title: 'Context blocks',
    body: `<p>Reusable, structured chunks of context — defined once, refined over time, reused everywhere:</p>
<p><strong>Organisational context</strong> — your values, how decisions get made, what success looks like.</p>
<p><strong>Product context</strong> — what you build, who uses it, what problems it solves.</p>
<p><strong>Process context</strong> — how work happens. Agile sprints, decision frameworks, standards.</p>
<p><strong>Customer personas</strong> — real examples, not made-up profiles.</p>
<p><strong>Templates and examples</strong> — what good looks like in your world.</p>`,
    callout: {
      title: 'The effect',
      body: 'Shared context creates shared outcomes. When everyone loads the same product context before responding to customer feedback, you get consistency. Not enforced consistency. Natural consistency.',
    },
    notes: `Five types of context block, each briefly described. The cooking analogy works well here: "One-off prompts are like asking 'what shall I cook?' with no context. Context blocks are like loading the full brief: ingredients, time, allergies, occasion." The shared outcomes callout is the payoff.`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'PROMPTING',
    title: 'The caution with context blocks',
    body: `<p>Context blocks can lie. Especially if AI generated them.</p>
<p>"Our customers love feature X" is a context claim. Maybe it's wrong. Maybe the AI invented it. Maybe the data's incomplete.</p>
<p>Context blocks must be <strong>reviewed and owned by humans</strong>. You're the source of truth, not the model. Treat them like documentation — they need accuracy, ownership, and review before they go live.</p>`,
    callout: {
      title: 'The alignment insight',
      body: 'AI isn\'t aligned by policy documents. It\'s aligned by context. You can write a policy saying "be customer-focused" — but if you load context that shows you prioritise revenue over satisfaction, the model aligns with the context, not the policy.',
    },
    notes: `The caution is serious but not alarmist. AI-generated context blocks are particularly risky because they sound authoritative. The alignment insight is philosophical — let it breathe. "Context is where the real influence happens."`,
  },

  // ── 5.6  Most Powerful Prompt ──────────────────
  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    title: '"Read the following and say only OK."',
    body: '<p>The most useful prompt you\'ll ever use. It looks silly. But it works. You paste in context. You add that instruction. The model reads it and responds with one word. Then you ask your questions — and output quality jumps.</p>',
    notes: `Tone is almost conspiratorial — you're sharing a secret. The initial "it looks silly" builds trust. Pause after showing the prompt. The psychology: the AI is eager, it wants to respond immediately. This interrupts that instinct. Forces absorption before action. "Load first, act second."`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    title: 'Load first, act second',
    body: `<p>AI is eager. The moment you give it information, it wants to respond, solve, suggest. This simple instruction interrupts that instinct.</p>
<p><strong>Practical example:</strong> You've got a company strategy document. Don't say "here's our strategy, summarise it." Instead: load the document with "read and say OK" → get confirmation → then ask "Now answer these questions about our product roadmap based only on our strategy."</p>
<p>The model's now operating from your frame, not its default assumptions.</p>`,
    callout: {
      title: 'The deeper point',
      body: 'The best prompts aren\'t the most elaborate. They\'re the most deliberate.',
    },
    notes: `The practical example makes the abstraction real. The principle underneath — load first, act second — is the opposite of what most people do. Most people jump straight to the question and hope context carries. This technique matters because it's so simple. No complexity. No jargon. Just clarity.`,
  },

  // ── 5.7  Prompting Summary ────────────────────
  {
    type: 'statement',
    theme: 'gradient',
    sectionLabel: 'PROMPTING',
    title: 'Prompting is structured thinking. Context is king. Design interactions, not just questions.',
    body: '<p>Ten techniques. Four levels. Context blocks that scale. The simplest techniques often work best. Now you\'re ready to apply it — because knowing how to prompt is one thing. Using prompts to actually build and decide is another.</p>',
    notes: `Reflective, grounding tone. Short sentences. Let each recap land. The bridge to Section 6 is forward-looking: "That's where it gets real." Energy is steady, confident — you've covered a lot of ground.`,
  },

  // ── Prompting: Quick Check ────────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'PROMPTING',
    badge: 'QUICK CHECK',
    title: 'Test that understanding',
    quiz: {
      question: 'You\'re writing a prompt and the AI keeps giving you vague, generic answers. What\'s the most likely fix?',
      options: [
        'Use a more powerful AI model',
        'Add more specific context about your situation and what the output is for',
        'Rephrase your question using more complex language',
        'Tell the AI to "try harder" and "be more specific"',
      ],
      correct: 1,
    },
    notes: `This reinforces the Intent-Context-Constraints framework. The correct answer is B — specificity through context, not through fancier language or a bigger model. A might help sometimes but misses the point. C is wrong — complexity doesn't help. D is what people instinctively try, and it rarely works. After the answer, remind them: "The model's usually not the problem. The instruction is."`,
  },

];
