import { createHtmlRenderer } from '../../rendering/html-scene.js';
import { colors } from '../../shared/colors.js';

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
 * Create a reusable 2D section slide scene (large title with soft static
 * glow, optional subtitle, animated letter-in intro).
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
      @keyframes ${id}-rule-expand {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }
      @keyframes ${id}-fade-up {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes ${id}-letter-in {
        from { opacity: 0; transform: translateY(24px); filter: blur(4px); }
        to { opacity: 1; transform: translateY(0); filter: blur(0); }
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

    const bottomRule = document.createElement('div');
    bottomRule.style.cssText = `
      position: absolute; bottom: 25%; left: 20%; right: 20%; height: 1px;
      background: linear-gradient(90deg, transparent, ${accent}44, transparent);
      transform: scaleX(0); transform-origin: center;
    `;

    wrap.appendChild(topRule);
    wrap.appendChild(titleEl);

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

    return { wrap, titleEl, topRule, bottomRule, subtitleEl, spans };
  }

  // Soft static glow replaces the old infinite shimmer + glow-pulse — keeps
  // the title visually present without flicker.
  const settledShadow = `0 0 28px ${rgba(accent, 0.35)}, 0 0 70px ${rgba(accent, 0.15)}`;

  function showIntro(e) {
    clearTimeouts();
    for (const s of e.spans) { s.style.opacity = '0'; s.style.animation = 'none'; }
    e.topRule.style.transform = 'scaleX(0)';
    e.topRule.style.animation = 'none';
    e.bottomRule.style.transform = 'scaleX(0)';
    e.bottomRule.style.animation = 'none';
    e.titleEl.style.animation = 'none';
    e.titleEl.style.textShadow = '';
    if (e.subtitleEl) { e.subtitleEl.style.opacity = '0'; e.subtitleEl.style.animation = 'none'; }
  }

  function showEnd(e) {
    clearTimeouts();
    for (const s of e.spans) {
      s.style.opacity = '1'; s.style.animation = 'none';
      s.style.transform = 'none'; s.style.filter = 'none';
    }
    e.titleEl.style.animation = 'none';
    e.titleEl.style.textShadow = settledShadow;
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

    const settleAt = lettersDone + 600;
    later(() => {
      e.titleEl.style.transition = 'text-shadow 0.8s ease-out';
      e.titleEl.style.textShadow = settledShadow;
    }, settleAt);

    later(() => { done(); }, settleAt + 200);
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
