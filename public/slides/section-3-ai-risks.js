/* ============================================
   Section 3 — AI Risks
   Understanding what can go wrong
   6 modules · ~20 minutes
   ============================================ */

const SECTION_3_AI_RISKS = [

  // ── 3.0  Section opener ──────────────────────
  {
    type: 'section',
    theme: 'dark',
    sectionLabel: 'SECTION 3',
    title: 'AI Risks',
    subtitle: 'Understanding what can go wrong — and what to do about it',
    notes: `This section establishes healthy scepticism without inducing fear. The tone is pragmatic: "These aren't reasons to avoid AI. They're reasons to use it deliberately." Cover foundational risks, emerging risks, sustainability, ethics, regulation, and a practical safety checklist.`,
  },

  // ── 3.1  AI Risks — Core ────────────────────
  {
    type: 'statement',
    theme: 'dark',
    sectionLabel: 'AI RISKS',
    title: 'Risk isn\'t about avoiding AI. It\'s about using it well.',
    body: '<p>Understanding what can go wrong is how you use these tools effectively. Healthy scepticism isn\'t paranoia — it\'s competence.</p>',
    notes: `Set the tone for the whole risks section. This isn't a warning — it's a practical skill. People who understand the risks are better AI users than people who ignore them.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'AI RISKS',
    badge: 'CORE RISK',
    title: 'Hallucinations',
    body: `<p>The fundamental risk. Everything else builds on this.</p>
<p>LLMs don't consult a database. They predict the next word based on statistical likelihood, not truth. So an AI can <strong>confidently tell you something completely false</strong> — and sound absolutely convincing doing it.</p>
<p>Even a 95% accurate model produces confident falsehoods 5% of the time. And you won't always know which is which.</p>`,
    callout: {
      title: 'The mental model',
      body: 'Treat every output as a hallucination. Some happen to be correct. Some aren\'t. Cross-check critical facts. Treat citations as hints, not proof.',
    },
    notes: `This is the anchor risk. Don't rush. "Treat every output as a hallucination" is the principle that governs everything else. It sounds extreme but it's the right starting position. You're not being cynical — you're being competent. Mitigation: cross-check, use web search, ask the AI to verify its own reasoning.`,
  },

  // ── 3.1b  Hallucinations Interactive ─────────
  {
    type: 'graphic',
    theme: 'dark',
    sectionLabel: 'AI RISKS',
    title: 'Explore: Spotting Hallucinations',
    subtitle: 'Can you tell which AI claims are real and which are fabricated?',
    graphic: {
      id: 'hallucinations',
      responsive: true,
      preload: true,
    },
    notes: `Interactive scenario exploration. Participants examine AI-generated claims and try to identify hallucinations. Builds the instinct to question confident-sounding AI output. Debrief: "How did it feel when a fluent, confident response turned out to be wrong? That's the daily reality of using AI without verification."`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'AI RISKS',
    title: 'Training data risks',
    body: `<p><strong>Currency</strong> — your model only knows what was in its training data. Trained through April 2024? Doesn't know what happened in May. Interest rates, product pricing, regulatory changes — all gone dark.</p>
<p><strong>Intellectual property</strong> — early models were trained on vast datasets without explicit permission. Once information is in the weights, you can't remove it. It's baked in.</p>
<p><strong>Bias</strong> — training data reflects the world as it was, including all the biases and stereotypes. Users introduce further bias through how they frame questions. And AI exhibits sycophancy — it tends to agree with you.</p>`,
    notes: `Three training data risks, each briefly stated. Currency is intuitive. IP surprises people — the "baked in" metaphor lands well. Bias has the extra wrinkle of sycophancy: "You might think you're getting an objective answer when you're actually getting your own bias confirmed."`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'AI RISKS',
    title: 'Security, privacy, and fraud',
    body: `<p><strong>Deepfakes</strong> — it used to take serious effort to impersonate someone. Now it takes a still image and three seconds of audio. The UK government identifies citizen fraud as a major concern.</p>
<p><strong>Privacy</strong> — free tools may train on your data. Paid tools generally don't, but read the terms.</p>
<p><strong>Legislation</strong> — the UK isn't writing entirely new AI laws. It's applying existing legislation: GDPR, Data Protection Act, consumer protection.</p>`,
    callout: {
      title: 'The unencrypted email test',
      body: 'If you wouldn\'t send it over unencrypted email, don\'t paste it into an AI tool. That\'s your north star for privacy decisions.',
    },
    notes: `The unencrypted email test is the most memorable takeaway from this module — use it twice if you can. The deepfake stat (still image + 3 seconds of audio) always shocks people. Practical recommendation: safe word with family members for financial requests.`,
  },

  // ── 3.2  Emerging Risks ─────────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'AI RISKS',
    badge: 'EMERGING',
    title: 'Automation and over-trust',
    body: `<p>An estate agent deployed AI to handle email enquiries. The AI auto-replied to an email from a property inspector, <strong>confidently confirming something completely wrong</strong> — without a human checking.</p>
<p>If you automate a decision, you must have a human review it before it goes out. Not as a bottleneck to avoid. As a safety mechanism you can't live without.</p>`,
    callout: {
      title: 'The principle',
      body: 'Human-in-the-loop isn\'t a weakness. It\'s the control system.',
    },
    notes: `The estate agent story is the linchpin of this module — it's concrete, relatable, and slightly horrifying. Use it to ground the abstract principle. "Human-in-the-loop is the control system" — deliver that with conviction. Repeat it later in the summary.`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'AI RISKS',
    title: 'Knowledge exposure and prompt injection',
    body: `<p><strong>Knowledge exposure</strong> — AI doesn't respect your organisation's permission structure. If information exists somewhere the AI has access to, semantic search will find it. An engineer might accidentally surface confidential strategy docs.</p>
<p><strong>Prompt injection</strong> — someone embeds hidden instructions in text, and the AI follows those instructions instead of yours. Hidden text in documents, metadata, or images. You don't always see what the AI sees.</p>`,
    notes: `Knowledge exposure is a knowledge management problem masquerading as a security problem. Prompt injection is counterintuitive — slow down when explaining it. The Mastercard LinkedIn example works well: someone hid instructions in a profile footer and the AI followed them blindly.`,
  },

  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'AI RISKS',
    title: 'AI slop and deepfakes',
    body: `<p><strong>AI slop</strong> — low-value AI-generated content. Generating is faster than reviewing, so quality drops. Audiences are getting better at recognising it — unnatural excitement, em dashes everywhere, phrases like "delve" and "transformative". There\'s a reputational cost to obviously AI-generated output.</p>
<p><strong>Deepfakes in real time</strong> — someone deepfakes your CEO on a Zoom call. Asks you to process a payment. Three seconds of audio and a still image is all it takes.</p>`,
    callout: {
      title: 'Verification',
      body: 'For real-time deepfakes: ask a personal question. Something the real person would know but isn\'t findable online. "What\'s your dog\'s name?" A deepfake won\'t have that knowledge.',
    },
    notes: `AI slop is slightly lighter — observational, almost wry. The deepfake section is more serious. The personal question verification method is practical and memorable. If someone asks about detection technology, be honest: it's an arms race and verification through knowledge is more reliable.`,
  },

  // ── 3.3  Sustainability ─────────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'AI RISKS',
    title: 'Environmental impact',
    stats: [
      { number: '11,390t', label: 'CO₂ from training Llama 3.1' },
      { number: '90%', label: 'Lifecycle energy is inference' },
      { number: '500ml', label: 'Water per 20–50 queries' },
    ],
    body: '<p>Training gets the headlines, but inference — every query you run — is 90% of the lifecycle energy. At billions of queries daily, that adds up.</p>',
    callout: {
      title: 'Treat prompts like meetings',
      body: 'Purpose matters. You wouldn\'t book a meeting just to see who shows up. Same discipline applies to AI queries. Have a reason. Have a plan for the output.',
    },
    notes: `Open with the concrete number (11,390 tonnes) to ground it. Then shift to inference — that's where behaviour change happens. The "treat prompts like meetings" analogy is the core insight. Tone is practical and economic, not moralistic. This is about operating responsibly, not inducing guilt.`,
  },

  // ── 3.4  Ethics and Responsible AI ──────────
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'AI RISKS',
    title: 'Ethics and responsible AI',
    body: `<p>Not abstract philosophy. This is how your organisation avoids harm and maintains trust.</p>
<p><strong>Accountability</strong> — someone owns every AI-influenced decision. A person, not a process.</p>
<p><strong>Fairness</strong> — test for bias before you deploy. If the decision affects people, run scenarios.</p>
<p><strong>Transparency</strong> — if AI influenced a decision affecting someone, they should know.</p>
<p>Some decisions should never be fully automated. Hiring benefits from AI screening, but a human makes the final call. Redundancy decisions should never be algorithmic.</p>`,
    notes: `Three pillars: accountability, fairness, transparency. Deliver them like a checklist — practical, not philosophical. The hiring vs redundancy distinction is a good litmus test for the room. Tone is direct and authoritative. This matters.`,
  },

  // ── 3.5  AI Risks Summary ───────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'AI RISKS',
    badge: 'SAFETY CHECKLIST',
    title: 'Your AI safety checklist',
    body: `<p><strong>1.</strong> Don't blindly trust outputs — verify critical facts.<br>
<strong>2.</strong> Remember models are frozen — they don't know what happened yesterday.<br>
<strong>3.</strong> Don't paste proprietary data into free tools.<br>
<strong>4.</strong> Watch for bias — in training data, in your framing, in the AI's sycophancy.<br>
<strong>5.</strong> Don't share sensitive data — apply the unencrypted email test.<br>
<strong>6.</strong> Track legal changes — regulation is evolving.<br>
<strong>7.</strong> Keep human in the loop — for any decision that matters.</p>`,
    notes: `The closing argument. Pull threads together into something scannable and memorable. Each item gets its own beat. The checklist should feel manageable, not overwhelming. Close with conviction: "Sceptical but productive. Thoughtful but not paralysed. That's how you use AI well."`,
  },

  // ── 3.5b Risk Radar Interactive ─────────────
  {
    type: 'graphic',
    theme: 'dark',
    sectionLabel: 'AI RISKS',
    title: 'Explore: Risk Radar',
    subtitle: 'Tap each risk to see what it means and how to mitigate it.',
    graphic: {
      id: 'risk-radar',
      responsive: true,
      preload: true,
    },
    notes: `Interactive deep-dive. Participants explore risk categories at their own pace. Each card reveals severity, real examples, and mitigation advice. Debrief: "Which risk surprised you most? Which one are you already managing well?"`,
  },

  {
    type: 'statement',
    theme: 'gradient',
    sectionLabel: 'AI RISKS',
    title: 'Human-in-the-loop isn\'t a weakness. It\'s the control system.',
    body: '<p>Sceptical but productive. Thoughtful but not paralysed. That\'s how you use AI well.</p><p>Now we understand the risks. Let\'s understand how these systems actually work — that knowledge is power.</p>',
    notes: `The anchor statement for the whole risks section. Deliver with conviction — pause before and after. Then bridge to Section 4 with a slight shift in energy toward curiosity: "Let's understand how these systems actually work."`,
  },

  // ── 3.6  EU AI Act ──────────────────────────
  {
    type: 'content',
    theme: 'dark',
    sectionLabel: 'AI RISKS',
    badge: 'REGULATION',
    title: 'The EU AI Act',
    body: `<p><strong>Brussels effect:</strong> if you develop, deploy, or import AI for EU customers, you're covered — even from the UK.</p>
<p>Key deadlines:</p>
<p><strong>Feb 2025</strong> — prohibited practices (social credit, emotion recognition in law enforcement)<br>
<strong>Aug 2025</strong> — GPAI rules (ChatGPT-class models)<br>
<strong>Aug 2026</strong> — high-risk AI (hiring, credit, medical, policing)<br>
<strong>Aug 2027</strong> — full regime for regulated products</p>`,
    stats: [
      { number: '€35m', label: 'Maximum penalty' },
      { number: '7%', label: 'Of global turnover' },
    ],
    notes: `Open with Brussels effect — it's the hook that makes UK audiences pay attention. Deadlines are fact-based, deliver them clearly. Penalties are mentioned but not dwelled on — just enough to signal seriousness. The final framing: this is good practice made mandatory, not arbitrary restriction.`,
  },

  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'AI RISKS',
    title: 'EU AI Act: what changes for you',
    body: `<p><strong>Audit</strong> — know what AI systems you're using and where.</p>
<p><strong>Categorise</strong> — put each system into prohibited, GPAI, high-risk, or regulated buckets.</p>
<p><strong>Represent</strong> — appoint an EU representative. Train staff. Document processes.</p>
<p><strong>Maintain</strong> — ongoing compliance, documentation, audit trails.</p>`,
    callout: {
      title: 'The mindset shift',
      body: 'This isn\'t burden imposed from Brussels. It\'s regulation codifying good practice. Human-in-the-loop. Documented decisions. Awareness of risk. The Act just makes it a legal requirement.',
    },
    notes: `Compliance phases should sound manageable. The final framing is the payoff: "None of this is unreasonable. It's actually the discipline you should be applying anyway." That reframe turns regulation from burden to validation. Tone is pragmatic — like walking someone through a project timeline.`,
  },

  // ── Risks: Quick Check ──────────────────────
  {
    type: 'content',
    theme: 'light',
    sectionLabel: 'AI RISKS',
    badge: 'QUICK CHECK',
    title: 'Test your risk awareness',
    quiz: {
      question: 'Your colleague pastes a confidential client contract into the free version of ChatGPT to summarise it. What\'s the main risk?',
      options: [
        'The summary might contain hallucinations',
        'The contract data could be used to train OpenAI\'s models',
        'ChatGPT might send the summary to the wrong person',
        'The contract will be stored permanently on OpenAI\'s servers',
      ],
      correct: 1,
    },
    notes: `This quiz reinforces the privacy/IP lesson. The correct answer is B — free tools may use input data for training. A is also true (hallucinations are always a risk) but isn't the *main* risk in this scenario. C is unlikely. D is an overstatement. Use this to reinforce the "unencrypted email test" one more time.`,
  },

];
