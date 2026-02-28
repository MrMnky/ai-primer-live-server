/* ============================================
   GraphicContainer — Interactive Graphic Manager
   Embeds standalone HTML graphics via iframe,
   manages postMessage communication protocol,
   handles responsive layout and lifecycle.
   ============================================ */

const GraphicContainer = {

  /** Track active graphic instances by slide index */
  _instances: {},

  /**
   * Mount a graphic into a container element.
   *
   * @param {HTMLElement} containerEl - DOM element to mount into
   * @param {object} graphicDef - { id, responsive, height, preload, aspectRatio }
   * @param {number} slideIndex - Current slide index
   * @param {function} onComplete - Called when user completes the graphic
   * @param {function} onInteraction - Called on any logged interaction
   * @returns {object} Instance handle with { iframe, getState, reset, destroy }
   */
  mount(containerEl, graphicDef, slideIndex, onComplete, onInteraction) {
    // Clean up any existing instance for this slide
    this.unmount(slideIndex);

    const wrapper = document.createElement('div');
    wrapper.className = 'graphic-wrapper';
    wrapper.style.cssText = `
      width: 100%;
      height: ${graphicDef.height || '100%'};
      min-height: ${graphicDef.minHeight || '400px'};
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      background: rgba(0,0,0,0.1);
    `;
    if (graphicDef.aspectRatio) {
      wrapper.style.aspectRatio = graphicDef.aspectRatio;
    }

    const iframe = document.createElement('iframe');
    iframe.src = `/interactives/${graphicDef.id}.html`;
    iframe.style.cssText = `
      width: 100%; height: 100%;
      border: none; display: block;
    `;
    iframe.setAttribute('loading', graphicDef.preload ? 'eager' : 'lazy');
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
    iframe.setAttribute('title', graphicDef.title || 'Interactive graphic');

    // Instance state
    const instance = {
      iframe,
      wrapper,
      slideIndex,
      graphicId: graphicDef.id,
      state: null,
      ready: false,
    };

    // Message handler bound to this instance
    const messageHandler = (event) => {
      if (!iframe.contentWindow || event.source !== iframe.contentWindow) return;

      const { type, payload } = event.data || {};
      if (!type) return;

      switch (type) {
        case 'GRAPHIC_READY':
          instance.ready = true;
          // Send init data to graphic
          iframe.contentWindow.postMessage({
            type: 'INIT',
            payload: {
              slideIndex,
              responsive: graphicDef.responsive !== false,
              deviceType: GraphicContainer._detectDeviceType(),
            },
          }, '*');
          break;

        case 'GRAPHIC_COMPLETE':
          instance.state = payload;
          if (typeof onComplete === 'function') {
            onComplete({
              graphicId: graphicDef.id,
              slideIndex,
              state: payload,
            });
          }
          break;

        case 'REQUEST_SESSION_DATA':
          // Send safe session-level data to graphic
          iframe.contentWindow.postMessage({
            type: 'SESSION_DATA',
            payload: {
              slideIndex,
              // Expose only safe data — never raw participant details
              participantCount: window._graphicSessionData?.participantCount || 0,
            },
          }, '*');
          break;

        case 'LOG_INTERACTION':
          if (typeof onInteraction === 'function') {
            onInteraction({
              graphicId: graphicDef.id,
              slideIndex,
              ...payload,
            });
          }
          break;
      }
    };

    window.addEventListener('message', messageHandler);
    instance._messageHandler = messageHandler;

    wrapper.appendChild(iframe);
    containerEl.appendChild(wrapper);

    this._instances[slideIndex] = instance;

    return {
      iframe,
      getState: () => instance.state,
      reset: () => {
        if (instance.ready && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'RESET', payload: {} }, '*');
          instance.state = null;
        }
      },
      destroy: () => this.unmount(slideIndex),
    };
  },

  /**
   * Unmount a graphic instance, cleaning up listeners.
   *
   * @param {number} slideIndex
   */
  unmount(slideIndex) {
    const instance = this._instances[slideIndex];
    if (!instance) return;

    if (instance._messageHandler) {
      window.removeEventListener('message', instance._messageHandler);
    }
    if (instance.wrapper && instance.wrapper.parentNode) {
      instance.wrapper.parentNode.removeChild(instance.wrapper);
    }
    delete this._instances[slideIndex];
  },

  /**
   * Unmount all active graphic instances.
   */
  unmountAll() {
    Object.keys(this._instances).forEach(idx => this.unmount(idx));
  },

  /**
   * Prefetch a graphic for faster loading.
   * Uses <link rel="prefetch"> to hint the browser.
   *
   * @param {string} graphicId
   */
  prefetch(graphicId) {
    const existing = document.querySelector(`link[href="/interactives/${graphicId}.html"]`);
    if (existing) return; // Already prefetched

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = `/interactives/${graphicId}.html`;
    document.head.appendChild(link);
  },

  /**
   * Prefetch graphics for upcoming slides.
   *
   * @param {object[]} slides - Full slide array
   * @param {number} currentIndex - Current slide index
   * @param {number} lookahead - How many slides ahead to check (default 3)
   */
  prefetchUpcoming(slides, currentIndex, lookahead = 3) {
    for (let i = currentIndex + 1; i <= Math.min(currentIndex + lookahead, slides.length - 1); i++) {
      const slide = slides[i];
      if (slide && slide.graphic && slide.graphic.id) {
        this.prefetch(slide.graphic.id);
      }
    }
  },

  /**
   * Detect the device type based on viewport and touch support.
   *
   * @returns {'mobile'|'tablet'|'desktop'}
   * @private
   */
  _detectDeviceType() {
    const width = window.innerWidth;
    const isTouch = ('ontouchstart' in window) ||
                    (navigator.maxTouchPoints > 0);

    if (width < 600 && isTouch) return 'mobile';
    if (width < 1024 && isTouch) return 'tablet';
    return 'desktop';
  },

  /**
   * Set session data that graphics can request.
   * Call this from the engine when participant count changes.
   *
   * @param {object} data - { participantCount, ... }
   */
  setSessionData(data) {
    window._graphicSessionData = data;
  },
};
