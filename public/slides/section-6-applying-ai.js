/* ============================================
   Section 6 — Applying AI
   From tools to value, five core techniques
   3 modules · ~11 minutes
   ============================================ */

const SECTION_6_APPLYING_AI = [

  // ── 6.0  Section opener ──────────────────────
  {
    type: 'section',
    theme: 'gradient',
    sectionLabel: 'SECTION 6',
    title: 'Applying AI',
    subtitle: 'From understanding to action',
    notes: `This section shifts from foundational knowledge to practical application. Three approaches to value creation, five techniques that outlast any specific tool, and a mindset shift from "where can we use AI?" to "where does better thinking actually matter?" Tone is conversational and strategic — colleague sharing a toolkit, not a pitch.`,
  },

  // ── 6.1  From Tools to Value ──────────────────
  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'APPLYING AI',
    title: 'Don\'t ask "where can we use AI?" Ask "where does better thinking actually matter?"',
    body: '<p>Most organisations get stuck because they ask the wrong question. Reframing from technology to impact changes everything.</p>',
    notes: `This reframing is the hinge moment of the section. Give it space. "Where can we use AI?" leads to generic tool deployment. "Where does better thinking, speed, or judgement matter?" leads to strategic value. That shift changes everything.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'APPLYING AI',
    badge: 'KEY CONCEPT',
    title: 'Three approaches to AI value',
    body: `<p><strong>1. Automation</strong> — doing existing work faster or cheaper. Where most teams start. Delivers early wins, but it's the easiest to copy. Not sustainable advantage.</p>
<p><strong>2. Augmentation</strong> — AI makes people better at thinking, not just faster at doing. A good analyst becomes exceptional. A good writer becomes more prolific. You're multiplying capability.</p>
<p><strong>3. Agentic systems</strong> — AI doesn't just respond. It notices, suggests, and acts. Powerful for some problems. Also dangerous — which is exactly why governance matters.</p>`,
    callout: {
      title: 'The key line',
      body: 'Automation saves time. Augmentation compounds capability. Agents change how work is organised. Time savings disappear. Capability compounds.',
    },
    notes: `Three approaches that stack on top of each other. Most audiences gravitate toward automation because it's visible and easy to justify. But augmentation is where real advantage lives. "How does AI make your best people better?" That's the strategic question. Pace is steady — let each approach settle before moving to the next.`,
  },

  // ── 6.1b  Agentic AI Interactive ──────────────
  {
    type: 'graphic',
    theme: 'dark',
    sectionLabel: 'APPLYING AI',
    title: 'Explore: How Agentic AI Works',
    subtitle: 'See the Plan → Act → Observe → Reflect loop in action.',
    graphic: {
      id: 'agentic-ai',
      responsive: true,
      preload: true,
    },
    notes: `Interactive exploration of the agentic AI loop. Participants see how agents plan, act, observe results, and reflect — then adjust. Try the example missions to see agents tackling real tasks. Debrief: "This is the third approach — agents. Powerful, but notice how much governance each step needs."`,
  },

  // ── 6.1c Picking Your Pilots ────────────────
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'APPLYING AI',
    title: 'Picking your pilots',
    body: '<p>AI is improving so quickly that if you build something too close to what consumer tools already do, it will either become a generic feature or be overtaken before you finish.</p><p>The smart move is to focus on use cases where <strong>your data, workflows, and expertise</strong> create real, defensible value.</p>',
    media: {
      type: 'image',
      src: '/media/picking-pilots.gif',
      position: 'inline',
      fit: 'contain',
      alt: 'AI Development timeline showing commodity risk and overtake risk when picking pilot projects',
    },
    notes: `This is the strategic framing slide. The graphic shows the timeline from 2022 to today — capabilities that seemed novel two years ago are now built into consumer tools. The two risks (commodity and overtake) should feel real and slightly uncomfortable. Then land the positive reframe: focus where your own data and expertise create defensible value.`,
  },

  // ── 6.1b Four Ds Interactive ────────────────
  {
    type: 'graphic',
    theme: 'dark',
    sectionLabel: 'APPLYING AI',
    title: 'Explore: The 4 Ds of AI Fluency',
    subtitle: 'A framework for approaching any AI opportunity.',
    graphic: {
      id: 'four-ds',
      responsive: true,
      preload: true,
    },
    notes: `Interactive framework exploration. The four Ds give participants a structured way to think about applying AI to their own work. Let them explore for 2 minutes, then ask: "Which D is your team strongest at? Which needs the most work?"`,
  },

  // ── 6.2  Five Core Techniques ─────────────────
  {
    type: 'statement',
    theme: 'light',
    sectionLabel: 'APPLYING AI',
    title: 'Tools will come and go. Techniques stick.',
    body: '<p>You might be using Claude today, something else in two years. But if you know how to think about the work, the technique travels with you. That\'s how you future-proof your capability.</p>',
    notes: `Set up the five techniques with this principle. It removes pressure about choosing the "right" tool and focuses on transferable capability. Tone is reassuring — you're future-proofing them.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'APPLYING AI',
    badge: 'TECHNIQUE 1',
    title: 'Transcription',
    body: `<p>One of the highest-ROI techniques. Most of your knowledge vanishes into thin air — meetings, site walks, informal thinking. Transcription turns that into an asset.</p>
<p><strong>Site walk</strong> — clip-on microphone, think out loud, transcribe, then ask "what patterns do you see?"</p>
<p><strong>Self-interview</strong> — generate ten questions about your business. Record yourself answering. AI converts to structured notes that sound like you.</p>
<p><strong>Voice to writing</strong> — talk out the email naturally. Ask AI to polish it professionally. Writing stops feeling like a chore.</p>`,
    notes: `Transcription is the flagship technique — spend genuine time on it. It gets the strongest practical reactions because it's immediate and personal. "Minutes of raw thinking becomes structured insight." Each example is concrete and relatable. This changes how you work in a day.`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'APPLYING AI',
    badge: 'TECHNIQUE 2',
    title: 'Deep research',
    body: `<p>Think of AI as a junior researcher who works for free. You ask a question. It goes to hundreds of websites. Spends about thirty minutes. Returns a structured summary with numbered citations.</p>
<p>This is <strong>synthesis, not search</strong>. AI connects dots you don't have time to connect.</p>
<p><strong>The guardrail:</strong> AI can hallucinate. Reduce hallucinations, not eliminate. Always spot-check your sources. Always.</p>`,
    notes: `Deep research reframes AI from "search engine" to "synthesis engine." The distinction matters. The guardrail note is essential — always spot-check. Keep the hallucination warning brief but unmissable.`,
  },

  // ── 6.2b  Deep Research Interactive ───────────
  {
    type: 'graphic',
    theme: 'dark',
    sectionLabel: 'APPLYING AI',
    title: 'Explore: How Deep Research Works',
    subtitle: 'Follow the research pipeline — from question to synthesised answer.',
    graphic: {
      id: 'deep-research-v2',
      responsive: true,
      preload: true,
    },
    notes: `Interactive deep research workflow. Participants follow how an AI research agent breaks down a question, searches multiple sources, synthesises findings, and produces a structured output with citations. Debrief: "This is synthesis, not search. What question would you put through this process first?"`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'APPLYING AI',
    badge: 'TECHNIQUES 3–5',
    title: 'Comparison, reasoning, simulation',
    body: `<p><strong>3. Comparison</strong> — systematic evaluation of options side by side. Vendors, tools, strategies. Give AI the criteria, get structured analysis instead of scattered thinking.</p>
<p><strong>4. Reasoning</strong> — systematic problem-solving for multi-step problems. Budget planning, product roadmaps, strategy choices. Ask AI to walk through the logic, show its work, catch its own errors.</p>
<p><strong>5. Simulation</strong> — the most underused technique. AI as a thinking partner. Simulate customers, stakeholders, difficult conversations, entire scenarios.</p>`,
    callout: {
      title: 'Synthetic audiences',
      body: 'Do deep research on a customer segment. AI builds a persona from real data. Then ask it: "Go to my website and tell me what you think." Feedback from a synthetic customer, not your own assumptions. Important: simulation is insight, not truth.',
    },
    notes: `Three techniques on one slide — each gets a brief description. Simulation is conceptually the most interesting. The "synthetic audience" idea should feel like a light bulb moment. Pace: give each technique its own beat. End on the simulation callout to leave the strongest impression.`,
  },

  // ── 6.3  Summary ──────────────────────────────
  {
    type: 'statement',
    theme: 'gradient',
    sectionLabel: 'APPLYING AI',
    title: 'Automation. Augmentation. Agents. Transcription. Research. Comparison. Reasoning. Simulation.',
    body: '<p>Three approaches that stack. Five techniques that travel. Tools change. Techniques stick. That\'s applying AI in practice.</p>',
    notes: `Quick, confident, forward-moving. This is a handoff, not a conclusion. No elaboration. Let the energy carry into the final section. "Now, what comes next?"`,
  },

  // ── Applying AI: Quick Check ──────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'APPLYING AI',
    badge: 'QUICK CHECK',
    title: 'Test that understanding',
    quiz: {
      question: 'Your team wants to use AI for competitive advantage. Which approach is most likely to deliver sustainable value?',
      options: [
        'Automating repetitive tasks to save time and reduce costs',
        'Using AI to augment your team\'s thinking and decision-making capability',
        'Deploying agentic AI systems that act autonomously',
        'Using the most advanced AI model available',
      ],
      correct: 1,
    },
    notes: `This reinforces the augmentation-over-automation principle. Correct answer is B. A delivers early wins but is easily copied. C is powerful but requires governance and isn't inherently sustainable. D confuses tool choice with strategic approach. The key insight: "Time savings disappear. Capability compounds."`,
  },

];
