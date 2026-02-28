/* ============================================
   AI Primer — Course Definitions
   Declarative course assembly from slide IDs.

   Each course is an ordered list of slide IDs
   referencing SLIDE_REGISTRY. Supports per-slide
   overrides (e.g. change theme for a specific course).

   Load AFTER registry/slides.js
   ============================================ */

const COURSE_DEFINITIONS = {

  // ── Full AI Primer Workshop (~90 min content) ──────────
  'ai-primer-full': {
    title: 'AI Primer — Full Workshop',
    description: 'Foundation through close, all 7 sections, ~90 minutes of content',
    sections: [
      { label: 'Foundation', prefix: 's1' },
      { label: 'What is AI', prefix: 's2' },
      { label: 'AI Risks', prefix: 's3' },
      { label: 'How AI Works', prefix: 's4' },
      { label: 'Prompting', prefix: 's5' },
      { label: 'Applying AI', prefix: 's6' },
      { label: 'Close', prefix: 's7' },
    ],
    slides: [
      // Section 1: Foundation (13)
      's1-opener',
      's1-find-us',
      's1-cover-welcome',
      's1-not-an-engineer',
      's1-objectives',
      's1-how-we-get-there',
      's1-adoption-curve',
      's1-left-side-of-curve',
      's1-what-adoption-looks-like',
      's1-knowledge-vs-confidence',
      's1-invisible-ai-use',
      's1-fomo-strategy',
      's1-pulse-check-poll',

      // Section 2: What is AI (25)
      's2-opener',
      's2-ai-definition',
      's2-deterministic-vs-probabilistic',
      's2-plausible-not-correct',
      's2-training-vs-inference',
      's2-chatgpt-doesnt-learn',
      's2-what-is-ai-recap',
      's2-llms-changed-everything',
      's2-why-large',
      's2-patterns-not-facts',
      's2-many-interfaces-few-models',
      's2-emergence',
      's2-emergence-examples',
      's2-emergence-why-it-matters',
      's2-capabilities-explorer-interactive',
      's2-llm-progress-trajectory',
      's2-platform-shift',
      's2-media-bg-demo',
      's2-media-split-demo',
      's2-media-inline-demo',
      's2-foundation-model-landscape',
      's2-strategic-implications',
      's2-llms-recap',
      's2-will-this-get-better',
      's2-break',

      // Section 3: AI Risks (16)
      's3-opener',
      's3-risk-not-avoiding',
      's3-hallucinations',
      's3-training-data-risks',
      's3-security-privacy-fraud',
      's3-automation-over-trust',
      's3-knowledge-exposure-injection',
      's3-ai-slop-deepfakes',
      's3-environmental-impact',
      's3-ethics-responsible-ai',
      's3-safety-checklist',
      's3-risk-radar-interactive',
      's3-human-in-the-loop',
      's3-eu-ai-act',
      's3-eu-ai-act-changes',
      's3-risk-quiz',

      // Section 4: How AI Works (15)
      's4-opener',
      's4-text-completion',
      's4-simplicity-scales',
      's4-text-completion-interactive',
      's4-tokens',
      's4-what-happens-when-you-send',
      's4-model-rereads',
      's4-why-this-matters',
      's4-context-window',
      's4-quality-curve',
      's4-context-window-full-signals',
      's4-system1-vs-system2',
      's4-why-system1-fails',
      's4-prompt-for-system2',
      's4-how-ai-works-quiz',

      // Section 5: Prompting (18)
      's5-opener',
      's5-steering-probability',
      's5-what-prompting-achieves',
      's5-techniques-1-to-5',
      's5-techniques-6-to-10',
      's5-three-principles',
      's5-four-levels-maturity',
      's5-fluency-levels-interactive',
      's5-intent-context-constraints',
      's5-practical-dos-donts',
      's5-before-and-after',
      's5-context-engineering',
      's5-context-blocks',
      's5-context-blocks-caution',
      's5-most-powerful-prompt',
      's5-load-first-act-second',
      's5-prompting-summary',
      's5-prompting-quiz',

      // Section 6: Applying AI (11)
      's6-opener',
      's6-better-thinking-question',
      's6-three-approaches',
      's6-picking-pilots',
      's6-four-ds-interactive',
      's6-tools-come-and-go',
      's6-transcription',
      's6-deep-research',
      's6-comparison-reasoning-simulation',
      's6-applying-ai-summary',
      's6-applying-ai-quiz',

      // Section 7: Close (6)
      's7-opener',
      's7-where-weve-been',
      's7-real-work-starts',
      's7-your-commitment',
      's7-three-months',
      's7-final-statement',
    ],
    metadata: {
      duration: '~90 minutes content',
      maxParticipants: 50,
      difficulty: 'beginner',
    },
  },

  // ── Example: Executive Briefing (30 min) ──────────────
  // Uncomment and customise when needed:
  //
  // 'ai-primer-exec-30': {
  //   title: 'AI Primer — Executive Briefing',
  //   description: 'Condensed 30-minute version for C-suite',
  //   slides: [
  //     's1-cover-welcome',
  //     's1-not-an-engineer',
  //     's2-ai-definition',
  //     's2-deterministic-vs-probabilistic',
  //     's2-plausible-not-correct',
  //     's2-platform-shift',
  //     's3-risk-not-avoiding',
  //     's3-hallucinations',
  //     's3-human-in-the-loop',
  //     's4-text-completion',
  //     's4-model-rereads',
  //     's4-quality-curve',
  //     's6-better-thinking-question',
  //     's6-three-approaches',
  //     's7-final-statement',
  //   ],
  //   metadata: { duration: '~30 minutes', difficulty: 'beginner' },
  // },

};
