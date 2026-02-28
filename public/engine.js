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
    const typeClass = slide.type === 'cover' ? 'slide--cover' :
                      slide.type === 'split' ? 'slide--split' :
                      slide.type === 'section' ? 'slide--cover' :
                      slide.type === 'full-media' ? 'slide--full-media' :
                      slide.type === 'graphic' ? 'slide--graphic' :
                      slide.type === 'results' ? '' : '';

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

    // Background media: render before content (absolute positioned via CSS)
    if (slide.media && slide.mediaLayout === 'background') {
      html += `<div class="slide__media slide__media--background">`;
      if (slide.media.type === 'image') {
        html += `<img src="${slide.media.src}" alt="${slide.media.alt || ''}" loading="lazy">`;
      } else if (slide.media.type === 'video') {
        html += `<video src="${slide.media.src}" autoplay muted loop playsinline></video>`;
      }
      html += '</div>';
    }

    // For split layout, wrap content in a div
    if (slide.type === 'split' || slide.type === 'full-media') {
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

    if (slide.type === 'split' || slide.type === 'full-media') {
      html += '</div>'; // close .slide__content
    }

    // Media (image, video, iframe) with layout variant classes
    // Skip if already rendered as background
    if (slide.media && slide.mediaLayout !== 'background') {
      const layoutClass = slide.mediaLayout ? ` slide__media--${slide.mediaLayout}` : '';
      html += `<div class="slide__media${layoutClass}">`;
      if (slide.media.type === 'image') {
        html += `<img src="${slide.media.src}" alt="${slide.media.alt || ''}" loading="lazy">`;
      } else if (slide.media.type === 'video') {
        const videoSrc = slide.media.src;
        // Support YouTube URLs as iframes
        if (videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be')) {
          const vid = videoSrc.includes('youtu.be') ? videoSrc.split('/').pop() :
                      new URL(videoSrc).searchParams.get('v') || videoSrc.split('/').pop();
          html += `<iframe src="https://www.youtube.com/embed/${vid}?rel=0" allowfullscreen frameborder="0"></iframe>`;
        } else {
          html += `<video src="${videoSrc}" controls playsinline></video>`;
        }
      } else if (slide.media.type === 'iframe') {
        html += `<iframe src="${slide.media.src}" allowfullscreen></iframe>`;
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
    html += `<div class="poll__total">0 responses</div>`;
    html += `</div>`;
    return html;
  }

  function renderTextInput(textInput, slideIndex) {
    let html = `<div class="text-input" data-slide="${slideIndex}">`;
    html += `<div class="text-input__prompt">${textInput.prompt}</div>`;
    html += `<textarea class="text-input__field" placeholder="${textInput.placeholder || 'Type your response...'}" data-slide="${slideIndex}"></textarea>`;
    html += `<button class="btn btn--primary text-input__submit" onclick="AIPrimer.submitTextInput(${slideIndex})">Submit</button>`;
    html += `</div>`;
    return html;
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
    notesEl.innerHTML = state.slides[index].notes || '<em style="opacity:0.4">No notes for this slide.</em>';
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
      previewEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;opacity:0.3;font-size:0.8rem;">End of presentation</div>';
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
        addActivityItem('🟢', data.participantName || 'Someone', 'joined the session');
      });

      state.socket.on('participant-left', (data) => {
        state.participants = data.participants || [];
        updateParticipantCount();
        addActivityItem('🔴', data.participantName || 'Someone', 'left the session');
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
      if (data.type === 'quiz') text = `selected option ${['A','B','C','D'][data.data.option]}`;
      else if (data.type === 'poll') text = `voted for option ${data.data.option + 1}`;
      else if (data.type === 'text') text = `"${data.data.text.substring(0, 80)}${data.data.text.length > 80 ? '...' : ''}"`;
      item.innerHTML = `<span class="response-item__name">${data.participantName || 'Anonymous'}</span> ${text}`;
      stream.appendChild(item);
      stream.scrollTop = stream.scrollHeight;
    }

    // Log to admin console activity feed
    const name = data.participantName || 'Anonymous';
    if (data.type === 'quiz') {
      addActivityItem('📝', name, `answered quiz (option ${['A','B','C','D'][data.data.option]})`);
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
          <span>Live Console</span>
          <span class="ac-header__code">${state.sessionCode || ''}</span>
        </div>
        <button class="ac-header__close" onclick="AIPrimer.toggleAdminConsole()">&times;</button>
      </div>

      <div class="ac-stats">
        <div class="ac-stat">
          <div class="ac-stat__number" id="ac-participant-count">${state.participants.length}</div>
          <div class="ac-stat__label">Connected</div>
        </div>
        <div class="ac-stat">
          <div class="ac-stat__number" id="ac-slide-progress">${state.currentSlide + 1}/${state.slides.length}</div>
          <div class="ac-stat__label">Slide</div>
        </div>
        <div class="ac-stat">
          <div class="ac-stat__number" id="ac-response-count">${Object.keys(state.responses).reduce((sum, k) => sum + Object.keys(state.responses[k]).length, 0)}</div>
          <div class="ac-stat__label">Responses</div>
        </div>
      </div>

      <div class="ac-tabs">
        <button class="ac-tab ac-tab--active" data-tab="participants" onclick="AIPrimer.switchAdminTab('participants')">Participants</button>
        <button class="ac-tab" data-tab="activity" onclick="AIPrimer.switchAdminTab('activity')">Activity</button>
        <button class="ac-tab" data-tab="session" onclick="AIPrimer.switchAdminTab('session')">Session</button>
      </div>

      <div class="ac-panel" id="ac-panel-participants">
        <div id="ac-participant-list" class="ac-participant-list">
          ${renderParticipantList()}
        </div>
      </div>

      <div class="ac-panel ac-panel--hidden" id="ac-panel-activity">
        <div id="ac-activity-log" class="ac-activity-log">
          ${activityLog.length === 0 ? '<div class="ac-empty">No activity yet</div>' : activityLog.map(renderActivityItem).join('')}
        </div>
      </div>

      <div class="ac-panel ac-panel--hidden" id="ac-panel-session">
        <div class="ac-session-info">
          <div class="ac-session-row">
            <span class="ac-session-label">Join Link</span>
            <a href="${joinUrl}" target="_blank" class="ac-session-link">${joinUrl}</a>
          </div>
          <div class="ac-session-row">
            <span class="ac-session-label">Status</span>
            <span class="ac-session-value" id="ac-connection-status">${state.connected ? 'Connected' : 'Connecting...'}</span>
          </div>
        </div>
        <div class="ac-controls">
          <button class="ac-control-btn ac-control-btn--pause" onclick="AIPrimer.adminPause()">⏸ Pause Session</button>
          <button class="ac-control-btn ac-control-btn--end" onclick="AIPrimer.adminEnd()">⏹ End Session</button>
        </div>
      </div>
    `;

    return panel;
  }

  function renderParticipantList() {
    if (state.participants.length === 0) {
      return '<div class="ac-empty">No participants yet</div>';
    }

    return state.participants.map(p => {
      const initial = (p.name || 'A').charAt(0).toUpperCase();
      const slideLabel = (p.currentSlide !== undefined) ? `Slide ${p.currentSlide + 1}` : '';
      const activityIcon = p.lastActivityType === 'quiz' ? '📝' :
                           p.lastActivityType === 'poll' ? '📊' :
                           p.lastActivityType === 'text' ? '💬' :
                           p.lastActivityType === 'joined' ? '🟢' : '';
      const timeSince = p.lastActivity ? getTimeSince(p.lastActivity) : '';

      return `<div class="ac-participant">
        <div class="ac-participant__avatar">${initial}</div>
        <div class="ac-participant__info">
          <div class="ac-participant__name">${p.name || 'Anonymous'}</div>
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
    if (statusEl) statusEl.textContent = state.connected ? 'Connected' : 'Disconnected';

    const listEl = document.getElementById('ac-participant-list');
    if (listEl) {
      listEl.innerHTML = renderParticipantList();
    }
  }

  // Keep backward compat
  function updateSessionPanel() { updateAdminConsole(); }
  function toggleSessionPanel() { toggleAdminConsole(); }

  // --- Initialisation ---
  function init(config) {
    // config = { slides: [...], courseId: '...', mode: 'presenter'|'participant'|'self', containerId: '...' }
    //
    // Slide resolution priority:
    //   1. config.courseId → resolve via SlideRegistry.getCourse()
    //   2. config.slides → use directly (legacy path)
    //   3. window.AI_PRIMER_SLIDES → final fallback
    //
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
            <div class="presenter-next__label">Next Slide</div>
            <div class="presenter-next__preview"></div>
          </div>
          <div class="presenter-notes">
            <div class="presenter-notes__label">Speaker Notes</div>
            <div class="presenter-notes__content"></div>
          </div>
          <div class="response-stream">
            <div class="response-stream__label">Live Responses</div>
          </div>
        </div>
        <div class="presenter-controls">
          <div class="presenter-controls__nav">
            <button class="presenter-controls__btn" onclick="AIPrimer.prev()">&#9664; Prev</button>
            <span class="presenter-controls__slide-info">1 / ${state.slides.length}</span>
            <button class="presenter-controls__btn" onclick="AIPrimer.next()">Next &#9654;</button>
          </div>
          <div class="presenter-controls__stats">
            <button class="presenter-controls__session-btn" onclick="AIPrimer.toggleAdminConsole()" title="Open admin console">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Console
            </button>
            <div class="presenter-controls__stat">
              <span class="presenter-controls__stat-dot"></span>
              <span><span class="presenter-controls__participant-count">0</span> participants</span>
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
  AIPrimer.toggleSessionPanel = toggleSessionPanel;
  AIPrimer.toggleAdminConsole = toggleAdminConsole;
  AIPrimer.switchAdminTab = switchAdminTab;
  AIPrimer.adminPause = function () {
    if (state.socket) state.socket.emit('session-pause');
    if (typeof pauseAndExit === 'function') pauseAndExit(state.sessionCode);
  };
  AIPrimer.adminEnd = function () {
    if (confirm('End this session? Participants will be disconnected.')) {
      if (state.socket) {
        state.socket.emit('session-end');
        state.socket.disconnect();
      }
      if (typeof showDashboard === 'function') showDashboard();
    }
  };

})();
