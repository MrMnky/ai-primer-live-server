/* ============================================
   AI Primer — Slide Registry
   Every slide keyed by unique ID.
   IDs follow pattern: section-module-descriptor

   Load this AFTER all section-*.js files.
   ============================================ */

const SLIDE_REGISTRY = {};

// --- Helper: register slides from a section array with ID prefix ---
function registerSection(sectionArray, sectionPrefix, idList) {
  sectionArray.forEach((slide, i) => {
    const id = idList[i];
    if (!id) {
      console.warn(`[Registry] Missing ID for ${sectionPrefix} slide index ${i}`);
      return;
    }
    SLIDE_REGISTRY[id] = { ...slide, id };
  });
}

// ── Section 1: Foundation (13 slides) ────────────────────
registerSection(SECTION_1_FOUNDATION, 's1', [
  's1-opener',
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
]);

// ── Section 2: What is AI (25 slides) ───────────────────
registerSection(SECTION_2_WHAT_IS_AI, 's2', [
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
]);

// ── Section 3: AI Risks (15 slides) ─────────────────────
registerSection(SECTION_3_AI_RISKS, 's3', [
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
]);

// ── Section 4: How AI Works (15 slides) ─────────────────
registerSection(SECTION_4_HOW_AI_WORKS, 's4', [
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
]);

// ── Section 5: Prompting (16 slides) ────────────────────
registerSection(SECTION_5_PROMPTING, 's5', [
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
]);

// ── Section 6: Applying AI (10 slides) ───────────────────
registerSection(SECTION_6_APPLYING_AI, 's6', [
  's6-opener',
  's6-better-thinking-question',
  's6-three-approaches',
  's6-four-ds-interactive',
  's6-tools-come-and-go',
  's6-transcription',
  's6-deep-research',
  's6-comparison-reasoning-simulation',
  's6-applying-ai-summary',
  's6-applying-ai-quiz',
]);

// ── Section 7: Close (6 slides) ─────────────────────────
registerSection(SECTION_7_CLOSE, 's7', [
  's7-opener',
  's7-where-weve-been',
  's7-real-work-starts',
  's7-your-commitment',
  's7-three-months',
  's7-final-statement',
]);
