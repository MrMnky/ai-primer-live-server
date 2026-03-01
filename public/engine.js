/* ============================================
   AI Primer Live — Slide Engine
   Renders slides, handles navigation, manages
   interactive components, connects to WebSocket
   ============================================ */

(function () {
  'use strict';

  // --- State ---
  const state = {
    slides: [],
    currentSlide: 0,
    mode: null,        // 'presenter', 'participant', 'self'
    sessionCode: null,
    participantName: null,
    participantId: null,
    socket: null,
    connected: false,
    participants: [],
    responses: {},     // slideIndex -> { participantId -> response }
    courseId: null,     // registry course ID (if using registry)
    courseMeta: null,  // course metadata from registry
    language: 'en',    // current language code
    i18n: {},          // loaded translation data for current language
    i18nFallback: {},  // English fallback
    revealedSlides: {},   // slideIndex -> true (results have been revealed) (always loaded)
    // Participant features
    presenterSlide: 0,    // tracks presenter's current slide (participant mode)
    freeBrowsing: false,  // true when participant is browsing away from presenter
    bookmarks: [],        // array of bookmarked slide indices
    questions: [],        // Q&A questions list (populated via socket)
    resources: [],        // session resources/downloads
    availableLanguages: null, // languages list received from presenter (participant mode)
  };

  // --- Slide Definition Format ---
  // Each slide is an object:
  // {
  //   type: 'cover' | 'content' | 'statement' | 'split' | 'quiz' | 'poll' | 'text-input' | 'video' | 'section',
  //   theme: 'dark' | 'light' | 'gradient',
  //   sectionLabel: 'WHAT IS AI',
  //   title: 'Slide title',
  //   subtitle: 'Optional subtitle',
  //   body: '<p>HTML content</p>',
  //   notes: 'Speaker notes (plain text or HTML)',
  //   media: { type: 'image' | 'video' | 'iframe', src: '...', alt: '...' },
  //   badge: 'ENTRY POINT',
  //   stats: [{ number: '+86%', label: 'Knowledge gain' }],
  //   callout: { title: '...', body: '...' },
  //   quiz: { question: '...', options: ['A', 'B', 'C', 'D'], correct: 0 },
  //   poll: { question: '...', options: ['Opt 1', 'Opt 2', 'Opt 3'] },
  //   textInput: { prompt: '...', placeholder: '...' },
  //   mediaLayout: 'video' | 'interactive' | 'full' | 'background',
  //   results: { sourceSlideIndex: N, responseType: 'poll' | 'quiz' | 'text' },
  //   build: ['step1', 'step2']  // progressive reveal steps (future)
  // }

  // --- i18n Runtime ---
  async function loadI18n(language) {
    // Always load English as fallback
    try {
      const enRes = await fetch('/i18n/en.json');
      state.i18nFallback = enRes.ok ? await enRes.json() : {};
    } catch (e) {
      console.warn('[i18n] Could not load English fallback:', e);
      state.i18nFallback = {};
    }

    if (!language || language === 'en') {
      state.i18n = state.i18nFallback;
    } else {
      try {
        const res = await fetch(`/i18n/${language}.json`);
        state.i18n = res.ok ? await res.json() : state.i18nFallback;
      } catch (e) {
        console.warn(`[i18n] Could not load ${language}, falling back to English:`, e);
        state.i18n = state.i18nFallback;
      }
    }
    state.language = language || 'en';
    console.log(`[i18n] Loaded language: ${state.language}`);
  }

  // Translate a UI string key with optional variable interpolation
  function t(key, vars) {
    let str = (state.i18n && state.i18n.ui && state.i18n.ui[key]) ||
              (state.i18nFallback && state.i18nFallback.ui && state.i18nFallback.ui[key]) ||
              key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = typeof str === 'string' ? str.split('{' + k + '}').join(vars[k]) : str;
      });
    }
    return str;
  }

  // Language name map (used for the language switcher UI)
  var LANG_NAMES = {
    en: 'English', fr: 'Français', de: 'Deutsch', es: 'Español',
    it: 'Italiano', pt: 'Português', nl: 'Nederlands',
    ja: '日本語', zh: '中文', ar: 'العربية',
  };

  // Detect which languages are available for the current session
  function getAvailableSessionLanguages() {
    // If participant received languages from presenter, use those
    if (state.availableLanguages && state.availableLanguages.length > 0) {
      return state.availableLanguages;
    }

    var langs = new Set(['en']); // English always available

    // Check i18n files that exist (registry-api exposes this for built-in courses)
    if (typeof SlideRegistry !== 'undefined' && SlideRegistry.getAvailableLanguages && state.courseId) {
      SlideRegistry.getAvailableLanguages(state.courseId).forEach(function (l) { langs.add(l); });
    }

    // Check course-level translations (custom courses)
    if (state.courseTranslations) {
      Object.keys(state.courseTranslations).forEach(function (slideId) {
        if (state.courseTranslations[slideId]) {
          Object.keys(state.courseTranslations[slideId]).forEach(function (lang) {
            if (lang && lang !== 'en') langs.add(lang);
          });
        }
      });
    }

    return Array.from(langs);
  }

  // Change language mid-session: reload i18n, re-render all slides
  async function setLanguage(language) {
    if (language === state.language) return;
    console.log('[Engine] Switching language to:', language);
    await loadI18n(language);

    // Re-localise all slides from originals with new language
    if (state.slidesOriginal) {
      state.slides = state.slidesOriginal.map(function (s) { return localiseSlide(Object.assign({}, s)); });
    }

    // Re-render all slides in the viewport
    var viewport = document.querySelector('.slide-viewport');
    if (viewport) {
      // Unmount any graphics first
      if (typeof GraphicContainer !== 'undefined') {
        state.slides.forEach(function (slide, i) {
          if (slide.type === 'graphic') GraphicContainer.unmount(i);
        });
      }

      viewport.innerHTML = '';
      state.slides.forEach(function (slide, i) {
        viewport.appendChild(renderSlide(slide, i));
      });

      // Re-activate current slide
      var slideEls = viewport.querySelectorAll('.slide');
      slideEls.forEach(function (el, i) {
        el.classList.toggle('active', i === state.currentSlide);
      });

      // Re-mount graphic if current slide is graphic type
      var currentSlide = state.slides[state.currentSlide];
      if (typeof GraphicContainer !== 'undefined' && currentSlide && currentSlide.type === 'graphic' && currentSlide.graphic) {
        var containerEl = document.querySelector('.slide__graphic-container[data-slide="' + state.currentSlide + '"]');
        if (containerEl) {
          GraphicContainer.mount(containerEl, currentSlide.graphic, state.currentSlide);
        }
      }

      // Re-activate media for current slide
      manageSlideMedia(state.currentSlide, 'activate');
    }

    // Update the language dropdown if it exists
    updateLanguageSwitcher();
  }

  // Render the language switcher dropdown for presenter controls
  function renderLanguageSwitcher() {
    var langs = getAvailableSessionLanguages();

    var options = langs.map(function (code) {
      var selected = code === state.language ? ' selected' : '';
      var name = LANG_NAMES[code] || code;
      return '<option value="' + code + '"' + selected + '>' + name + '</option>';
    }).join('');

    var singleClass = langs.length <= 1 ? ' presenter-controls__lang-select--single' : '';
    return '<select class="presenter-controls__lang-select' + singleClass + '" onchange="AIPrimer.switchLanguage(this.value)" title="' + (langs.length > 1 ? 'Change language' : 'Language (add translations in course editor)') + '">' + options + '</select>';
  }

  // Update the dropdown value and available options without full re-render
  function updateLanguageSwitcher() {
    var sel = document.querySelector('.presenter-controls__lang-select');
    if (!sel) return;
    var langs = getAvailableSessionLanguages();
    sel.innerHTML = langs.map(function (code) {
      var selected = code === state.language ? ' selected' : '';
      var name = LANG_NAMES[code] || code;
      return '<option value="' + code + '"' + selected + '>' + name + '</option>';
    }).join('');
    sel.value = state.language;
    if (langs.length > 1) {
      sel.classList.remove('presenter-controls__lang-select--single');
      sel.title = 'Change language';
    } else {
      sel.classList.add('presenter-controls__lang-select--single');
      sel.title = 'Language (add translations in course editor)';
    }
  }

  // Enrich a slide object with translated content (fallback to inline strings)
  function localiseSlide(slide) {
    const contentKey = slide.contentKey || slide.id;
    if (!contentKey) return slide;

    // Determine which language this slide should use
    // Priority: slide.language override → session language → English
    const slideLanguage = slide.language || state.language || 'en';
    const sessionLanguage = state.language || 'en';

    // Check course-level translations first (for custom courses)
    var content = null;
    if (state.courseTranslations && state.courseTranslations[contentKey]) {
      content = state.courseTranslations[contentKey][slideLanguage] || null;
    }

    // Fall back to global i18n files
    if (!content) {
      content = (state.i18n && state.i18n.slides && state.i18n.slides[contentKey]) ||
                (state.i18nFallback && state.i18nFallback.slides && state.i18nFallback.slides[contentKey]);
    }

    if (!content) return slide; // no translation entry — use inline strings

    const loc = Object.assign({}, slide);
    if (content.title) loc.title = content.title;
    if (content.subtitle) loc.subtitle = content.subtitle;
    if (content.body) loc.body = content.body;
    if (content.sectionLabel) loc.sectionLabel = content.sectionLabel;
    if (content.notes) loc.notes = content.notes;
    if (content.badge) loc.badge = content.badge;

    // Stats
    if (content.stats && slide.stats) {
      loc.stats = slide.stats.map(function (s, i) {
        var ts = content.stats[i];
        if (!ts) return s;
        return { number: ts.number || s.number, label: ts.label || s.label };
      });
    }

    // Callout
    if (content['callout.title'] || content['callout.body']) {
      loc.callout = Object.assign({}, slide.callout);
      if (content['callout.title']) loc.callout.title = content['callout.title'];
      if (content['callout.body']) loc.callout.body = content['callout.body'];
    }

    // Quiz
    if (content['quiz.question'] || content['quiz.options']) {
      loc.quiz = Object.assign({}, slide.quiz);
      if (content['quiz.question']) loc.quiz.question = content['quiz.question'];
      if (content['quiz.options']) loc.quiz.options = content['quiz.options'];
    }

    // Poll
    if (content['poll.question'] || content['poll.options']) {
      loc.poll = Object.assign({}, slide.poll);
      if (content['poll.question']) loc.poll.question = content['poll.question'];
      if (content['poll.options']) loc.poll.options = content['poll.options'];
    }

    // Text input
    if (content['textInput.prompt'] || content['textInput.placeholder']) {
      loc.textInput = Object.assign({}, slide.textInput);
      if (content['textInput.prompt']) loc.textInput.prompt = content['textInput.prompt'];
      if (content['textInput.placeholder']) loc.textInput.placeholder = content['textInput.placeholder'];
    }

    // Media alt text
    if (content['media.alt'] && slide.media) {
      loc.media = Object.assign({}, slide.media);
      loc.media.alt = content['media.alt'];
    }

    return loc;
  }

  // --- DOM Helpers ---
  function el(tag, className, innerHTML) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (innerHTML) e.innerHTML = innerHTML;
    return e;
  }

  function qs(selector) { return document.querySelector(selector); }

  // --- Slide Renderer ---
  function renderSlide(slide, index) {
    const themeClass = `slide--${slide.theme || 'dark'}`;
    // Resolve media position early so we can set type classes
    const hasMedia = !!slide.media;
    const mediaPosEarly = hasMedia ? (slide.media.position || slide.mediaLayout || null) : null;

    let typeClass = slide.type === 'cover' ? 'slide--cover' :
                    slide.type === 'split' ? 'slide--split' :
                    slide.type === 'section' ? 'slide--cover' :
                    slide.type === 'full-media' ? 'slide--full-media' :
                    slide.type === 'graphic' ? 'slide--graphic' :
                    slide.type === 'results' ? '' : '';

    // Add split class if media position is split (even if type isn't 'split')
    if (mediaPosEarly === 'split' && !typeClass.includes('split')) {
      typeClass = 'slide--split';
    }
    // Add background media class for overlay z-index stacking
    if (mediaPosEarly === 'background') {
      typeClass += ' slide--has-bg-media';
    }

    const div = el('div', `slide ${themeClass} ${typeClass}`.trim());
    div.dataset.index = index;
    div.dataset.type = slide.type;

    let html = '';

    // Badge
    if (slide.badge) {
      html += `<span class="badge">${slide.badge}</span>`;
    }

    // Section label
    if (slide.sectionLabel) {
      html += `<div class="slide__section-label">${slide.sectionLabel}</div>`;
    }

    // Cover logo
    if (slide.type === 'cover') {
      const logoFile = (slide.theme === 'light') ? 'AIA_Logo_GableGreen.svg' : 'AIA_Logo_White.svg';
      html += `<img class="slide__logo" src="assets/${logoFile}" alt="AI Accelerator">`;
    }

    // --- Media layer ---
    // Resolve media position: new `media.position` takes priority, legacy `mediaLayout` as fallback
    const mediaPos = slide.media ? (slide.media.position || slide.mediaLayout || null) : null;

    // Background media: render before content (absolute positioned via CSS)
    if (slide.media && mediaPos === 'background') {
      const overlay = slide.media.overlay != null ? slide.media.overlay : 0.5;
      const fit = slide.media.fit || 'cover';
      html += `<div class="slide__media slide__media--background" data-overlay="${overlay}">`;
      if (slide.media.type === 'image') {
        html += `<img src="${slide.media.src}" alt="${slide.media.alt || ''}" loading="lazy" style="object-fit:${fit}">`;
      } else if (slide.media.type === 'video') {
        const autoplay = slide.media.autoplay !== false;
        const loop = slide.media.loop !== false;
        const muted = slide.media.muted !== false;
        // Videos are lazy-loaded: render with data-src, activated in goToSlide()
        html += `<video data-src="${slide.media.src}" ${muted ? 'muted' : ''} ${loop ? 'loop' : ''} playsinline style="object-fit:${fit}" preload="none"></video>`;
      } else if (slide.media.type === 'embed') {
        html += `<iframe data-src="${slide.media.src}" allowfullscreen frameborder="0" style="width:100%;height:100%;border:none;"></iframe>`;
      }
      if (overlay > 0) {
        html += `<div class="slide__media-overlay" style="opacity:${overlay}"></div>`;
      }
      html += '</div>';
    }

    // For split layout, wrap content in a div
    const isSplit = slide.type === 'split' || mediaPos === 'split';
    const isFullMedia = slide.type === 'full-media';
    if (isSplit || isFullMedia) {
      html += '<div class="slide__content">';
    }

    // Title
    if (slide.title) {
      html += `<h1 class="slide__title">${slide.title}</h1>`;
    }

    // Subtitle
    if (slide.subtitle) {
      html += `<p class="slide__subtitle">${slide.subtitle}</p>`;
    }

    // Body
    if (slide.body) {
      html += `<div class="slide__body">${slide.body}</div>`;
    }

    // Stats
    if (slide.stats) {
      html += '<div class="stat-row">';
      slide.stats.forEach(s => {
        html += `<div class="stat-item"><div class="stat-number">${s.number}</div><div class="stat-label">${s.label}</div></div>`;
      });
      html += '</div>';
    }

    // Callout
    if (slide.callout) {
      html += `<div class="callout">`;
      if (slide.callout.title) html += `<div class="callout__title">${slide.callout.title}</div>`;
      html += `<div class="callout__body">${slide.callout.body}</div></div>`;
    }

    // Quiz
    if (slide.quiz) {
      html += renderQuiz(slide.quiz, index);
    }

    // Poll
    if (slide.poll) {
      html += renderPoll(slide.poll, index);
    }

    // Text input
    if (slide.textInput) {
      html += renderTextInput(slide.textInput, index);
    }

    if (isSplit || isFullMedia) {
      html += '</div>'; // close .slide__content
    }

    // Media (image, video, embed) — inline or split position
    // Skip if already rendered as background
    if (slide.media && mediaPos !== 'background') {
      const posClass = mediaPos ? ` slide__media--${mediaPos}` : '';
      // Legacy layout class support
      const layoutClass = slide.mediaLayout && !slide.media.position ? ` slide__media--${slide.mediaLayout}` : '';
      const fit = slide.media.fit || (mediaPos === 'split' ? 'cover' : 'contain');
      const aspect = slide.media.aspectRatio || null;

      html += `<div class="slide__media${posClass}${layoutClass}"${aspect ? ` style="aspect-ratio:${aspect}"` : ''}>`;

      if (slide.media.type === 'image') {
        html += `<img src="${slide.media.src}" alt="${slide.media.alt || ''}" loading="lazy" style="object-fit:${fit}">`;
      } else if (slide.media.type === 'video') {
        const videoSrc = slide.media.src;
        // Support YouTube/Vimeo URLs as iframes
        if (videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be')) {
          const vid = videoSrc.includes('youtu.be') ? videoSrc.split('/').pop() :
                      new URL(videoSrc).searchParams.get('v') || videoSrc.split('/').pop();
          html += `<iframe data-src="https://www.youtube.com/embed/${vid}?rel=0&autoplay=0" allowfullscreen frameborder="0"></iframe>`;
        } else if (videoSrc.includes('vimeo.com')) {
          const vid = videoSrc.split('/').pop();
          html += `<iframe data-src="https://player.vimeo.com/video/${vid}" allowfullscreen frameborder="0"></iframe>`;
        } else {
          // Local/hosted MP4 — lazy-loaded
          const controls = slide.media.controls !== false;
          html += `<video data-src="${videoSrc}" ${controls ? 'controls' : ''} playsinline style="object-fit:${fit}" preload="none"></video>`;
        }
      } else if (slide.media.type === 'embed') {
        html += `<iframe data-src="${slide.media.src}" allowfullscreen frameborder="0"></iframe>`;
      }

      html += '</div>';
    }

    // Graphic (interactive iframe via GraphicContainer)
    if (slide.type === 'graphic' && slide.graphic) {
      html += `<div class="slide__graphic-container" data-slide="${index}" data-graphic-id="${slide.graphic.id}"></div>`;
    }

    // Results (aggregated responses display)
    if (slide.results) {
      html += renderResults(slide.results, index);
    }

    div.innerHTML = html;
    return div;
  }

  function renderQuiz(quiz, slideIndex) {
    const isRevealed = state.revealedSlides[slideIndex];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    let html = `<div class="quiz${isRevealed ? ' revealed' : ''}" data-slide="${slideIndex}">`;
    html += `<div class="quiz__question">${quiz.question}</div>`;
    html += `<div class="quiz__options">`;
    quiz.options.forEach((opt, i) => {
      const correctClass = isRevealed && i === quiz.correct ? ' correct' : '';
      const incorrectClass = isRevealed && i !== quiz.correct ? ' incorrect' : '';
      html += `<div class="quiz__option${correctClass}${incorrectClass}" data-option="${i}" onclick="AIPrimer.selectQuizOption(${slideIndex}, ${i})">`;
      html += `<span class="quiz__option-marker">${letters[i]}</span>`;
      html += `<span>${opt}</span>`;
      html += `</div>`;
    });
    html += `</div>`;
    if (state.mode === 'presenter') {
      html += `<button class="btn btn--reveal${isRevealed ? ' revealed' : ''}" onclick="AIPrimer.revealResults(${slideIndex})"${isRevealed ? ' disabled' : ''}>${isRevealed ? t('engine.reveal.revealed') + ' ✓' : t('engine.reveal.button')}</button>`;
    }
    html += `</div>`;
    return html;
  }

  function renderPoll(poll, slideIndex) {
    const isRevealed = state.revealedSlides[slideIndex];
    const hideResults = state.mode === 'participant' && !isRevealed;
    let html = `<div class="poll${isRevealed ? ' revealed' : ''}" data-slide="${slideIndex}">`;
    html += `<div class="quiz__question">${poll.question}</div>`;
    poll.options.forEach((opt, i) => {
      html += `<div class="poll__bar-container">`;
      html += `<div class="poll__bar-label"><span>${opt}</span><span class="poll__bar-pct${hideResults ? ' hidden' : ''}" data-option="${i}">0%</span></div>`;
      html += `<div class="poll__bar-track" data-option="${i}" onclick="AIPrimer.selectPollOption(${slideIndex}, ${i})">`;
      html += `<div class="poll__bar-fill" style="width: 0%"></div>`;
      html += `</div></div>`;
    });
    html += `<div class="poll__total${hideResults ? ' hidden' : ''}">0 ${t('engine.poll.responses')}</div>`;
    if (state.mode === 'presenter') {
      html += `<button class="btn btn--reveal${isRevealed ? ' revealed' : ''}" onclick="AIPrimer.revealResults(${slideIndex})"${isRevealed ? ' disabled' : ''}>${isRevealed ? t('engine.reveal.revealed') + ' ✓' : t('engine.reveal.button')}</button>`;
    }
    html += `</div>`;
    return html;
  }

  function renderTextInput(textInput, slideIndex) {
    const isRevealed = state.revealedSlides[slideIndex];
    let html = `<div class="text-input${isRevealed ? ' revealed' : ''}" data-slide="${slideIndex}">`;
    html += `<div class="text-input__prompt">${textInput.prompt}</div>`;
    html += `<textarea class="text-input__field" placeholder="${textInput.placeholder || t('engine.textInput.placeholder')}" data-slide="${slideIndex}"></textarea>`;
    html += `<button class="btn btn--primary text-input__submit" onclick="AIPrimer.submitTextInput(${slideIndex})">${t('engine.textInput.submit')}</button>`;
    if (state.mode === 'presenter') {
      html += `<button class="btn btn--reveal${isRevealed ? ' revealed' : ''}" onclick="AIPrimer.revealResults(${slideIndex})"${isRevealed ? ' disabled' : ''}>${isRevealed ? t('engine.reveal.revealed') + ' ✓' : t('engine.reveal.button')}</button>`;
    }
    // Inline word cloud + response wall (presenter sees live, participants see after reveal)
    const hideResults = state.mode === 'participant' && !isRevealed;
    html += `<div class="text-input__results${hideResults ? ' hidden' : ''}" data-slide="${slideIndex}">`;
    html += `<div class="results__wordcloud results__wordcloud--large" data-source="${slideIndex}"></div>`;
    html += `<div class="results__wall" data-source="${slideIndex}"></div>`;
    html += `<div class="results__total" data-source="${slideIndex}">0 ${t('engine.poll.responses')}</div>`;
    html += `</div>`;
    html += `</div>`;
    return html;
  }

  // --- Lazy Media Management ---
  // Activates/deactivates videos and iframes on slide transitions to save bandwidth
  function manageSlideMedia(slideIndex, action) {
    const slideEl = document.querySelector(`.slide[data-index="${slideIndex}"]`);
    if (!slideEl) return;

    // Handle videos with data-src (lazy loaded)
    slideEl.querySelectorAll('video[data-src]').forEach(video => {
      if (action === 'activate') {
        if (!video.src) {
          video.src = video.dataset.src;
          video.load();
        }
        video.play().catch(() => {}); // autoplay may be blocked
      } else if (action === 'deactivate') {
        video.pause();
        video.currentTime = 0;
      } else if (action === 'prefetch') {
        // Set src but don't play — browser will buffer
        if (!video.src) {
          video.src = video.dataset.src;
          video.preload = 'auto';
        }
      }
    });

    // Handle iframes with data-src (lazy loaded embeds/YouTube/Vimeo)
    slideEl.querySelectorAll('iframe[data-src]').forEach(iframe => {
      if (action === 'activate' || action === 'prefetch') {
        if (!iframe.src) {
          iframe.src = iframe.dataset.src;
        }
      } else if (action === 'deactivate') {
        // For YouTube/Vimeo, remove src to stop playback and save resources
        if (iframe.src && (iframe.src.includes('youtube') || iframe.src.includes('vimeo'))) {
          iframe.src = '';
        }
      }
    });
  }

  // --- Navigation ---
  function goToSlide(index) {
    if (index < 0 || index >= state.slides.length) return;

    const prevIndex = state.currentSlide;
    state.currentSlide = index;

    // Unmount graphic from previous slide if it had one
    if (typeof GraphicContainer !== 'undefined' && state.slides[prevIndex]?.type === 'graphic') {
      GraphicContainer.unmount(prevIndex);
    }

    // --- Lazy media: pause/unload previous slide media, activate current + prefetch next ---
    manageSlideMedia(prevIndex, 'deactivate');
    manageSlideMedia(index, 'activate');
    // Prefetch next 1-2 slides
    if (index + 1 < state.slides.length) manageSlideMedia(index + 1, 'prefetch');
    if (index + 2 < state.slides.length) manageSlideMedia(index + 2, 'prefetch');

    // Update active slide
    const slideEls = document.querySelectorAll('.slide-viewport .slide');
    slideEls.forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });

    // Mount graphic if current slide is a graphic type
    if (typeof GraphicContainer !== 'undefined' && state.slides[index]?.type === 'graphic' && state.slides[index].graphic) {
      const containerEl = document.querySelector(`.slide__graphic-container[data-slide="${index}"]`);
      if (containerEl && !containerEl.querySelector('iframe')) {
        GraphicContainer.mount(
          containerEl,
          state.slides[index].graphic,
          index,
          (data) => { /* onComplete */ sendResponse(index, 'graphic', data); },
          (data) => { /* onInteraction */ addActivityItem('🎨', state.participantName || 'Participant', `interacted with graphic`); }
        );
      }
    }

    // Prefetch upcoming graphics
    if (typeof GraphicContainer !== 'undefined') {
      GraphicContainer.prefetchUpcoming(state.slides, index, 3);
    }

    // Update progress bar
    const progress = ((index + 1) / state.slides.length) * 100;
    const fill = qs('.progress-bar__fill');
    if (fill) fill.style.width = progress + '%';

    // Update counter
    const counter = qs('.slide-counter');
    if (counter) counter.textContent = `${index + 1} / ${state.slides.length}`;

    // Update progress bar / counter theme
    const currentTheme = state.slides[index].theme || 'dark';
    const progressBar = qs('.progress-bar');
    const counterEl = qs('.slide-counter');
    if (progressBar) progressBar.classList.toggle('light', currentTheme === 'light');
    if (counterEl) counterEl.classList.toggle('light', currentTheme === 'light');

    // Logo watermark: swap based on theme
    const logo = qs('.logo-watermark');
    if (logo) {
      logo.src = currentTheme === 'light' ? 'assets/AIA_Logo_GableGreen.svg' : 'assets/AIA_Logo_White.svg';
    }

    // If presenter, broadcast
    if (state.mode === 'presenter' && state.socket) {
      state.socket.emit('slide-change', { slideIndex: index });
    }

    // If presenter, update notes panel + controls
    if (state.mode === 'presenter') {
      updatePresenterNotes(index);
      updatePresenterNextPreview(index);
      // Update slide counter in controls bar
      const slideInfo = qs('.presenter-controls__slide-info');
      if (slideInfo) slideInfo.textContent = `${index + 1} / ${state.slides.length}`;
      // Update section progress strip
      updateSectionProgress(index);
      // Update session panel slide progress
      updateSessionPanel();
    }

    // If participant, update toolbar
    if (state.mode === 'participant') {
      updateParticipantToolbar();
    }
  }

  function next() { goToSlide(state.currentSlide + 1); }
  function prev() { goToSlide(state.currentSlide - 1); }

  // --- Keyboard Controls ---
  function handleKeydown(e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

    // Participant keyboard controls (free-browse)
    if (state.mode === 'participant') {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          participantNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          participantPrev();
          break;
        case 'Escape':
          e.preventDefault();
          if (participantMenuOpen) toggleParticipantMenu();
          else participantSnapToLive();
          break;
        case 'b':
          e.preventDefault();
          toggleBookmark(state.currentSlide);
          break;
        case 'm':
          e.preventDefault();
          toggleParticipantMenu();
          break;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'PageDown':
        e.preventDefault();
        next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        prev();
        break;
      case 'Home':
        e.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        e.preventDefault();
        goToSlide(state.slides.length - 1);
        break;
      case 'f':
        toggleFullscreen();
        break;
      case 's':
        if (state.mode === 'presenter') toggleSectionNav();
        break;
      case 'Escape':
        if (quickExitOpen) { AIPrimer.dismissQuickExit(); e.preventDefault(); }
        else if (sectionNavOpen) { toggleSectionNav(); e.preventDefault(); }
        else if (state.mode === 'presenter') { AIPrimer.showQuickExit(); e.preventDefault(); }
        break;
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  // --- Touch Controls (mobile swipe) ---
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    touchStartTime = Date.now();
  }

  function handleTouchEnd(e) {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    const dt = Date.now() - touchStartTime;

    // Require horizontal swipe > 40px, more horizontal than vertical, within 500ms
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx) || dt > 500) return;

    if (state.mode === 'participant') {
      // Free-browse: swipe left to go forward (up to presenter), swipe right to go back
      if (dx < 0) participantNext();
      else participantPrev();
      return;
    }

    if (dx < 0) next();
    else prev();
  }

  // --- Interactive Component Handlers ---
  window.AIPrimer = window.AIPrimer || {};

  AIPrimer.getSocket = function () { return state.socket; };

  AIPrimer.selectQuizOption = function (slideIndex, optionIndex) {
    const quiz = state.slides[slideIndex].quiz;
    if (!quiz) return;

    // Visual update
    const container = document.querySelector(`.quiz[data-slide="${slideIndex}"]`);
    if (!container) return;

    const options = container.querySelectorAll('.quiz__option');
    options.forEach(o => o.classList.remove('selected', 'correct', 'incorrect'));
    options[optionIndex].classList.add('selected');

    // If in self-paced or we want to show correct immediately
    if (state.mode === 'self') {
      setTimeout(() => {
        options.forEach((o, i) => {
          if (i === quiz.correct) o.classList.add('correct');
          else if (i === optionIndex && i !== quiz.correct) o.classList.add('incorrect');
        });
      }, 600);
    }

    // Send response
    sendResponse(slideIndex, 'quiz', { option: optionIndex });
  };

  AIPrimer.selectPollOption = function (slideIndex, optionIndex) {
    sendResponse(slideIndex, 'poll', { option: optionIndex });

    // Mark selected
    const container = document.querySelector(`.poll[data-slide="${slideIndex}"]`);
    if (!container) return;
    container.querySelectorAll('.poll__bar-track').forEach(t => t.classList.remove('selected'));
    container.querySelector(`.poll__bar-track[data-option="${optionIndex}"]`).classList.add('selected');
  };

  AIPrimer.submitTextInput = function (slideIndex) {
    const field = document.querySelector(`.text-input[data-slide="${slideIndex}"] textarea`);
    if (!field || !field.value.trim()) return;

    sendResponse(slideIndex, 'text', { text: field.value.trim() });
    field.disabled = true;
    const btn = document.querySelector(`.text-input[data-slide="${slideIndex}"] .btn`);
    if (btn) {
      btn.textContent = 'Submitted';
      btn.disabled = true;
    }
  };
  AIPrimer.revealResults = function (slideIndex) {
    if (!state.socket || !state.connected) return;
    const slide = state.slides[slideIndex];
    const type = slide.poll ? 'poll' : slide.quiz ? 'quiz' : 'text';
    state.socket.emit('results-reveal', { slideIndex, type });

    // Optimistic UI — disable button immediately
    const btn = document.querySelector(`.poll[data-slide="${slideIndex}"] .btn--reveal, .quiz[data-slide="${slideIndex}"] .btn--reveal, .text-input[data-slide="${slideIndex}"] .btn--reveal`);
    if (btn) {
      btn.disabled = true;
      btn.classList.add('revealed');
      btn.textContent = t('engine.reveal.revealed') + ' ✓';
    }
  };

  function sendResponse(slideIndex, type, data) {
    const payload = {
      slideIndex,
      type,
      data,
      participantId: state.participantId,
      participantName: state.participantName,
      timestamp: Date.now(),
    };

    if (state.socket && state.connected) {
      state.socket.emit('response', payload);
    }

    // Store locally too
    if (!state.responses[slideIndex]) state.responses[slideIndex] = {};
    state.responses[slideIndex][state.participantId || 'self'] = payload;
  }

  // --- Poll Results Update ---
  function updatePollResults(slideIndex, results) {
    // In participant mode, don't update bars until results are revealed
    if (state.mode === 'participant' && !state.revealedSlides[slideIndex]) return;
    // results = { options: [count, count, ...], total: N }
    const container = document.querySelector(`.poll[data-slide="${slideIndex}"]`);
    if (!container) return;

    const total = results.total || 1;
    results.options.forEach((count, i) => {
      const pct = Math.round((count / total) * 100);
      const fill = container.querySelector(`.poll__bar-track[data-option="${i}"] .poll__bar-fill`);
      const pctLabel = container.querySelector(`.poll__bar-pct[data-option="${i}"]`);
      if (fill) fill.style.width = pct + '%';
      if (pctLabel) pctLabel.textContent = pct + '%';
    });

    const totalEl = container.querySelector('.poll__total');
    if (totalEl) totalEl.textContent = `${results.total} response${results.total !== 1 ? 's' : ''}`;
  }

  // --- Results Renderer ---
  function renderResults(results, slideIndex) {
    // results = { sourceSlideIndex: N, responseType: 'poll' | 'quiz' | 'text' }
    const sourceSlide = state.slides[results.sourceSlideIndex];
    if (!sourceSlide) return '';

    let html = `<div class="results" data-results-slide="${slideIndex}" data-source="${results.sourceSlideIndex}" data-response-type="${results.responseType}">`;

    if (results.responseType === 'poll' || results.responseType === 'quiz') {
      const options = results.responseType === 'poll'
        ? (sourceSlide.poll?.options || [])
        : (sourceSlide.quiz?.options || []);
      const correctIdx = results.responseType === 'quiz' ? sourceSlide.quiz?.correct : -1;

      html += `<div class="results__bars">`;
      options.forEach((opt, i) => {
        const correctClass = (correctIdx >= 0 && i === correctIdx) ? ' correct' : '';
        html += `<div class="results__bar-item">`;
        html += `<div class="results__bar-label">${opt}</div>`;
        html += `<div class="results__bar-track">`;
        html += `<div class="results__bar-fill${correctClass}" data-option="${i}" style="width:0%"></div>`;
        html += `</div>`;
        html += `<div class="results__bar-pct" data-option="${i}">0%</div>`;
        html += `</div>`;
      });
      html += `</div>`;
      html += `<div class="results__total" data-source="${results.sourceSlideIndex}">0 responses</div>`;
    }

    if (results.responseType === 'text') {
      html += `<div class="results__wordcloud" data-source="${results.sourceSlideIndex}"></div>`;
      html += `<div class="results__wall" data-source="${results.sourceSlideIndex}"></div>`;
      html += `<div class="results__total" data-source="${results.sourceSlideIndex}">0 responses</div>`;
    }

    html += `</div>`;
    return html;
  }

  // --- Quiz Results Update ---
  function updateQuizResults(slideIndex, results) {
    // results = { options: [count, ...], total: N }
    // Find results slides that reference this slideIndex
    document.querySelectorAll(`.results[data-source="${slideIndex}"][data-response-type="quiz"]`).forEach(container => {
      const total = results.total || 1;
      results.options.forEach((count, i) => {
        const pct = Math.round((count / total) * 100);
        const fill = container.querySelector(`.results__bar-fill[data-option="${i}"]`);
        const pctLabel = container.querySelector(`.results__bar-pct[data-option="${i}"]`);
        if (fill) fill.style.width = pct + '%';
        if (pctLabel) pctLabel.textContent = pct + '%';
      });
      const totalEl = container.querySelector('.results__total');
      if (totalEl) totalEl.textContent = `${results.total} response${results.total !== 1 ? 's' : ''}`;
    });
  }

  // --- Word Cloud + Response Wall Helpers ---
  function renderWordCloudInto(cloudEl, words) {
    if (!cloudEl || !words) return;
    const maxCount = words.length ? words[0].count : 1;
    cloudEl.innerHTML = words.slice(0, 40).map((w, i) => {
      // Dynamic sizing based on actual frequency (more granular than tiers)
      const ratio = w.count / maxCount;
      const size = 0.75 + (ratio * 1.8); // 0.75rem to 2.55rem
      const tier = ratio > 0.7 ? 1 : ratio > 0.45 ? 2 : ratio > 0.25 ? 3 : ratio > 0.1 ? 4 : 5;
      return `<span class="results__word results__word--${tier}" style="font-size:${size.toFixed(2)}rem;animation-delay:${i * 0.04}s">${w.word}<sup class="results__word-count">${w.count}</sup></span>`;
    }).join('');
  }

  function renderWallInto(wallEl, texts) {
    if (!wallEl || !texts) return;
    wallEl.innerHTML = texts.slice(-12).reverse().map((t, i) =>
      `<div class="results__wall-item" style="animation-delay:${i * 0.06}s"><span class="results__wall-name">${t.name}</span> ${t.text.substring(0, 120)}${t.text.length > 120 ? '…' : ''}</div>`
    ).join('');
  }

  // --- Text Results Update ---
  function updateTextResults(slideIndex, results) {
    // results = { words: [{word, count}, ...], texts: [{name, text}, ...], total: N }
    // In participant mode, don't update until results are revealed
    if (state.mode === 'participant' && !state.revealedSlides[slideIndex]) return;

    // Update inline text-input results (word cloud on same slide)
    document.querySelectorAll(`.text-input__results[data-slide="${slideIndex}"]`).forEach(container => {
      renderWordCloudInto(container.querySelector('.results__wordcloud'), results.words);
      renderWallInto(container.querySelector('.results__wall'), results.texts);
      const totalEl = container.querySelector('.results__total');
      if (totalEl) totalEl.textContent = `${results.total} response${results.total !== 1 ? 's' : ''}`;
    });

    // Update dedicated results slides that reference this slide
    document.querySelectorAll(`.results[data-source="${slideIndex}"][data-response-type="text"]`).forEach(container => {
      renderWordCloudInto(container.querySelector('.results__wordcloud'), results.words);
      renderWallInto(container.querySelector('.results__wall'), results.texts);
      const totalEl = container.querySelector('.results__total');
      if (totalEl) totalEl.textContent = `${results.total} response${results.total !== 1 ? 's' : ''}`;
    });
  }

  // --- Presenter View Helpers ---
  function updatePresenterNotes(index) {
    const notesEl = qs('.presenter-notes__content');
    if (!notesEl) return;
    notesEl.innerHTML = state.slides[index].notes || '<em style="opacity:0.4">' + t('engine.presenter.noNotes') + '</em>';
  }

  function updatePresenterNextPreview(index) {
    const previewEl = qs('.presenter-next__preview');
    if (!previewEl) return;
    const nextSlide = state.slides[index + 1];
    if (nextSlide) {
      const mini = renderSlide(nextSlide, index + 1);
      mini.classList.add('active');
      previewEl.innerHTML = '';
      previewEl.appendChild(mini);
    } else {
      previewEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;opacity:0.3;font-size:0.8rem;">' + t('engine.presenter.endOfPresentation') + '</div>';
    }
  }

  // --- WebSocket Connection ---
  function connectSocket(sessionCode, mode) {
    if (typeof io === 'undefined') {
      console.warn('Socket.io not loaded — running in offline mode');
      return;
    }

    const serverUrl = (typeof CONFIG !== 'undefined' && CONFIG.SERVER_URL) || window.location.origin;
    state.socket = io(serverUrl, {
      query: {
        sessionCode,
        mode,
        participantName: state.participantName,
        participantId: state.participantId,
      }
    });

    state.socket.on('connect', () => {
      state.connected = true;
      console.log('Connected to session:', sessionCode);
      if (state.onSocketReady) state.onSocketReady(state.socket);

      // Presenter: broadcast available languages so participants can switch
      if (mode === 'presenter') {
        const langs = getAvailableSessionLanguages();
        if (langs.length > 1) {
          state.socket.emit('available-languages', { languages: langs });
        }
      }
    });

    state.socket.on('disconnect', () => {
      state.connected = false;
    });

    // Participant: follow presenter's slide (with free-browse support)
    if (mode === 'participant') {
      state.socket.on('slide-change', (data) => {
        state.presenterSlide = data.slideIndex;
        if (!state.freeBrowsing) {
          goToSlide(data.slideIndex);
        }
        // Update the snap-to-live button state
        updateParticipantToolbar();
      });

      state.socket.on('session-state', (data) => {
        if (data.revealedSlides) {
          state.revealedSlides = data.revealedSlides;
        }
        if (data.currentSlide !== undefined) {
          state.presenterSlide = data.currentSlide;
        }
        if (data.resources) {
          state.resources = data.resources;
        }
        if (data.availableLanguages && data.availableLanguages.length > 1) {
          state.availableLanguages = data.availableLanguages;
          // Re-render the menu language dropdown if it's open
          const langSelect = document.querySelector('.pm-lang-select');
          if (langSelect) {
            const langs = data.availableLanguages;
            langSelect.innerHTML = langs.map(function (code) {
              var selected = code === state.language ? ' selected' : '';
              var name = LANG_NAMES[code] || code;
              return '<option value="' + code + '"' + selected + '>' + name + '</option>';
            }).join('');
          }
        }
      });

      // Q&A: receive questions list updates
      state.socket.on('questions-update', (data) => {
        state.questions = data.questions || [];
        updateQAPanel();
        updateQABadge();
      });

      // Session ended
      state.socket.on('session-end', () => {
        showParticipantSessionEnded();
      });
    }

    // Presenter: receive responses and session state for reconnection
    if (mode === 'presenter') {
      state.socket.on('session-state', (data) => {
        // Resume at the correct slide if reconnecting
        if (data.currentSlide && data.currentSlide !== state.currentSlide) {
          goToSlide(data.currentSlide);
        }
        if (data.participants) {
          state.participants = data.participants;
          updateParticipantCount();
        }
        if (data.revealedSlides) {
          state.revealedSlides = data.revealedSlides;
        }
      });

      state.socket.on('response', (data) => {
        handleIncomingResponse(data);
        // Update participant list if included
        if (data.participants) {
          state.participants = data.participants;
          updateAdminConsole();
        }
      });

      state.socket.on('participant-joined', (data) => {
        state.participants = data.participants || [];
        updateParticipantCount();
        addActivityItem('🟢', data.participantName || t('engine.fallback.someone'), t('engine.activity.joined'));
      });

      state.socket.on('participant-left', (data) => {
        state.participants = data.participants || [];
        updateParticipantCount();
        addActivityItem('🔴', data.participantName || t('engine.fallback.someone'), t('engine.activity.left'));
      });

      // Q&A: receive questions list updates (presenter)
      state.socket.on('questions-update', (data) => {
        state.questions = data.questions || [];
        updatePresenterQAPanel();
        updatePresenterQABadge();
        if (data.latestFrom) {
          addActivityItem('❓', data.latestFrom, 'asked a question');
        }
      });
    }

    // Everyone: receive aggregated results updates
    state.socket.on('poll-update', (data) => {
      updatePollResults(data.slideIndex, data.results);
    });

    state.socket.on('quiz-update', (data) => {
      updateQuizResults(data.slideIndex, data.results);
    });

    state.socket.on('results-revealed', (data) => {
      state.revealedSlides[data.slideIndex] = true;

      if (data.type === 'poll') {
        const container = document.querySelector(`.poll[data-slide="${data.slideIndex}"]`);
        if (container) {
          container.classList.add('revealed');
          // Show hidden elements
          container.querySelectorAll('.poll__bar-pct.hidden').forEach(el => el.classList.remove('hidden'));
          const totalEl = container.querySelector('.poll__total.hidden');
          if (totalEl) totalEl.classList.remove('hidden');
        }
        updatePollResults(data.slideIndex, data.results);
      }

      if (data.type === 'quiz') {
        const container = document.querySelector(`.quiz[data-slide="${data.slideIndex}"]`);
        if (container) {
          container.classList.add('revealed');
          // Mark correct/incorrect
          const slide = state.slides[data.slideIndex];
          if (slide && slide.quiz) {
            container.querySelectorAll('.quiz__option').forEach((opt, i) => {
              if (i === slide.quiz.correct) opt.classList.add('correct');
              else opt.classList.add('incorrect');
            });
          }
        }
      }

      if (data.type === 'text') {
        // Show inline results container
        const resultsContainer = document.querySelector(`.text-input__results[data-slide="${data.slideIndex}"]`);
        if (resultsContainer) {
          resultsContainer.classList.remove('hidden');
          renderWordCloudInto(resultsContainer.querySelector('.results__wordcloud'), data.results.words);
          renderWallInto(resultsContainer.querySelector('.results__wall'), data.results.texts);
          const totalEl = resultsContainer.querySelector('.results__total');
          if (totalEl) totalEl.textContent = `${data.results.total} response${data.results.total !== 1 ? 's' : ''}`;
        }
        // Also update any dedicated results slides
        updateTextResults(data.slideIndex, data.results);
      }

      // Update reveal button if present (presenter view)
      const btn = document.querySelector(`.poll[data-slide="${data.slideIndex}"] .btn--reveal, .quiz[data-slide="${data.slideIndex}"] .btn--reveal, .text-input[data-slide="${data.slideIndex}"] .btn--reveal`);
      if (btn) {
        btn.disabled = true;
        btn.classList.add('revealed');
        btn.textContent = t('engine.reveal.revealed') + ' ✓';
      }
    });

    state.socket.on('text-update', (data) => {
      updateTextResults(data.slideIndex, data.results);
    });

    // Graphic interaction sync — forward to active graphic iframe
    state.socket.on('graphic-update', (data) => {
      if (typeof GraphicContainer !== 'undefined') {
        const instance = GraphicContainer._instances[data.slideIndex];
        if (instance && instance.iframe && instance.iframe.contentWindow) {
          instance.iframe.contentWindow.postMessage({
            type: 'SESSION_DATA',
            data: data.results,
          }, '*');
        }
      }
    });

    // Language change — presenter switched language
    // In participant mode, language is now personal (client-side only), so we don't auto-switch
    state.socket.on('language-change', (data) => {
      if (state.mode === 'participant') {
        // Don't auto-switch for participants — they choose their own language
        console.log('[Engine] Presenter changed language to', data.language, '— participant keeps their own choice');
        return;
      }
      if (data.language && data.language !== state.language) {
        console.log('[Engine] Language change received:', data.language);
        setLanguage(data.language);
      }
    });
  }

  function handleIncomingResponse(data) {
    // Store
    if (!state.responses[data.slideIndex]) state.responses[data.slideIndex] = {};
    state.responses[data.slideIndex][data.participantId] = data;

    // Update response stream in presenter sidebar
    const stream = qs('.response-stream');
    if (stream) {
      const item = el('div', 'response-item');
      let text = '';
      const optLabels = t('engine.quiz.optionLabels');
      const optLetters = Array.isArray(optLabels) ? optLabels : ['A','B','C','D'];
      if (data.type === 'quiz') text = `selected option ${optLetters[data.data.option]}`;
      else if (data.type === 'poll') text = `voted for option ${data.data.option + 1}`;
      else if (data.type === 'text') text = `"${data.data.text.substring(0, 80)}${data.data.text.length > 80 ? '...' : ''}"`;
      item.innerHTML = `<span class="response-item__name">${data.participantName || t('engine.fallback.anonymous')}</span> ${text}`;
      stream.appendChild(item);
      stream.scrollTop = stream.scrollHeight;
    }

    // Log to admin console activity feed
    const name = data.participantName || t('engine.fallback.anonymous');
    if (data.type === 'quiz') {
      const aLabels = t('engine.quiz.optionLabels');
      const aLetters = Array.isArray(aLabels) ? aLabels : ['A','B','C','D'];
      addActivityItem('📝', name, `${t('engine.activity.quizAnswer')} (option ${aLetters[data.data.option]})`);
    } else if (data.type === 'poll') {
      addActivityItem('📊', name, `voted in poll`);
    } else if (data.type === 'text') {
      const preview = data.data.text.substring(0, 40) + (data.data.text.length > 40 ? '...' : '');
      addActivityItem('💬', name, `submitted: "${preview}"`);
    }

    // Update response counter
    updateAdminConsole();
  }

  function updateParticipantCount() {
    const countEl = qs('.presenter-controls__participant-count');
    if (countEl) countEl.textContent = state.participants.length;
    updateSessionPanel();
  }

  // --- Admin Console (slide-out panel for presenter) ---
  let adminConsoleTab = 'participants';
  let activityLog = [];

  function renderAdminConsole() {
    const panel = el('div', 'admin-console');
    panel.id = 'admin-console';

    const joinUrl = window.location.origin + '/join.html?code=' + (state.sessionCode || '');

    panel.innerHTML = `
      <div class="ac-header">
        <div class="ac-header__title">
          <span class="ac-header__dot"></span>
          <span>${t('engine.adminConsole.title')}</span>
          <span class="ac-header__code">${state.sessionCode || ''}</span>
        </div>
        <button class="ac-header__close" onclick="AIPrimer.toggleAdminConsole()">&times;</button>
      </div>

      <div class="ac-stats">
        <div class="ac-stat">
          <div class="ac-stat__number" id="ac-participant-count">${state.participants.length}</div>
          <div class="ac-stat__label">${t('engine.adminConsole.connected')}</div>
        </div>
        <div class="ac-stat">
          <div class="ac-stat__number" id="ac-slide-progress">${state.currentSlide + 1}/${state.slides.length}</div>
          <div class="ac-stat__label">${t('engine.adminConsole.slide')}</div>
        </div>
        <div class="ac-stat">
          <div class="ac-stat__number" id="ac-response-count">${Object.keys(state.responses).reduce((sum, k) => sum + Object.keys(state.responses[k]).length, 0)}</div>
          <div class="ac-stat__label">${t('engine.adminConsole.responses')}</div>
        </div>
      </div>

      <div class="ac-tabs">
        <button class="ac-tab ac-tab--active" data-tab="participants" onclick="AIPrimer.switchAdminTab('participants')">${t('engine.adminConsole.participants')}</button>
        <button class="ac-tab" data-tab="qa" onclick="AIPrimer.switchAdminTab('qa')">Q&amp;A <span class="ac-tab__badge" id="ac-qa-badge" style="display:${state.questions.length > 0 ? 'inline' : 'none'}">${state.questions.length}</span></button>
        <button class="ac-tab" data-tab="activity" onclick="AIPrimer.switchAdminTab('activity')">${t('engine.adminConsole.activity')}</button>
        <button class="ac-tab" data-tab="session" onclick="AIPrimer.switchAdminTab('session')">${t('engine.adminConsole.session')}</button>
      </div>

      <div class="ac-panel" id="ac-panel-participants">
        <div id="ac-participant-list" class="ac-participant-list">
          ${renderParticipantList()}
        </div>
      </div>

      <div class="ac-panel ac-panel--hidden" id="ac-panel-qa">
        <div id="ac-qa-list" class="ac-qa-list">
          ${renderPresenterQAList()}
        </div>
      </div>

      <div class="ac-panel ac-panel--hidden" id="ac-panel-activity">
        <div id="ac-activity-log" class="ac-activity-log">
          ${activityLog.length === 0 ? '<div class="ac-empty">' + t('engine.adminConsole.noActivity') + '</div>' : activityLog.map(renderActivityItem).join('')}
        </div>
      </div>

      <div class="ac-panel ac-panel--hidden" id="ac-panel-session">
        <div class="ac-session-info">
          <div class="ac-session-row">
            <span class="ac-session-label">${t('engine.adminConsole.joinLink')}</span>
            <a href="${joinUrl}" target="_blank" class="ac-session-link">${joinUrl}</a>
          </div>
          <div class="ac-session-row">
            <span class="ac-session-label">${t('engine.adminConsole.status')}</span>
            <span class="ac-session-value" id="ac-connection-status">${state.connected ? t('engine.status.connected') : t('engine.status.connecting')}</span>
          </div>
        </div>
        <div class="ac-controls">
          <button class="ac-control-btn" onclick="AIPrimer.pauseAndDashboard()" style="background:rgba(255,255,255,0.08);color:#fff;">← Dashboard</button>
          <button class="ac-control-btn" onclick="AIPrimer.pauseAndNewSession()" style="background:rgba(0,177,255,0.12);color:#00B1FF;">+ New Session</button>
          <button class="ac-control-btn ac-control-btn--pause" onclick="AIPrimer.adminPause()">⏸ ${t('engine.adminConsole.pauseSession')}</button>
          <button class="ac-control-btn ac-control-btn--end" onclick="AIPrimer.adminEnd()">⏹ ${t('engine.adminConsole.endSession')}</button>
        </div>
      </div>
    `;

    return panel;
  }

  function renderParticipantList() {
    if (state.participants.length === 0) {
      return '<div class="ac-empty">' + t('engine.adminConsole.noParticipants') + '</div>';
    }

    return state.participants.map(p => {
      const initial = (p.name || 'A').charAt(0).toUpperCase();
      const slideLabel = (p.currentSlide !== undefined) ? `${t('engine.adminConsole.slide')} ${p.currentSlide + 1}` : '';
      const activityIcon = p.lastActivityType === 'quiz' ? '📝' :
                           p.lastActivityType === 'poll' ? '📊' :
                           p.lastActivityType === 'text' ? '💬' :
                           p.lastActivityType === 'joined' ? '🟢' : '';
      const timeSince = p.lastActivity ? getTimeSince(p.lastActivity) : '';

      return `<div class="ac-participant">
        <div class="ac-participant__avatar">${initial}</div>
        <div class="ac-participant__info">
          <div class="ac-participant__name">${p.name || t('engine.fallback.anonymous')}</div>
          <div class="ac-participant__meta">${slideLabel}${timeSince ? ' · ' + timeSince : ''}</div>
        </div>
        <div class="ac-participant__activity">${activityIcon}</div>
      </div>`;
    }).join('');
  }

  function renderActivityItem(item) {
    return `<div class="ac-activity-item">
      <span class="ac-activity-item__icon">${item.icon || '•'}</span>
      <span class="ac-activity-item__text"><strong>${item.name}</strong> ${item.action}</span>
      <span class="ac-activity-item__time">${item.timeLabel || ''}</span>
    </div>`;
  }

  function getTimeSince(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    if (diff < 10000) return 'just now';
    if (diff < 60000) return Math.floor(diff / 1000) + 's ago';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    return Math.floor(diff / 3600000) + 'h ago';
  }

  function addActivityItem(icon, name, action) {
    const item = { icon, name, action, timeLabel: 'just now', timestamp: Date.now() };
    activityLog.unshift(item);
    if (activityLog.length > 50) activityLog.pop();

    const logEl = document.getElementById('ac-activity-log');
    if (logEl) {
      if (logEl.querySelector('.ac-empty')) logEl.innerHTML = '';
      logEl.insertAdjacentHTML('afterbegin', renderActivityItem(item));
    }
  }

  function switchAdminTab(tab) {
    adminConsoleTab = tab;
    const console = document.getElementById('admin-console');
    if (!console) return;

    console.querySelectorAll('.ac-tab').forEach(t => {
      t.classList.toggle('ac-tab--active', t.dataset.tab === tab);
    });
    console.querySelectorAll('.ac-panel').forEach(p => {
      p.classList.toggle('ac-panel--hidden', !p.id.endsWith(tab));
    });
  }

  function toggleAdminConsole() {
    let panel = document.getElementById('admin-console');
    if (!panel) {
      panel = renderAdminConsole();
      const layout = qs('.presenter-layout');
      if (layout) layout.appendChild(panel);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => panel.classList.add('open'));
      });
    } else {
      panel.classList.toggle('open');
    }
  }

  function openQAPanel() {
    // Open admin console if not open, then switch to Q&A tab
    let panel = document.getElementById('admin-console');
    if (!panel) {
      panel = renderAdminConsole();
      const layout = qs('.presenter-layout');
      if (layout) layout.appendChild(panel);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panel.classList.add('open');
          switchAdminTab('qa');
        });
      });
    } else if (!panel.classList.contains('open')) {
      panel.classList.add('open');
      switchAdminTab('qa');
    } else {
      switchAdminTab('qa');
    }
  }

  function updateAdminConsole() {
    const countEl = document.getElementById('ac-participant-count');
    if (countEl) countEl.textContent = state.participants.length;

    const slideEl = document.getElementById('ac-slide-progress');
    if (slideEl) slideEl.textContent = `${state.currentSlide + 1}/${state.slides.length}`;

    const responseCount = Object.keys(state.responses).reduce((sum, k) => sum + Object.keys(state.responses[k]).length, 0);
    const respEl = document.getElementById('ac-response-count');
    if (respEl) respEl.textContent = responseCount;

    const statusEl = document.getElementById('ac-connection-status');
    if (statusEl) statusEl.textContent = state.connected ? t('engine.status.connected') : t('engine.status.disconnected');

    const listEl = document.getElementById('ac-participant-list');
    if (listEl) {
      listEl.innerHTML = renderParticipantList();
    }
  }

  // Keep backward compat
  function updateSessionPanel() { updateAdminConsole(); }
  function toggleSessionPanel() { toggleAdminConsole(); }

  // --- Section Navigator (presenter-only overlay) ---
  let sectionNavOpen = false;

  function getSectionMap() {
    // Build section → slide index mapping from course metadata or slide prefixes
    const sections = [];
    const meta = state.courseMeta;

    if (meta && meta.sections && meta.sections.length > 0) {
      // Use course metadata sections
      meta.sections.forEach(sec => {
        const firstIdx = state.slides.findIndex(s => s.id && s.id.startsWith(sec.prefix + '-'));
        if (firstIdx >= 0) {
          // Count slides in this section
          let count = 0;
          for (let i = firstIdx; i < state.slides.length; i++) {
            if (state.slides[i].id && state.slides[i].id.startsWith(sec.prefix + '-')) count++;
            else if (count > 0) break;
          }
          sections.push({
            label: sec.label,
            prefix: sec.prefix,
            startIndex: firstIdx,
            slideCount: count,
          });
        }
      });
    } else {
      // Fallback: detect from section-type slides
      state.slides.forEach((slide, i) => {
        if (slide.type === 'section') {
          sections.push({
            label: slide.title || `Section ${sections.length + 1}`,
            prefix: '',
            startIndex: i,
            slideCount: 0,
          });
        }
      });
      // Calculate counts
      for (let i = 0; i < sections.length; i++) {
        const nextStart = (i + 1 < sections.length) ? sections[i + 1].startIndex : state.slides.length;
        sections[i].slideCount = nextStart - sections[i].startIndex;
      }
    }

    return sections;
  }

  function getCurrentSectionIndex(sections) {
    for (let i = sections.length - 1; i >= 0; i--) {
      if (state.currentSlide >= sections[i].startIndex) return i;
    }
    return 0;
  }

  function renderSectionNav() {
    const sections = getSectionMap();
    const currentSec = getCurrentSectionIndex(sections);

    let html = `
      <div class="section-nav-overlay" onclick="AIPrimer.toggleSectionNav()">
        <div class="section-nav" onclick="event.stopPropagation()">
          <div class="section-nav__header">
            <div class="section-nav__title">${t('engine.sectionNav.title')}</div>
            <div class="section-nav__hint">${t('engine.sectionNav.hint')}</div>
            <button class="section-nav__close" onclick="AIPrimer.toggleSectionNav()">&times;</button>
          </div>
          <div class="section-nav__grid">
    `;

    sections.forEach((sec, i) => {
      const isCurrent = i === currentSec;
      const slide = state.slides[sec.startIndex];
      const slideNum = sec.startIndex + 1;
      const endNum = sec.startIndex + sec.slideCount;

      html += `
        <div class="section-nav__card${isCurrent ? ' section-nav__card--current' : ''}" onclick="AIPrimer.goToSlide(${sec.startIndex}); AIPrimer.toggleSectionNav();">
          <div class="section-nav__thumbnail">
            <div class="section-nav__thumbnail-inner" data-section-thumb="${sec.startIndex}"></div>
          </div>
          <div class="section-nav__info">
            <div class="section-nav__label">${sec.label}</div>
            <div class="section-nav__meta">${sec.slideCount} ${t('engine.sectionNav.slides')} · ${slideNum}–${endNum}</div>
          </div>
          ${isCurrent ? '<div class="section-nav__badge">' + t('engine.sectionNav.current') + '</div>' : ''}
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;

    return { html, sections };
  }

  function toggleSectionNav() {
    let overlay = qs('.section-nav-overlay');
    if (overlay) {
      overlay.remove();
      sectionNavOpen = false;
      return;
    }

    const { html, sections } = renderSectionNav();
    const layout = qs('.presenter-layout');
    if (!layout) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const overlayEl = wrapper.firstElementChild;
    layout.appendChild(overlayEl);
    sectionNavOpen = true;

    // Render mini thumbnails into each card
    requestAnimationFrame(() => {
      sections.forEach(sec => {
        const thumbContainer = overlayEl.querySelector(`[data-section-thumb="${sec.startIndex}"]`);
        if (thumbContainer && state.slides[sec.startIndex]) {
          const mini = renderSlide(state.slides[sec.startIndex], sec.startIndex);
          mini.classList.add('active');
          thumbContainer.appendChild(mini);
        }
      });
    });
  }

  // --- Section Progress Scrubber (presenter-only, above controls bar) ---
  let sectionProgressCache = null;
  let scrubbing = false;

  function buildSectionProgress() {
    const container = document.getElementById('section-progress');
    if (!container) return;

    const sections = getSectionMap();
    if (sections.length === 0) return;

    sectionProgressCache = sections;
    const total = state.slides.length;

    // Build section segments with individual slide ticks inside
    let html = '<div class="section-progress__track" id="sp-track">';

    sections.forEach((sec, i) => {
      const widthPct = (sec.slideCount / total) * 100;
      html += `<div class="section-progress__segment" data-section="${i}" style="width:${widthPct}%">`;
      html += `<div class="section-progress__fill"></div>`;
      html += `<span class="section-progress__label">${sec.label}</span>`;

      // Render individual slide ticks within this segment
      for (let s = 0; s < sec.slideCount; s++) {
        const slideIdx = sec.startIndex + s;
        const tickWidthPct = (1 / sec.slideCount) * 100;
        html += `<div class="section-progress__tick" data-slide="${slideIdx}" style="width:${tickWidthPct}%"></div>`;
      }

      html += `</div>`;
    });

    html += '</div>';

    // Marker dot
    html += '<div class="section-progress__marker" id="section-progress-marker"></div>';

    // Hover tooltip
    html += '<div class="section-progress__tooltip" id="sp-tooltip"></div>';

    container.innerHTML = html;

    // --- Scrub interaction: click and drag ---
    const track = document.getElementById('sp-track');

    function slideIndexFromX(clientX) {
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.min(Math.floor(pct * total), total - 1);
    }

    track.addEventListener('mousedown', (e) => {
      e.preventDefault();
      scrubbing = true;
      container.classList.add('section-progress--scrubbing');
      const idx = slideIndexFromX(e.clientX);
      goToSlide(idx);
    });

    document.addEventListener('mousemove', (e) => {
      if (!scrubbing) return;
      e.preventDefault();
      const idx = slideIndexFromX(e.clientX);
      goToSlide(idx);
    });

    document.addEventListener('mouseup', () => {
      if (scrubbing) {
        scrubbing = false;
        container.classList.remove('section-progress--scrubbing');
      }
    });

    // --- Hover tooltip ---
    track.addEventListener('mousemove', (e) => {
      if (scrubbing) return; // Don't show tooltip while dragging
      const idx = slideIndexFromX(e.clientX);
      const slide = state.slides[idx];
      if (!slide) return;

      const tooltip = document.getElementById('sp-tooltip');
      if (!tooltip) return;

      const rect = track.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;

      // Find which section this slide belongs to
      const secIdx = getCurrentSectionIndex(sectionProgressCache, idx);
      const secLabel = sectionProgressCache[secIdx] ? sectionProgressCache[secIdx].label : '';

      tooltip.textContent = `${idx + 1}. ${slide.title || slide.type}`;
      tooltip.style.left = xPct + '%';
      tooltip.classList.add('section-progress__tooltip--visible');
    });

    track.addEventListener('mouseleave', () => {
      const tooltip = document.getElementById('sp-tooltip');
      if (tooltip) tooltip.classList.remove('section-progress__tooltip--visible');
    });

    updateSectionProgress(state.currentSlide);
  }

  // Allow getCurrentSectionIndex to optionally accept a custom slideIndex
  const _origGetCurrentSectionIndex = getCurrentSectionIndex;
  getCurrentSectionIndex = function(sections, overrideIndex) {
    const idx = overrideIndex !== undefined ? overrideIndex : state.currentSlide;
    for (let i = sections.length - 1; i >= 0; i--) {
      if (idx >= sections[i].startIndex) return i;
    }
    return 0;
  };

  function updateSectionProgress(slideIndex) {
    const container = document.getElementById('section-progress');
    if (!container) return;

    const sections = sectionProgressCache || getSectionMap();
    if (sections.length === 0) return;

    const total = state.slides.length;

    // Update segment active states
    const currentSec = getCurrentSectionIndex(sections, slideIndex);
    container.querySelectorAll('.section-progress__segment').forEach((seg, i) => {
      seg.classList.toggle('section-progress__segment--past', i < currentSec);
      seg.classList.toggle('section-progress__segment--current', i === currentSec);
      seg.classList.toggle('section-progress__segment--future', i > currentSec);

      // Fill proportionally within current section
      const fillEl = seg.querySelector('.section-progress__fill');
      if (fillEl) {
        if (i < currentSec) {
          fillEl.style.width = '100%';
        } else if (i === currentSec) {
          const secStart = sections[i].startIndex;
          const secCount = sections[i].slideCount;
          const progressInSection = Math.min(((slideIndex - secStart + 1) / secCount) * 100, 100);
          fillEl.style.width = progressInSection + '%';
        } else {
          fillEl.style.width = '0%';
        }
      }

      // Update tick active states within this segment
      seg.querySelectorAll('.section-progress__tick').forEach(tick => {
        const tickIdx = parseInt(tick.dataset.slide, 10);
        tick.classList.toggle('section-progress__tick--past', tickIdx < slideIndex);
        tick.classList.toggle('section-progress__tick--current', tickIdx === slideIndex);
      });
    });

    // Position the marker
    const marker = document.getElementById('section-progress-marker');
    if (marker) {
      const pct = ((slideIndex + 0.5) / total) * 100;
      marker.style.left = pct + '%';
    }
  }

  // --- Initialisation ---
  async function init(config) {
    // config = { slides: [...], courseId: '...', mode: 'presenter'|'participant'|'self',
    //            containerId: '...', language: 'en' }
    //
    // Slide resolution priority:
    //   1. config.customCourseId → fetch from server, resolve via SlideRegistry.resolveCustomCourse()
    //   2. config.courseId → resolve via SlideRegistry.getCourse()
    //   3. config.slides → use directly (legacy path)
    //   4. window.AI_PRIMER_SLIDES → final fallback
    //

    // Load i18n before rendering anything
    await loadI18n(config.language || 'en');

    if (config.customCourseId && typeof SlideRegistry !== 'undefined') {
      // Custom course: fetch from server API and resolve against registry
      try {
        const serverUrl = (typeof CONFIG !== 'undefined' && CONFIG.SERVER_URL) || '';
        const ccRes = await fetch(`${serverUrl}/api/courses/${config.customCourseId}`);
        if (ccRes.ok) {
          const courseData = await ccRes.json();
          const resolved = SlideRegistry.resolveCustomCourse(courseData);
          state.slides = resolved.slides;
          state.customCourseId = config.customCourseId;
          state.courseTranslations = courseData.translations || {};
          state.courseMeta = { title: resolved.title, sections: resolved.sections, metadata: resolved.metadata };
          console.log(`[Engine] Loaded custom course '${resolved.title}' with ${resolved.slides.length} slides`);
        } else {
          console.warn(`[Engine] Custom course '${config.customCourseId}' fetch failed (${ccRes.status}), falling back`);
          state.slides = config.slides || window.AI_PRIMER_SLIDES || [];
        }
      } catch (err) {
        console.error('[Engine] Error loading custom course:', err);
        state.slides = config.slides || window.AI_PRIMER_SLIDES || [];
      }
    } else if (config.courseId && typeof SlideRegistry !== 'undefined') {
      const course = SlideRegistry.getCourse(config.courseId);
      if (course) {
        state.slides = course.slides;
        state.courseId = config.courseId;
        state.courseMeta = { title: course.title, sections: course.sections, metadata: course.metadata };
        console.log(`[Engine] Loaded course '${config.courseId}' with ${course.slides.length} slides`);
      } else {
        console.warn(`[Engine] Course '${config.courseId}' not found, falling back to slides array`);
        state.slides = config.slides || window.AI_PRIMER_SLIDES || [];
      }
    } else if (config.slides) {
      // Legacy path: enrich with registry IDs if available
      if (typeof SlideRegistry !== 'undefined') {
        state.slides = SlideRegistry.enrichLegacySlides(config.slides);
        console.log(`[Engine] Enriched ${state.slides.length} legacy slides with registry IDs`);
      } else {
        state.slides = config.slides;
      }
    } else {
      state.slides = window.AI_PRIMER_SLIDES || [];
    }

    // Keep un-localised originals for re-localisation on language change
    state.slidesOriginal = state.slides.map(function (s) { return Object.assign({}, s); });
    // Localise all slides using i18n data
    state.slides = state.slidesOriginal.map(function (s) { return localiseSlide(Object.assign({}, s)); });

    state.mode = config.mode || 'self';
    state.sessionCode = config.sessionCode || null;
    state.participantName = config.participantName || null;
    state.participantId = config.participantId || generateId();
    state.onSocketReady = config.onSocketReady || null;

    const container = document.getElementById(config.containerId || 'app');

    if (state.mode === 'presenter') {
      renderPresenterView(container);
    } else {
      renderStandardView(container);
    }

    // Keyboard
    document.addEventListener('keydown', handleKeydown);

    // Touch
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Socket
    if (state.sessionCode && state.mode !== 'self') {
      connectSocket(state.sessionCode, state.mode);
    }

    // Show first slide
    goToSlide(0);
  }

  function renderStandardView(container) {
    // Slide viewport
    const viewport = el('div', 'slide-viewport');
    state.slides.forEach((slide, i) => {
      viewport.appendChild(renderSlide(slide, i));
    });
    container.appendChild(viewport);

    // Logo watermark
    const logo = el('img', 'logo-watermark');
    logo.src = 'assets/AIA_Logo_White.svg';
    logo.alt = 'AI Accelerator';
    container.appendChild(logo);

    // Progress bar
    const pb = el('div', 'progress-bar');
    pb.innerHTML = '<div class="progress-bar__fill" style="width:0%"></div>';
    container.appendChild(pb);

    // Slide counter (hidden for participant mode — replaced by toolbar)
    if (state.mode !== 'participant') {
      const counter = el('div', 'slide-counter', `1 / ${state.slides.length}`);
      container.appendChild(counter);
    }

    // Participant toolbar
    if (state.mode === 'participant') {
      loadBookmarks();
      container.appendChild(renderParticipantToolbar());

      // Free-browse indicator (floats above content when browsing)
      const indicator = document.createElement('div');
      indicator.className = 'pt-browse-indicator';
      indicator.id = 'pt-browse-indicator';
      indicator.style.display = 'none';
      indicator.innerHTML = '<span>Browsing — tap LIVE to return</span>';
      container.appendChild(indicator);
    }
  }

  function renderPresenterView(container) {
    container.innerHTML = `
      <div class="presenter-layout">
        <div class="presenter-topbar">
          <div class="presenter-topbar__left">
            <button class="presenter-topbar__btn" onclick="AIPrimer.pauseAndDashboard()" title="Pause session and return to dashboard">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              Dashboard
            </button>
            <div class="presenter-topbar__sep"></div>
            <button class="presenter-topbar__btn presenter-topbar__btn--new" onclick="AIPrimer.pauseAndNewSession()" title="Pause and start a new session">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Session
            </button>
          </div>
          <div class="presenter-topbar__right">
            <span class="presenter-topbar__code">${state.sessionCode || ''}</span>
          </div>
        </div>
        <div class="presenter-main">
          <div class="slide-viewport"></div>
        </div>
        <div class="presenter-sidebar">
          <div class="presenter-next">
            <div class="presenter-next__label">${t('engine.presenter.nextSlide')}</div>
            <div class="presenter-next__preview"></div>
          </div>
          <div class="presenter-notes">
            <div class="presenter-notes__label">${t('engine.presenter.speakerNotes')}</div>
            <div class="presenter-notes__content"></div>
          </div>
          <div class="response-stream">
            <div class="response-stream__label">${t('engine.presenter.liveResponses')}</div>
          </div>
        </div>
        <div class="section-progress" id="section-progress"></div>
        <div class="presenter-controls">
          <div class="presenter-controls__nav">
            <button class="presenter-controls__btn" onclick="AIPrimer.prev()">&#9664; ${t('engine.presenter.prev')}</button>
            <span class="presenter-controls__slide-info">1 / ${state.slides.length}</span>
            <button class="presenter-controls__btn" onclick="AIPrimer.next()">${t('engine.presenter.next')} &#9654;</button>
          </div>
          <div class="presenter-controls__stats">
            <button class="presenter-controls__session-btn" onclick="AIPrimer.toggleSectionNav()" title="Section navigator (S)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
              ${t('engine.presenter.sections')}
            </button>
            <button class="presenter-controls__session-btn" onclick="AIPrimer.toggleAdminConsole()" title="${t('engine.presenter.openConsole')}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              ${t('engine.presenter.console')}
            </button>
            <button class="presenter-controls__session-btn presenter-controls__qa-btn" id="presenter-qa-btn" onclick="AIPrimer.openQAPanel()" title="Questions from participants">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Q&amp;A
              <span class="presenter-qa-badge" id="presenter-qa-badge" style="display:none">0</span>
            </button>
            <div class="presenter-controls__stat">
              <span class="presenter-controls__stat-dot"></span>
              <span><span class="presenter-controls__participant-count">0</span> ${t('engine.presenter.participants')}</span>
            </div>
            ${renderLanguageSwitcher()}
            <div class="presenter-controls__stat presenter-controls__session-code">
              ${state.sessionCode || ''}
            </div>
            <button class="presenter-controls__session-btn presenter-controls__end-btn" onclick="AIPrimer.endSession()" title="${t('engine.endSession.button')}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              ${t('engine.endSession.button')}
            </button>
          </div>
        </div>
      </div>
    `;

    // Render slides into viewport
    const viewport = container.querySelector('.slide-viewport');
    state.slides.forEach((slide, i) => {
      viewport.appendChild(renderSlide(slide, i));
    });

    // Build section progress strip
    buildSectionProgress();
  }

  // ============================================
  // PARTICIPANT FEATURES
  // ============================================

  // --- Free-Browse Navigation ---
  function participantNext() {
    // Can go forward up to (but not past) presenter's current slide
    const maxSlide = state.presenterSlide;
    if (state.currentSlide < maxSlide) {
      state.freeBrowsing = true;
      goToSlide(state.currentSlide + 1);
      // If we've caught up to presenter, exit free-browse
      if (state.currentSlide >= state.presenterSlide) {
        state.freeBrowsing = false;
      }
      updateParticipantToolbar();
    }
  }

  function participantPrev() {
    if (state.currentSlide > 0) {
      state.freeBrowsing = true;
      goToSlide(state.currentSlide - 1);
      updateParticipantToolbar();
    }
  }

  function participantSnapToLive() {
    state.freeBrowsing = false;
    goToSlide(state.presenterSlide);
    updateParticipantToolbar();
  }

  // --- Participant Toolbar (bottom bar) ---
  function renderParticipantToolbar() {
    const toolbar = el('div', 'participant-toolbar');
    toolbar.id = 'participant-toolbar';
    toolbar.innerHTML = `
      <div class="pt-left">
        <button class="pt-btn pt-btn--menu" onclick="AIPrimer.toggleParticipantMenu()" title="Menu (M)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
      <div class="pt-center">
        <button class="pt-btn pt-btn--nav" onclick="AIPrimer.participantPrev()" title="Previous slide">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="pt-slide-info" id="pt-slide-info">${state.currentSlide + 1} / ${state.slides.length}</span>
        <button class="pt-btn pt-btn--nav" onclick="AIPrimer.participantNext()" title="Next slide">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="pt-right">
        <button class="pt-btn pt-btn--bookmark ${state.bookmarks.includes(state.currentSlide) ? 'active' : ''}" id="pt-bookmark-btn" onclick="AIPrimer.toggleBookmark(${state.currentSlide})" title="Bookmark (B)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${state.bookmarks.includes(state.currentSlide) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button class="pt-btn pt-btn--live ${state.freeBrowsing ? 'pt-btn--pulse' : ''}" id="pt-live-btn" onclick="AIPrimer.participantSnapToLive()" title="Snap to presenter" style="display:${state.freeBrowsing ? 'flex' : 'none'}">
          LIVE
        </button>
      </div>
    `;
    return toolbar;
  }

  function updateParticipantToolbar() {
    const slideInfo = document.getElementById('pt-slide-info');
    if (slideInfo) slideInfo.textContent = `${state.currentSlide + 1} / ${state.slides.length}`;

    const liveBtn = document.getElementById('pt-live-btn');
    if (liveBtn) {
      liveBtn.style.display = state.freeBrowsing ? 'flex' : 'none';
      liveBtn.classList.toggle('pt-btn--pulse', state.freeBrowsing);
    }

    const bookmarkBtn = document.getElementById('pt-bookmark-btn');
    if (bookmarkBtn) {
      const isBookmarked = state.bookmarks.includes(state.currentSlide);
      bookmarkBtn.className = `pt-btn pt-btn--bookmark ${isBookmarked ? 'active' : ''}`;
      bookmarkBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
      bookmarkBtn.onclick = function () { AIPrimer.toggleBookmark(state.currentSlide); };
    }

    // Update free-browse indicator
    const indicator = document.getElementById('pt-browse-indicator');
    if (indicator) {
      indicator.style.display = state.freeBrowsing ? 'flex' : 'none';
    }
  }

  // --- Participant Menu (slide-out drawer) ---
  let participantMenuOpen = false;
  let participantMenuTab = 'qa';

  function toggleParticipantMenu() {
    let panel = document.getElementById('participant-menu');
    if (!panel) {
      panel = renderParticipantMenu();
      document.body.appendChild(panel);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => panel.classList.add('open'));
      });
      participantMenuOpen = true;
    } else {
      if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        participantMenuOpen = false;
        setTimeout(() => { if (!panel.classList.contains('open')) panel.remove(); }, 300);
      } else {
        panel.classList.add('open');
        participantMenuOpen = true;
      }
    }
  }

  function renderParticipantMenu() {
    const panel = document.createElement('div');
    panel.className = 'participant-menu';
    panel.id = 'participant-menu';

    const langs = getAvailableSessionLanguages();
    const langOptions = langs.map(function (code) {
      var selected = code === state.language ? ' selected' : '';
      var name = LANG_NAMES[code] || code;
      return '<option value="' + code + '"' + selected + '>' + name + '</option>';
    }).join('');

    panel.innerHTML = `
      <div class="pm-overlay" onclick="AIPrimer.toggleParticipantMenu()"></div>
      <div class="pm-drawer">
        <div class="pm-header">
          <div class="pm-header__title">Menu</div>
          <div class="pm-header__lang">
            <select class="pm-lang-select" onchange="AIPrimer.participantSwitchLanguage(this.value)" title="Language">
              ${langOptions}
            </select>
          </div>
          <button class="pm-header__close" onclick="AIPrimer.toggleParticipantMenu()">&times;</button>
        </div>
        <div class="pm-tabs">
          <button class="pm-tab ${participantMenuTab === 'qa' ? 'pm-tab--active' : ''}" data-tab="qa" onclick="AIPrimer.switchParticipantTab('qa')">Q&amp;A <span class="pm-tab__badge" id="pm-qa-badge" style="display:${state.questions.length > 0 ? 'inline' : 'none'}">${state.questions.length}</span></button>
          <button class="pm-tab ${participantMenuTab === 'bookmarks' ? 'pm-tab--active' : ''}" data-tab="bookmarks" onclick="AIPrimer.switchParticipantTab('bookmarks')">Bookmarks</button>
          <button class="pm-tab ${participantMenuTab === 'resources' ? 'pm-tab--active' : ''}" data-tab="resources" onclick="AIPrimer.switchParticipantTab('resources')">Resources</button>
        </div>
        <div class="pm-panel" id="pm-panel-qa">
          <div class="pm-qa">
            <div class="pm-qa__input">
              <textarea id="pm-qa-input" class="pm-qa__textarea" placeholder="Type your question..." rows="2" maxlength="500"></textarea>
              <button class="pm-qa__submit" onclick="AIPrimer.submitQuestion()">Ask</button>
            </div>
            <div class="pm-qa__list" id="pm-qa-list">
              ${renderParticipantQAList()}
            </div>
          </div>
        </div>
        <div class="pm-panel pm-panel--hidden" id="pm-panel-bookmarks">
          <div class="pm-bookmarks" id="pm-bookmarks-list">
            ${renderBookmarksList()}
          </div>
        </div>
        <div class="pm-panel pm-panel--hidden" id="pm-panel-resources">
          <div class="pm-resources" id="pm-resources-list">
            ${renderResourcesList()}
          </div>
        </div>
      </div>
    `;

    return panel;
  }

  function switchParticipantTab(tab) {
    participantMenuTab = tab;
    const menu = document.getElementById('participant-menu');
    if (!menu) return;
    menu.querySelectorAll('.pm-tab').forEach(t => {
      t.classList.toggle('pm-tab--active', t.dataset.tab === tab);
    });
    menu.querySelectorAll('.pm-panel').forEach(p => {
      p.classList.toggle('pm-panel--hidden', !p.id.endsWith(tab));
    });
  }

  // --- Q&A System (Participant) ---
  function submitQuestion() {
    const input = document.getElementById('pm-qa-input');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    if (text.length < 2) return;

    if (state.socket && state.connected) {
      state.socket.emit('question-submit', {
        text: text,
        participantId: state.participantId,
        participantName: state.participantName,
        slideIndex: state.currentSlide,
        timestamp: Date.now(),
      });
    }
    input.value = '';
  }

  function upvoteQuestion(questionId) {
    if (state.socket && state.connected) {
      state.socket.emit('question-upvote', {
        questionId: questionId,
        participantId: state.participantId,
      });
    }
  }

  function getSlideLabel(slideIndex) {
    const idx = slideIndex || 0;
    const slide = state.slides[idx];
    if (slide && slide.title) return `Slide ${idx + 1}: ${slide.title}`;
    return `Slide ${idx + 1}`;
  }

  function renderParticipantQAList() {
    if (state.questions.length === 0) {
      return '<div class="pm-empty">No questions yet. Be the first to ask!</div>';
    }
    return state.questions.slice().sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).map(q => {
      const hasUpvoted = q.upvotedBy && q.upvotedBy.includes(state.participantId);
      const answeredClass = q.answered ? ' pm-qa-item--answered' : '';
      const slideLabel = getSlideLabel(q.slideIndex);
      const answerHtml = q.answerText ? `<div class="pm-qa-item__answer"><span class="pm-qa-item__answer-label">Presenter:</span> ${escapeHtml(q.answerText)}</div>` : '';
      return `<div class="pm-qa-item${answeredClass}" data-qid="${q.id}">
        <button class="pm-qa-item__upvote ${hasUpvoted ? 'active' : ''}" onclick="AIPrimer.upvoteQuestion('${q.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${hasUpvoted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          <span>${q.upvotes || 0}</span>
        </button>
        <div class="pm-qa-item__content">
          <div class="pm-qa-item__text">${escapeHtml(q.text)}</div>
          <div class="pm-qa-item__meta">${q.participantName || 'Anonymous'}${q.answered ? ' · ✓ Answered' : ''}</div>
          <div class="pm-qa-item__slide-ref">${slideLabel}</div>
          ${answerHtml}
        </div>
      </div>`;
    }).join('');
  }

  function updateQAPanel() {
    const list = document.getElementById('pm-qa-list');
    if (list) list.innerHTML = renderParticipantQAList();
  }

  function updateQABadge() {
    const badge = document.getElementById('pm-qa-badge');
    if (badge) {
      badge.textContent = state.questions.length;
      badge.style.display = state.questions.length > 0 ? 'inline' : 'none';
    }
  }

  // --- Q&A System (Presenter) ---
  function renderPresenterQAList() {
    if (state.questions.length === 0) {
      return '<div class="ac-empty">No questions from participants yet.</div>';
    }
    return state.questions.slice().sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).map(q => {
      const answeredClass = q.answered ? ' ac-qa-item--answered' : '';
      const slideLabel = getSlideLabel(q.slideIndex);
      const answerText = q.answerText ? escapeHtml(q.answerText) : '';
      const hasAnswer = !!q.answerText;
      return `<div class="ac-qa-item${answeredClass}" data-qid="${q.id}">
        <div class="ac-qa-item__votes">${q.upvotes || 0}</div>
        <div class="ac-qa-item__content">
          <div class="ac-qa-item__text">${escapeHtml(q.text)}</div>
          <div class="ac-qa-item__meta">${q.participantName || 'Anonymous'}</div>
          <div class="ac-qa-item__slide-ref">${slideLabel}</div>
          ${hasAnswer ? `<div class="ac-qa-item__answer"><span class="ac-qa-item__answer-label">Answer:</span> ${answerText}</div>` : ''}
          <div class="ac-qa-item__reply-row" id="qa-reply-${q.id}">
            <input type="text" class="ac-qa-item__reply-input" id="qa-input-${q.id}" placeholder="Type your answer…" value="${answerText}" onkeydown="if(event.key==='Enter'){AIPrimer.submitAnswer('${q.id}')}" />
            <button class="ac-qa-item__reply-btn" onclick="AIPrimer.submitAnswer('${q.id}')">${hasAnswer ? 'Update' : 'Answer'}</button>
          </div>
        </div>
        <div class="ac-qa-item__actions">
          <button class="ac-qa-item__btn ${q.answered ? 'active' : ''}" onclick="AIPrimer.markQuestionAnswered('${q.id}')" title="${q.answered ? 'Mark unanswered' : 'Mark answered'}">
            ${q.answered ? '✓' : '○'}
          </button>
          <button class="ac-qa-item__btn ac-qa-item__btn--dismiss" onclick="AIPrimer.dismissQuestion('${q.id}')" title="Dismiss">✕</button>
        </div>
      </div>`;
    }).join('');
  }

  function updatePresenterQAPanel() {
    const list = document.getElementById('ac-qa-list');
    if (list) list.innerHTML = renderPresenterQAList();
    // Update admin console tab badge
    const badge = document.getElementById('ac-qa-badge');
    if (badge) {
      const unanswered = state.questions.filter(q => !q.answered && !q.dismissed).length;
      badge.textContent = unanswered;
      badge.style.display = unanswered > 0 ? 'inline' : 'none';
    }
  }

  function updatePresenterQABadge() {
    // Update the Q&A badge in the presenter controls bar
    const badge = document.getElementById('presenter-qa-badge');
    const btn = document.getElementById('presenter-qa-btn');
    if (!badge) return;
    const unanswered = state.questions.filter(q => !q.answered && !q.dismissed).length;
    badge.textContent = unanswered;
    badge.style.display = unanswered > 0 ? 'inline-flex' : 'none';
    // Pulse the button to draw attention when new questions arrive
    if (btn && unanswered > 0) {
      btn.classList.add('has-questions');
    } else if (btn) {
      btn.classList.remove('has-questions');
    }
  }

  function submitAnswer(questionId) {
    const input = document.getElementById('qa-input-' + questionId);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    if (state.socket && state.connected) {
      state.socket.emit('question-answer-text', { questionId, answerText: text });
    }
  }

  function markQuestionAnswered(questionId) {
    if (state.socket && state.connected) {
      state.socket.emit('question-answered', { questionId });
    }
  }

  function dismissQuestion(questionId) {
    if (state.socket && state.connected) {
      state.socket.emit('question-dismiss', { questionId });
    }
  }

  // --- Bookmarks (localStorage) ---
  function loadBookmarks() {
    try {
      const key = 'aip_bookmarks_' + (state.sessionCode || 'self');
      const stored = localStorage.getItem(key);
      state.bookmarks = stored ? JSON.parse(stored) : [];
    } catch (e) { state.bookmarks = []; }
  }

  function saveBookmarks() {
    try {
      const key = 'aip_bookmarks_' + (state.sessionCode || 'self');
      localStorage.setItem(key, JSON.stringify(state.bookmarks));
    } catch (e) {}
  }

  function toggleBookmark(slideIndex) {
    const idx = state.bookmarks.indexOf(slideIndex);
    if (idx >= 0) {
      state.bookmarks.splice(idx, 1);
    } else {
      state.bookmarks.push(slideIndex);
    }
    saveBookmarks();
    updateParticipantToolbar();
    // Update bookmarks panel if open
    const list = document.getElementById('pm-bookmarks-list');
    if (list) list.innerHTML = renderBookmarksList();
  }

  function renderBookmarksList() {
    if (state.bookmarks.length === 0) {
      return '<div class="pm-empty">No bookmarks yet. Tap the bookmark icon on any slide to save it.</div>';
    }
    return state.bookmarks.sort((a, b) => a - b).map(idx => {
      const slide = state.slides[idx];
      if (!slide) return '';
      return `<div class="pm-bookmark-item" onclick="AIPrimer.goToSlide(${idx}); AIPrimer.toggleParticipantMenu();">
        <div class="pm-bookmark-item__num">${idx + 1}</div>
        <div class="pm-bookmark-item__info">
          <div class="pm-bookmark-item__title">${slide.title || slide.type}</div>
          <div class="pm-bookmark-item__section">${slide.sectionLabel || ''}</div>
        </div>
        <button class="pm-bookmark-item__remove" onclick="event.stopPropagation(); AIPrimer.toggleBookmark(${idx});">✕</button>
      </div>`;
    }).join('');
  }

  // --- Resources Panel ---
  function renderResourcesList() {
    if (state.resources.length === 0) {
      return '<div class="pm-empty">No resources available for this session.</div>';
    }
    return state.resources.map(r => {
      const icon = r.type === 'pdf' ? '📄' : r.type === 'link' ? '🔗' : r.type === 'video' ? '🎬' : '📎';
      return `<a class="pm-resource-item" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">
        <span class="pm-resource-item__icon">${icon}</span>
        <div class="pm-resource-item__info">
          <div class="pm-resource-item__title">${escapeHtml(r.title)}</div>
          ${r.description ? '<div class="pm-resource-item__desc">' + escapeHtml(r.description) + '</div>' : ''}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>`;
    }).join('');
  }

  // --- Session Ended (participant view) ---
  function showParticipantSessionEnded() {
    const overlay = document.createElement('div');
    overlay.className = 'participant-ended-overlay';
    overlay.innerHTML = `
      <div class="participant-ended">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--bright-turquoise)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <h2>Session Complete</h2>
        <p>Thank you for participating!</p>
        <button class="participant-ended__btn" onclick="window.location.href='/'">Return Home</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // --- HTML Escape Helper ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function generateId() {
    return 'p_' + Math.random().toString(36).substr(2, 9);
  }

  // --- Public API ---
  AIPrimer.init = init;
  AIPrimer.next = next;
  AIPrimer.prev = prev;
  AIPrimer.goToSlide = goToSlide;
  AIPrimer.getState = () => ({ ...state });
  AIPrimer.getCourseId = () => state.courseId;
  AIPrimer.getCourseMeta = () => state.courseMeta;
  AIPrimer.t = t;
  AIPrimer.getLanguage = () => state.language;
  AIPrimer.toggleSessionPanel = toggleSessionPanel;
  AIPrimer.toggleAdminConsole = toggleAdminConsole;
  AIPrimer.openQAPanel = openQAPanel;
  AIPrimer.switchAdminTab = switchAdminTab;
  AIPrimer.toggleSectionNav = toggleSectionNav;
  AIPrimer.adminPause = function () {
    if (state.socket) state.socket.emit('session-pause');
    if (typeof pauseAndExit === 'function') pauseAndExit(state.sessionCode);
  };
  AIPrimer.adminEnd = function () {
    AIPrimer.endSession();
  };

  // --- Language Switcher ---
  AIPrimer.switchLanguage = async function (language) {
    await setLanguage(language);
    // Broadcast to all participants via socket (presenter only)
    if (state.mode === 'presenter' && state.socket) {
      state.socket.emit('language-change', { language: language });
    }
  };
  AIPrimer.getAvailableLanguages = getAvailableSessionLanguages;

  // --- Participant Language Switcher (personal, no broadcast) ---
  AIPrimer.participantSwitchLanguage = async function (language) {
    await setLanguage(language);
    // Personal — no broadcast. Participant's choice only.
  };

  // --- Participant Features ---
  AIPrimer.participantNext = participantNext;
  AIPrimer.participantPrev = participantPrev;
  AIPrimer.participantSnapToLive = participantSnapToLive;
  AIPrimer.toggleParticipantMenu = toggleParticipantMenu;
  AIPrimer.switchParticipantTab = switchParticipantTab;
  AIPrimer.submitQuestion = submitQuestion;
  AIPrimer.upvoteQuestion = upvoteQuestion;
  AIPrimer.toggleBookmark = toggleBookmark;
  AIPrimer.submitAnswer = submitAnswer;
  AIPrimer.markQuestionAnswered = markQuestionAnswered;
  AIPrimer.dismissQuestion = dismissQuestion;

  // --- Presenter Nav: Pause & Dashboard ---
  AIPrimer.pauseAndDashboard = function () {
    if (state.socket) state.socket.emit('session-pause');
    if (typeof showDashboard === 'function') showDashboard();
  };

  // --- Presenter Nav: Pause & New Session ---
  AIPrimer.pauseAndNewSession = function () {
    if (state.socket) state.socket.emit('session-pause');
    if (typeof showCoursePickerOrCreate === 'function') showCoursePickerOrCreate();
  };

  // --- Quick-Exit Menu (Escape key) ---
  var quickExitOpen = false;

  AIPrimer.showQuickExit = function () {
    if (quickExitOpen) return;
    quickExitOpen = true;
    const overlay = document.createElement('div');
    overlay.className = 'quick-exit-overlay';
    overlay.id = 'quick-exit-overlay';
    overlay.innerHTML = `
      <div class="quick-exit-menu">
        <div class="quick-exit-menu__title">Session ${state.sessionCode || ''}</div>
        <div class="quick-exit-menu__subtitle">Slide ${state.currentSlide + 1} of ${state.slides.length} · ${state.participants.length} participant${state.participants.length !== 1 ? 's' : ''}</div>
        <div class="quick-exit-menu__actions">
          <button class="quick-exit-menu__btn quick-exit-menu__btn--dashboard" onclick="AIPrimer.dismissQuickExit(); AIPrimer.pauseAndDashboard();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            Pause &amp; Go to Dashboard
          </button>
          <button class="quick-exit-menu__btn quick-exit-menu__btn--new" onclick="AIPrimer.dismissQuickExit(); AIPrimer.pauseAndNewSession();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Start New Session
          </button>
          <button class="quick-exit-menu__btn quick-exit-menu__btn--end" onclick="AIPrimer.dismissQuickExit(); AIPrimer.endSession();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            End Session
          </button>
          <button class="quick-exit-menu__btn quick-exit-menu__btn--cancel" onclick="AIPrimer.dismissQuickExit();">
            Continue Presenting
          </button>
        </div>
        <div class="quick-exit-menu__hint">Press Esc to close</div>
      </div>
    `;
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) AIPrimer.dismissQuickExit();
    });
    document.body.appendChild(overlay);
  };

  AIPrimer.dismissQuickExit = function () {
    quickExitOpen = false;
    const overlay = document.getElementById('quick-exit-overlay');
    if (overlay) overlay.remove();
  };

  // --- End Session with Post-Session Summary ---
  AIPrimer.endSession = function () {
    if (!confirm(t('engine.confirm.endSession'))) return;
    if (state.socket) {
      state.socket.emit('session-end');
      state.socket.disconnect();
    }
    // Fetch and show post-session summary
    showPostSessionSummary(state.sessionCode);
  };

  // --- Post-Session Summary Overlay ---
  function showPostSessionSummary(sessionCode) {
    const serverUrl = (typeof CONFIG !== 'undefined' && CONFIG.SERVER_URL) || '';

    fetch(`${serverUrl}/api/sessions/${sessionCode}/export`)
      .then(res => res.json())
      .then(data => {
        // Remove any existing overlay
        const existing = document.getElementById('post-session-summary');
        if (existing) existing.remove();

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'post-session-summary';
        overlay.className = 'post-session-summary';

        // Calculate session duration
        const createdAt = new Date(data.session.created_at);
        const endedAt = new Date(data.session.ended_at);
        const durationMs = endedAt - createdAt;
        const durationMins = Math.floor(durationMs / 60000);
        const durationHours = Math.floor(durationMins / 60);
        const durationMinsRem = durationMins % 60;
        const durationStr = durationHours > 0
          ? `${durationHours}h ${durationMinsRem}m`
          : `${durationMins}m`;

        // Build HTML
        let html = `
          <div class="post-session-summary__container">
            <div class="post-session-summary__header">
              <svg class="post-session-summary__logo" viewBox="0 0 32 32" width="48" height="48">
                <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" stroke-width="2"/>
                <path d="M 13 20 L 15 22 L 21 13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <h1 class="post-session-summary__title">${t('engine.session.complete')}</h1>
            </div>

            <div class="post-session-summary__info">
              <div class="post-session-summary__info-row">
                <span class="post-session-summary__label">Code:</span>
                <span class="post-session-summary__value">${data.session.code}</span>
              </div>
              <div class="post-session-summary__info-row">
                <span class="post-session-summary__label">${t('engine.session.duration')}:</span>
                <span class="post-session-summary__value">${durationStr}</span>
              </div>
              <div class="post-session-summary__info-row">
                <span class="post-session-summary__label">${t('engine.session.totalParticipants')}:</span>
                <span class="post-session-summary__value">${data.session.total_participants || 0}</span>
              </div>
            </div>

            <div class="post-session-summary__stats">
              <div class="post-session-summary__stat-card">
                <div class="post-session-summary__stat-number">${data.totalInteractions || 0}</div>
                <div class="post-session-summary__stat-label">${t('engine.session.totalInteractions')}</div>
              </div>
              <div class="post-session-summary__stat-card">
                <div class="post-session-summary__stat-number">${data.totalResponses || 0}</div>
                <div class="post-session-summary__stat-label">${t('engine.session.totalResponses')}</div>
              </div>
            </div>
        `;

        // Poll & Quiz Results Section
        if (data.responsesBySlide) {
          const pollQuizSlides = [];
          Object.entries(data.responsesBySlide).forEach(([slideIdx, responses]) => {
            const slide = state.slides[parseInt(slideIdx)];
            if (!slide) return;
            if (slide.poll || slide.quiz) {
              pollQuizSlides.push({ slideIdx: parseInt(slideIdx), slide, responses });
            }
          });

          if (pollQuizSlides.length > 0) {
            html += `<div class="post-session-summary__section">
              <h2 class="post-session-summary__section-title">${t('engine.session.pollResults')}</h2>
              <div class="post-session-summary__results-list">`;

            pollQuizSlides.forEach(({ slideIdx, slide, responses }) => {
              const isPoll = !!slide.poll;
              const question = isPoll ? slide.poll.question : slide.quiz.question;
              const options = isPoll ? slide.poll.options : slide.quiz.options;

              // Count responses per option
              const counts = {};
              options.forEach((_, i) => { counts[i] = 0; });
              responses.forEach(r => {
                if (typeof r === 'number' && r in counts) counts[r]++;
                else if (typeof r === 'string') {
                  const idx = options.indexOf(r);
                  if (idx >= 0) counts[idx]++;
                }
              });

              const total = Object.values(counts).reduce((a, b) => a + b, 0);
              const maxCount = Math.max(...Object.values(counts), 1);

              html += `<div class="post-session-summary__result-item">
                <div class="post-session-summary__result-question">${question}</div>
                <div class="post-session-summary__bars">`;

              options.forEach((opt, i) => {
                const count = counts[i];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const barWidth = total > 0 ? Math.round((count / maxCount) * 100) : 0;
                html += `<div class="post-session-summary__bar-row">
                  <div class="post-session-summary__bar-label">${opt}</div>
                  <div class="post-session-summary__bar-container">
                    <div class="post-session-summary__bar-fill" style="width:${barWidth}%"></div>
                  </div>
                  <div class="post-session-summary__bar-stats">${count} (${pct}%)</div>
                </div>`;
              });

              html += `</div>
              </div>`;
            });

            html += `</div>
            </div>`;
          }
        }

        // Text Responses (Word Clouds)
        if (data.responsesBySlide) {
          const textSlides = [];
          Object.entries(data.responsesBySlide).forEach(([slideIdx, responses]) => {
            const slide = state.slides[parseInt(slideIdx)];
            if (!slide) return;
            if (slide.textInput && responses && responses.length > 0) {
              textSlides.push({ slideIdx: parseInt(slideIdx), slide, responses });
            }
          });

          if (textSlides.length > 0) {
            html += `<div class="post-session-summary__section">
              <h2 class="post-session-summary__section-title">${t('engine.session.textResponses')}</h2>
              <div class="post-session-summary__text-responses">`;

            textSlides.forEach(({ slideIdx, slide }) => {
              html += `<div class="post-session-summary__text-response-item">
                <div class="post-session-summary__text-prompt">${slide.textInput.prompt || 'Text Response'}</div>
                <div id="wordcloud-${slideIdx}" class="post-session-summary__wordcloud"></div>
              </div>`;
            });

            html += `</div>
            </div>`;
          }
        }

        // Action buttons
        html += `
          <div class="post-session-summary__actions">
            <button class="post-session-summary__btn post-session-summary__btn--download" onclick="AIPrimer.downloadSessionReport('${sessionCode}')">
              ${t('engine.session.downloadReport')}
            </button>
            <button class="post-session-summary__btn post-session-summary__btn--primary" onclick="AIPrimer.returnToDashboard()">
              ${t('engine.session.backToDashboard')}
            </button>
          </div>
          </div>
        `;

        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        // Render word clouds for text responses
        if (data.responsesBySlide) {
          Object.entries(data.responsesBySlide).forEach(([slideIdx, responses]) => {
            const slide = state.slides[parseInt(slideIdx)];
            if (!slide || !slide.textInput) return;

            // Build word cloud from responses (if they're words)
            if (responses && responses.length > 0) {
              const words = {};
              responses.forEach(r => {
                if (typeof r === 'string') {
                  const trimmed = r.trim();
                  if (trimmed) {
                    words[trimmed] = (words[trimmed] || 0) + 1;
                  }
                }
              });

              const wordArray = Object.entries(words)
                .map(([word, count]) => ({ word, count }))
                .sort((a, b) => b.count - a.count);

              const cloudEl = document.getElementById(`wordcloud-${slideIdx}`);
              if (cloudEl) {
                renderWordCloudInto(cloudEl, wordArray);
              }
            }
          });
        }
      })
      .catch(err => {
        console.error('Failed to load post-session summary:', err);
        alert('Could not load session summary.');
        if (typeof showDashboard === 'function') showDashboard();
      });
  }

  // --- Download Session Report ---
  AIPrimer.downloadSessionReport = function (sessionCode) {
    const serverUrl = (typeof CONFIG !== 'undefined' && CONFIG.SERVER_URL) || '';

    fetch(`${serverUrl}/api/sessions/${sessionCode}/export`)
      .then(res => res.json())
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${sessionCode}-export.json`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Download failed:', err);
        alert(t('presenter.error.exportFailed'));
      });
  };

  // --- Return to Dashboard ---
  AIPrimer.returnToDashboard = function () {
    if (typeof showDashboard === 'function') showDashboard();
  };

})();
