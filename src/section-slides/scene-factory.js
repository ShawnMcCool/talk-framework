import { createHtmlRenderer } from '../rendering/html-scene.js';
import { colors } from '../shared/colors.js';

let instanceCounter = 0;

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Create a reusable 2D section slide scene (large shimmering title, optional
 * subtitle, animated letter-in intro).
 *
 * @param {string} title - Main heading text (required)
 * @param {import('../types.js').SectionSlideOptions} [opts]
 * @returns {import('../types.js').SceneModule}
 */
export function createSectionSlide(title, {
  subtitle = null,
  accent = colors.accent,
  bg = colors.bg,
  bgDark = colors.bgDark,
  text: textColor = colors.text,
  fontSize = '7rem',
  letterStagger = 50,
} = {}) {
  const id = `ss-${instanceCounter++}`;

  let renderer = null;
  let els = null;
  let timeouts = [];

  function clearTimeouts() {
    for (const t of timeouts) clearTimeout(t);
    timeouts = [];
  }

  function later(fn, ms) {
    timeouts.push(setTimeout(fn, ms));
  }

  function injectStyles(container) {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ${id}-shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes ${id}-glow-pulse {
        0%, 100% { text-shadow:
          0 0 20px ${rgba(accent, 0.4)},
          0 0 60px ${rgba(accent, 0.15)};
        }
        50% { text-shadow:
          0 0 30px ${rgba(accent, 0.6)},
          0 0 80px ${rgba(accent, 0.25)},
          0 0 120px ${rgba(accent, 0.1)};
        }
      }
      @keyframes ${id}-rule-expand {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }
      @keyframes ${id}-fade-up {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes ${id}-letter-in {
        from { opacity: 0; transform: translateY(40px) scale(0.8); filter: blur(6px); }
        to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      }
    `;
    container.appendChild(style);
    return style;
  }

  function buildDOM(container) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      width: 100%; height: 100%; display: flex; flex-direction: column;
      align-items: center; justify-content: center; position: relative;
      background: radial-gradient(ellipse at 50% 60%, ${bgDark} 0%, ${bg} 70%);
      overflow: hidden;
    `;

    const topRule = document.createElement('div');
    topRule.style.cssText = `
      position: absolute; top: 25%; left: 20%; right: 20%; height: 1px;
      background: linear-gradient(90deg, transparent, ${accent}44, transparent);
      transform: scaleX(0); transform-origin: center;
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 800; font-size: ${fontSize}; letter-spacing: -0.02em;
      line-height: 1; color: ${textColor}; position: relative;
      display: flex; gap: 0;
    `;

    const spans = [];
    for (const char of title) {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.cssText = `
        display: inline-block; opacity: 0;
        ${char === ' ' ? 'width: 0.3em;' : ''}
      `;
      titleEl.appendChild(span);
      spans.push(span);
    }

    const shimmer = document.createElement('div');
    shimmer.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(
        120deg,
        transparent 25%,
        ${accent}33 45%,
        ${accent}22 50%,
        ${accent}33 55%,
        transparent 75%
      );
      background-size: 200% 100%;
      -webkit-background-clip: text; background-clip: text;
      color: transparent; pointer-events: none;
      opacity: 0;
    `;
    shimmer.textContent = title;
    shimmer.style.fontFamily = titleEl.style.fontFamily;
    shimmer.style.fontWeight = titleEl.style.fontWeight;
    shimmer.style.fontSize = titleEl.style.fontSize;
    shimmer.style.letterSpacing = titleEl.style.letterSpacing;
    shimmer.style.lineHeight = titleEl.style.lineHeight;

    const bottomRule = document.createElement('div');
    bottomRule.style.cssText = `
      position: absolute; bottom: 25%; left: 20%; right: 20%; height: 1px;
      background: linear-gradient(90deg, transparent, ${accent}44, transparent);
      transform: scaleX(0); transform-origin: center;
    `;

    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = 'position: relative;';
    titleWrap.appendChild(titleEl);
    titleWrap.appendChild(shimmer);

    wrap.appendChild(topRule);
    wrap.appendChild(titleWrap);

    let subtitleEl = null;
    if (subtitle) {
      subtitleEl = document.createElement('div');
      subtitleEl.style.cssText = `
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 300; font-size: 1.1rem; letter-spacing: 0.25em;
        text-transform: uppercase; color: ${accent}; opacity: 0;
        margin-top: 1.5rem;
      `;
      subtitleEl.textContent = subtitle;
      wrap.appendChild(subtitleEl);
    }

    wrap.appendChild(bottomRule);
    container.appendChild(wrap);

    return { wrap, titleEl, shimmer, topRule, bottomRule, subtitleEl, spans };
  }

  function showIntro(e) {
    clearTimeouts();
    for (const s of e.spans) { s.style.opacity = '0'; s.style.animation = 'none'; }
    e.shimmer.style.opacity = '0';
    e.shimmer.style.animation = 'none';
    e.topRule.style.transform = 'scaleX(0)';
    e.topRule.style.animation = 'none';
    e.bottomRule.style.transform = 'scaleX(0)';
    e.bottomRule.style.animation = 'none';
    e.titleEl.style.animation = 'none';
    if (e.subtitleEl) { e.subtitleEl.style.opacity = '0'; e.subtitleEl.style.animation = 'none'; }
  }

  function showEnd(e) {
    clearTimeouts();
    for (const s of e.spans) {
      s.style.opacity = '1'; s.style.animation = 'none';
      s.style.transform = 'none'; s.style.filter = 'none';
    }
    e.shimmer.style.opacity = '1';
    e.shimmer.style.animation = `${id}-shimmer 4s linear infinite`;
    e.titleEl.style.animation = `${id}-glow-pulse 3s ease-in-out infinite`;
    e.topRule.style.transform = 'scaleX(1)';
    e.topRule.style.animation = 'none';
    e.bottomRule.style.transform = 'scaleX(1)';
    e.bottomRule.style.animation = 'none';
    if (e.subtitleEl) { e.subtitleEl.style.opacity = '1'; e.subtitleEl.style.animation = 'none'; }
  }

  function animateIn(e, done) {
    showIntro(e);

    e.spans.forEach((span, i) => {
      span.style.animation = `${id}-letter-in 0.4s ${i * letterStagger}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`;
    });

    const lettersDone = e.spans.length * letterStagger + 400;

    e.topRule.style.animation = `${id}-rule-expand 0.6s ${lettersDone}ms ease-out forwards`;
    e.bottomRule.style.animation = `${id}-rule-expand 0.6s ${lettersDone + 100}ms ease-out forwards`;

    if (e.subtitleEl) {
      e.subtitleEl.style.animation = `${id}-fade-up 0.5s ${lettersDone + 200}ms ease-out forwards`;
    }

    const shimmerStart = lettersDone + 600;
    later(() => {
      e.shimmer.style.opacity = '1';
      e.shimmer.style.animation = `${id}-shimmer 4s linear infinite`;
      e.titleEl.style.animation = `${id}-glow-pulse 3s ease-in-out infinite`;
    }, shimmerStart);

    later(() => { done(); }, shimmerStart + 200);
  }

  return {
    title,
    slides: [{ stepCount: 2 }],

    init(stage) {
      renderer = createHtmlRenderer();
      const container = renderer.init(stage);
      injectStyles(container);
      els = buildDOM(container);
      return { container };
    },

    destroy() {
      clearTimeouts();
      if (renderer) renderer.destroy();
      renderer = null;
      els = null;
    },

    resolveToSlide(ctx, slideIndex, stepIndex) {
      if (!els) return;
      if (stepIndex === 0) showIntro(els);
      else showEnd(els);
    },

    animateToSlide(ctx, slideIndex, stepIndex, done) {
      if (!els) { done(); return; }
      if (stepIndex === 0) { showIntro(els); done(); return; }
      animateIn(els, done);
    },
  };
}
