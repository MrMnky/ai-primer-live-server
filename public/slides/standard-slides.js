/* ============================================
   AI Primer Live — Standard Slide Templates
   Reusable factory functions for common slide types.
   Load this BEFORE any slide deck script.
   ============================================ */

const STANDARD_SLIDES = (() => {
  'use strict';

  // --- Title / Cover Card ---
  function titleCard({ title, subtitle, theme = 'gradient', notes = '' }) {
    return { type: 'cover', theme, title, subtitle, notes };
  }

  // --- Section Break ---
  function sectionBreak({ sectionLabel, title, subtitle, notes = '' }) {
    return { type: 'section', theme: 'gradient', sectionLabel, title, subtitle, notes };
  }

  // --- Statement Slide (big idea, quote, principle) ---
  function statementSlide({ sectionLabel, title, body, callout, theme = 'dark', badge, notes = '' }) {
    return { type: 'statement', theme, sectionLabel, title, body, callout, badge, notes };
  }

  // --- Stats Hero (numbers that tell a story) ---
  function statsHero({ sectionLabel, title, body, stats, callout, theme = 'dark', notes = '' }) {
    return { type: 'content', theme, sectionLabel, title, body, stats, callout, notes };
  }

  // --- Content Slide (general purpose) ---
  function contentSlide({ sectionLabel, title, body, callout, stats, badge, theme = 'dark', notes = '' }) {
    return { type: 'content', theme, sectionLabel, title, body, callout, stats, badge, notes };
  }

  // --- Quiz Slide ---
  function quizSlide({ sectionLabel, title, question, options, correct, badge = 'QUICK CHECK', theme = 'light', notes = '' }) {
    return {
      type: 'content', theme, sectionLabel, badge, title,
      quiz: { question, options, correct },
      notes,
    };
  }

  // --- Poll Slide ---
  function pollSlide({ sectionLabel, title, question, options, theme = 'dark', notes = '' }) {
    return {
      type: 'content', theme, sectionLabel, title,
      poll: { question, options },
      notes,
    };
  }

  // --- Text Input Slide ---
  function textInputSlide({ sectionLabel, title, body, prompt, placeholder, callout, theme = 'dark', notes = '' }) {
    return {
      type: 'content', theme, sectionLabel, title, body,
      textInput: { prompt, placeholder },
      callout,
      notes,
    };
  }

  // --- Interactive Slide (split layout with iframe) ---
  function interactiveSlide({ sectionLabel, title, body, src, theme = 'dark', notes = '' }) {
    return {
      type: 'split', theme, sectionLabel, title, body,
      media: { type: 'iframe', src },
      mediaLayout: 'interactive',
      notes,
    };
  }

  // --- Full Media Slide (media fills the slide, small title area) ---
  function fullMediaSlide({ title, subtitle, mediaType = 'iframe', src, alt, theme = 'dark', mediaLayout = 'full', notes = '' }) {
    return {
      type: 'full-media', theme, title, subtitle,
      media: { type: mediaType, src, alt },
      mediaLayout,
      notes,
    };
  }

  // --- Results Slide (shows aggregated responses from a source slide) ---
  function resultsSlide({ sectionLabel, title, body, sourceSlideIndex, responseType, theme = 'dark', notes = '' }) {
    return {
      type: 'content', theme, sectionLabel, title, body,
      results: { sourceSlideIndex, responseType },
      notes,
    };
  }

  // --- Comparison Slide (two columns of content) ---
  function comparisonSlide({ sectionLabel, title, leftTitle, leftBody, rightTitle, rightBody, theme = 'dark', notes = '' }) {
    return {
      type: 'content', theme, sectionLabel, title,
      body: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:16px;">
        <div><h3 style="font-size:1rem;margin-bottom:8px;color:var(--bright-turquoise)">${leftTitle}</h3><p style="font-size:0.9rem;opacity:0.8;line-height:1.6">${leftBody}</p></div>
        <div><h3 style="font-size:1rem;margin-bottom:8px;color:var(--dodger-blue)">${rightTitle}</h3><p style="font-size:0.9rem;opacity:0.8;line-height:1.6">${rightBody}</p></div>
      </div>`,
      notes,
    };
  }

  // --- Timeline Slide (sequential steps/milestones) ---
  function timelineSlide({ sectionLabel, title, steps, theme = 'dark', notes = '' }) {
    const stepsHtml = steps.map((s, i) => `
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:20px;">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--bright-turquoise);color:var(--gable-green);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;flex-shrink:0;">${i + 1}</div>
        <div><strong style="font-size:0.95rem;">${s.title}</strong><p style="font-size:0.85rem;opacity:0.7;margin-top:4px;line-height:1.5;">${s.body}</p></div>
      </div>
    `).join('');
    return {
      type: 'content', theme, sectionLabel, title,
      body: stepsHtml,
      notes,
    };
  }

  // --- Callout Slide (highlighted message with context) ---
  function calloutSlide({ sectionLabel, title, body, callout, theme = 'dark', notes = '' }) {
    return { type: 'content', theme, sectionLabel, title, body, callout, notes };
  }

  // --- Image Slide (split layout with image) ---
  function imageSlide({ sectionLabel, title, body, src, alt = '', theme = 'dark', notes = '' }) {
    return {
      type: 'split', theme, sectionLabel, title, body,
      media: { type: 'image', src, alt },
      notes,
    };
  }

  // --- Video Slide (split layout with video/YouTube) ---
  function videoSlide({ sectionLabel, title, body, src, theme = 'dark', notes = '' }) {
    return {
      type: 'split', theme, sectionLabel, title, body,
      media: { type: 'video', src },
      mediaLayout: 'video',
      notes,
    };
  }

  // Public API
  return {
    titleCard,
    sectionBreak,
    statementSlide,
    statsHero,
    contentSlide,
    quizSlide,
    pollSlide,
    textInputSlide,
    interactiveSlide,
    fullMediaSlide,
    resultsSlide,
    comparisonSlide,
    timelineSlide,
    calloutSlide,
    imageSlide,
    videoSlide,
  };

})();
