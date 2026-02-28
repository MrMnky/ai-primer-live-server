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
    i18nFallback: {},  // English fallback (always loaded)
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

  // Enrich a slide object with translated content (fallback to inline strings)
  function localiseSlide(slide) {
    const contentKey = slide.contentKey || slide.id;
    if (!contentKey) return slide;

    const content = (state.i18n && state.i18n.slides && state.i18n.slides[contentKey]) ||
                    (state.i18nFallback && state.i18nFallback.slides && state.i18nFallback.slides[contentKey]);
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
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    let html = `<div class="quiz" data-slide="${slideIndex}">`;
    html += `<div class="quiz__question">${quiz.question}</div>`;
    html += `<div class="quiz__options">`;
    quiz.options.forEach((opt, i) => {
      html += `<div class="quiz__option" data-option="${i}" onclick="AIPrimer.selectQuizOption(${slideIndex}, ${i})">`;
      html += `<span class="quiz__option-marker">${letters[i]}</span>`;
      html += `<span>${opt}</span>`;
      html += `</div>`;
    });
    html += `</div></div>`;
    return html;
  }

  function renderPoll(poll, slideIndex) {
    let html = `<div class="poll" data-slide="${slideIndex}">`;
    html += `<div class="quiz__question">${poll.question}</div>`;
    poll.options.forEach((opt, i) => {
      html += `<div class="poll__bar-container">`;
      html += `<div class="poll__bar-label"><span>${opt}</span><span class="poll__bar-pct" data-option="${i}">0%</span></div>`;
      html += `<div class="poll__bar-track" data-option="${i}" onclick="AIPrimer.selectPollOption(${slideIndex}, ${i})">`;
      html += `<div class="poll__bar-fill" style="width: 0%"></div>`;
      html += `</div></div>`;
    });
    html += `<div class="poll__total">0 ${t('engine.poll.responses')}</div>`;
    html += `</div>`;
    return html;
  }

  function renderTextInput(textInput, slideIndex) {
    let html = `<div class="text-input" data-slide="${slideIndex}">`;
    html += `<div class="text-input__prompt">${textInput.prompt}</div>`;
    html += `<textarea class="text-input__field" placeholder="${textInput.placeholder || t('engine.textInput.placeholder')}" data-slide="${slideIndex}"></textarea>`;
    html += `<button class="btn btn--primary text-input__submit" onclick="AIPrimer.submitTextInput(${slideIndex})">${t('engine.textInput.submit')}</button>`;
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
  }

  function next() { goToSlide(state.currentSlide + 1); }
  function prev() { goToSlide(state.currentSlide - 1); }

  // --- Keyboard Controls ---
  function handleKeydown(e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

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
        if (sectionNavOpen) { toggleSectionNav(); e.preventDefault(); }
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

  function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }

  function handleTouchEnd(e) {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;

    if (state.mode === 'participant') return; // participants don't navigate

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
    if (state.mode === 'self' || state.mode === 'presenter') {
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

  // --- Text Results Update ---
  function updateTextResults(slideIndex, results) {
    // results = { words: [{word, count}, ...], texts: [{name, text}, ...], total: N }
    document.querySelectorAll(`.results[data-source="${slideIndex}"][data-response-type="text"]`).forEach(container => {
      // Word cloud
      const cloud = container.querySelector('.results__wordcloud');
      if (cloud && results.words) {
        cloud.innerHTML = results.words.slice(0, 30).map((w, i) => {
          const tier = i < 3 ? 1 : i < 7 ? 2 : i < 12 ? 3 : i < 20 ? 4 : 5;
          return `<span class="results__word results__word--${tier}" style="animation-delay:${i * 0.05}s">${w.word}</span>`;
        }).join('');
      }

      // Response wall (latest 10)
      const wall = container.querySelector('.results__wall');
      if (wall && results.texts) {
        wall.innerHTML = results.texts.slice(-10).reverse().map(t =>
          `<div class="results__wall-item"><span class="results__wall-name">${t.name}</span> ${t.text.substring(0, 100)}${t.text.length > 100 ? '…' : ''}</div>`
        ).join('');
      }

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
    });

    state.socket.on('disconnect', () => {
      state.connected = false;
    });

    // Participant: follow presenter's slide
    if (mode === 'participant') {
      state.socket.on('slide-change', (data) => {
        goToSlide(data.slideIndex);
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
    }

    // Everyone: receive aggregated results updates
    state.socket.on('poll-update', (data) => {
      updatePollResults(data.slideIndex, data.results);
    });

    state.socket.on('quiz-update', (data) => {
      updateQuizResults(data.slideIndex, data.results);
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
        <button class="ac-tab" data-tab="activity" onclick="AIPrimer.switchAdminTab('activity')">${t('engine.adminConsole.activity')}</button>
        <button class="ac-tab" data-tab="session" onclick="AIPrimer.switchAdminTab('session')">${t('engine.adminConsole.session')}</button>
      </div>

      <div class="ac-panel" id="ac-panel-participants">
        <div id="ac-participant-list" class="ac-participant-list">
          ${renderParticipantList()}
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
    //   1. config.courseId → resolve via SlideRegistry.getCourse()
    //   2. config.slides → use directly (legacy path)
    //   3. window.AI_PRIMER_SLIDES → final fallback
    //

    // Load i18n before rendering anything
    await loadI18n(config.language || 'en');

    if (config.courseId && typeof SlideRegistry !== 'undefined') {
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

    // Localise all slides using i18n data
    state.slides = state.slides.map(localiseSlide);

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

    // Slide counter
    const counter = el('div', 'slide-counter', `1 / ${state.slides.length}`);
    container.appendChild(counter);
  }

  function renderPresenterView(container) {
    container.innerHTML = `
      <div class="presenter-layout">
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
            <div class="presenter-controls__stat">
              <span class="presenter-controls__stat-dot"></span>
              <span><span class="presenter-controls__participant-count">0</span> ${t('engine.presenter.participants')}</span>
            </div>
            <div class="presenter-controls__stat presenter-controls__session-code">
              ${state.sessionCode || ''}
            </div>
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
  AIPrimer.switchAdminTab = switchAdminTab;
  AIPrimer.toggleSectionNav = toggleSectionNav;
  AIPrimer.adminPause = function () {
    if (state.socket) state.socket.emit('session-pause');
    if (typeof pauseAndExit === 'function') pauseAndExit(state.sessionCode);
  };
  AIPrimer.adminEnd = function () {
    if (confirm(t('engine.confirm.endSession'))) {
      if (state.socket) {
        state.socket.emit('session-end');
        state.socket.disconnect();
      }
      if (typeof showDashboard === 'function') showDashboard();
    }
  };

})();
