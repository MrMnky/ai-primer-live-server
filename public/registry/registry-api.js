/* ============================================
   AI Primer — Slide Registry API
   Resolves courses into slide arrays.
   Handles per-slide overrides, conditionals,
   and backwards compatibility with legacy arrays.

   Load AFTER slides.js and courses.js
   ============================================ */

const SlideRegistry = {

  /**
   * Get a course by ID, resolved to a full slide array.
   * Each slide in the returned array has its `id` field set.
   *
   * @param {string} courseId - Course ID from COURSE_DEFINITIONS
   * @returns {{ title: string, slides: object[], metadata: object }}
   */
  getCourse(courseId) {
    const courseDef = COURSE_DEFINITIONS[courseId];
    if (!courseDef) {
      console.error(`[Registry] Course not found: ${courseId}`);
      return null;
    }

    const slides = [];
    const missing = [];

    courseDef.slides.forEach(ref => {
      // ref can be a string ID or an object { id, ...overrides }
      const slideId = typeof ref === 'string' ? ref : ref.id;
      const slide = SLIDE_REGISTRY[slideId];

      if (!slide) {
        missing.push(slideId);
        return;
      }

      // Merge overrides if ref is an object
      if (typeof ref === 'object') {
        const { id: _id, ...overrides } = ref;
        slides.push({ ...slide, ...overrides });
      } else {
        slides.push(slide);
      }
    });

    if (missing.length > 0) {
      console.warn(`[Registry] Missing slides in course '${courseId}':`, missing);
    }

    return {
      title: courseDef.title,
      description: courseDef.description || '',
      slides,
      sections: courseDef.sections || [],
      metadata: courseDef.metadata || {},
    };
  },

  /**
   * Get a single slide by ID.
   *
   * @param {string} slideId
   * @returns {object|null}
   */
  getSlide(slideId) {
    return SLIDE_REGISTRY[slideId] || null;
  },

  /**
   * List all registered courses.
   *
   * @returns {{ id: string, title: string, slideCount: number }[]}
   */
  listCourses() {
    return Object.keys(COURSE_DEFINITIONS).map(id => ({
      id,
      title: COURSE_DEFINITIONS[id].title,
      description: COURSE_DEFINITIONS[id].description || '',
      slideCount: COURSE_DEFINITIONS[id].slides.length,
      languages: COURSE_DEFINITIONS[id].languages || ['en'],
      metadata: COURSE_DEFINITIONS[id].metadata || {},
    }));
  },

  /**
   * Get available languages for a course.
   *
   * @param {string} courseId
   * @returns {string[]} Array of language codes (e.g. ['en', 'fr'])
   */
  getAvailableLanguages(courseId) {
    const course = COURSE_DEFINITIONS[courseId];
    return course?.languages || ['en'];
  },

  /**
   * Get total registered slide count.
   *
   * @returns {number}
   */
  getSlideCount() {
    return Object.keys(SLIDE_REGISTRY).length;
  },

  /**
   * Resolve a course's slides, filtering out conditionals based on responses.
   * Used for participant views where some slides should be hidden.
   *
   * @param {object[]} slides - Array of slide objects (from getCourse)
   * @param {object} responses - Map of slideId → answer
   * @returns {object[]} Filtered slide array
   */
  resolveConditionalSlides(slides, responses) {
    return slides.filter(slide => {
      if (!slide.conditional) return true;

      const { showIf, showIfAll, showIfAny } = slide.conditional;

      if (showIf) {
        const prev = responses[showIf.slideId];
        return prev !== undefined && prev === showIf.answer;
      }

      if (showIfAll) {
        return showIfAll.every(cond => {
          const prev = responses[cond.slideId];
          return prev !== undefined && prev === cond.answer;
        });
      }

      if (showIfAny) {
        return showIfAny.some(cond => {
          const prev = responses[cond.slideId];
          return prev !== undefined && prev === cond.answer;
        });
      }

      return true;
    });
  },

  /**
   * Backwards-compatible: build a slide array from the legacy
   * AI_PRIMER_SLIDES global, assigning IDs from the registry
   * where available.
   *
   * This allows the engine to use registry IDs even when loading
   * from the old concatenated array.
   *
   * @param {object[]} legacySlides - AI_PRIMER_SLIDES array
   * @returns {object[]} Same slides with `id` fields added
   */
  /**
   * Resolve a custom course's slide array against the registry.
   * Each entry can be a string (slide ID) or an object { id, ...overrides }.
   * Dotted override keys (e.g. 'quiz.question') are unflattened into nested objects.
   *
   * @param {object} courseData - { title, slides: [...], sections: [...] }
   * @returns {{ title: string, slides: object[], sections: object[] }}
   */
  resolveCustomCourse(courseData) {
    const slides = [];
    const missing = [];

    (courseData.slides || []).forEach(ref => {
      const slideId = typeof ref === 'string' ? ref : ref.id;
      const baseSlide = SLIDE_REGISTRY[slideId];

      if (!baseSlide) {
        // No registry slide — might be a custom template slide
        if (typeof ref === 'object') {
          const { id: _id, _isCustom, ...flatOverrides } = ref;
          // Unflatten dotted keys — overrides ARE the full slide data
          const slide = {};
          Object.entries(flatOverrides).forEach(([key, value]) => {
            if (key.includes('.')) {
              const [parent, child] = key.split('.', 2);
              if (!slide[parent]) slide[parent] = {};
              const optMatch = child.match(/^option(\d+)$/);
              if (optMatch) {
                if (!slide[parent].options) slide[parent].options = [];
                slide[parent].options[parseInt(optMatch[1])] = value;
              } else {
                slide[parent][child] = value;
              }
            } else {
              slide[key] = value;
            }
          });
          slide.id = slideId;
          slides.push(slide);
        } else {
          missing.push(slideId);
        }
        return;
      }

      if (typeof ref === 'object') {
        const { id: _id, _isCustom, ...flatOverrides } = ref;
        // Unflatten dotted keys into nested objects
        const overrides = {};
        Object.entries(flatOverrides).forEach(([key, value]) => {
          if (key.includes('.')) {
            const [parent, child] = key.split('.', 2);
            if (!overrides[parent]) overrides[parent] = { ...(baseSlide[parent] || {}) };
            // Handle option indices (e.g. 'quiz.option0' → quiz.options[0])
            const optMatch = child.match(/^option(\d+)$/);
            if (optMatch) {
              if (!overrides[parent].options) overrides[parent].options = [...(baseSlide[parent]?.options || [])];
              overrides[parent].options[parseInt(optMatch[1])] = value;
            } else {
              overrides[parent][child] = value;
            }
          } else {
            overrides[key] = value;
          }
        });
        slides.push({ ...baseSlide, ...overrides });
      } else {
        slides.push(baseSlide);
      }
    });

    if (missing.length > 0) {
      console.warn('[Registry] Missing slides in custom course:', missing);
    }

    return {
      title: courseData.title || 'Custom Course',
      slides,
      sections: courseData.sections || [],
      metadata: { custom: true },
    };
  },

  enrichLegacySlides(legacySlides) {
    // Build a reverse map: registry slide → its ID, keyed by title+type
    const reverseMap = {};
    Object.entries(SLIDE_REGISTRY).forEach(([id, slide]) => {
      const key = `${slide.type}::${slide.title || ''}`;
      reverseMap[key] = id;
    });

    return legacySlides.map((slide, index) => {
      const key = `${slide.type}::${slide.title || ''}`;
      const id = reverseMap[key] || `legacy-${index}`;
      return { ...slide, id };
    });
  },
};
