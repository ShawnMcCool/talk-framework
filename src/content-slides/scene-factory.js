import { createHtmlRenderer } from '../rendering/html-scene.js';
import { colors as defaultColors } from '../shared/colors.js';

let instanceCounter = 0;

/**
 * Create a content slide scene from a declarative slide definition.
 *
 * Each slide is an array of "blocks" revealed progressively (one per step).
 * Step 0 shows block 0, step 1 shows blocks 0+1, etc. Accepted block shapes
 * are defined by the `ContentBlock` union in `src/types.js`.
 *
 * @param {string} title
 * @param {import('../types.js').ContentBlock[][]} slides
 *   Array of slides; each slide is an array of blocks.
 * @param {import('../types.js').ContentSlideOptions} [opts]
 * @returns {import('../types.js').SceneModule}
 */
export function createContentSlide(title, slides, opts = {}) {
  const id = `cs-${instanceCounter++}`;
  const c = { ...defaultColors, ...opts.colors };

  let renderer = null;
  let container = null;
  let contentEl = null;
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
      .${id}-wrap {
        width: 100%; height: 100%; box-sizing: border-box;
        padding: 4rem 6rem; display: flex; flex-direction: column;
        justify-content: center; position: relative; overflow: hidden;
        background: ${c.bg}; font-family: system-ui, -apple-system, sans-serif;
      }
      .${id}-block { opacity: 0; transform: translateY(16px); }
      .${id}-block.visible {
        opacity: 1; transform: translateY(0);
        transition: opacity 0.4s ease-out, transform 0.4s ease-out;
      }
      .${id}-block.instant { opacity: 1; transform: translateY(0); transition: none; }
      .${id}-heading {
        font-weight: 700; line-height: 1.15; letter-spacing: -0.02em;
        margin: 0 0 1.2rem 0;
      }
      .${id}-heading[data-level="1"] { font-size: 3.2rem; color: ${c.text}; }
      .${id}-heading[data-level="2"] { font-size: 2.2rem; color: ${c.accent}; }
      .${id}-heading[data-level="3"] { font-size: 1.5rem; color: ${c.textMuted}; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; }
      .${id}-text { font-size: 1.4rem; line-height: 1.6; color: ${c.text}; margin: 0 0 1rem 0; }
      .${id}-text.muted { color: ${c.textMuted}; font-size: 1.2rem; }
      .${id}-bullets {
        list-style: none; padding: 0; margin: 0 0 1.2rem 0;
      }
      .${id}-bullets li {
        font-size: 1.4rem; line-height: 1.7; color: ${c.text};
        padding: 0.3rem 0 0.3rem 1.8rem; position: relative;
      }
      .${id}-bullets li::before {
        content: ''; position: absolute; left: 0; top: 0.85rem;
        width: 8px; height: 8px; border-radius: 50%;
        background: ${c.accent};
      }
      .${id}-code {
        background: ${c.bgDarker}; border: 1px solid ${c.bgDark};
        border-radius: 8px; padding: 1.5rem 2rem; margin: 0 0 1.2rem 0;
        overflow-x: auto;
      }
      .${id}-code pre {
        margin: 0; font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
        font-size: 1.1rem; line-height: 1.7; color: ${c.text}; white-space: pre;
      }
      .${id}-code .kw { color: ${c.purple}; }
      .${id}-code .fn { color: ${c.beam}; }
      .${id}-code .str { color: ${c.green}; }
      .${id}-code .cm { color: ${c.textMuted}; }
      .${id}-code .at { color: ${c.accentWarm}; }
      .${id}-quote {
        border-left: 3px solid ${c.accent}; padding: 0.8rem 0 0.8rem 2rem;
        margin: 0 0 1.2rem 0;
      }
      .${id}-quote p {
        font-size: 1.6rem; line-height: 1.5; color: ${c.text};
        font-style: italic; margin: 0;
      }
      .${id}-quote cite {
        display: block; font-size: 1rem; color: ${c.textMuted};
        font-style: normal; margin-top: 0.6rem;
      }
      .${id}-columns {
        display: grid; grid-template-columns: 1fr 1fr; gap: 3rem;
        align-items: start;
      }
      .${id}-spacer { height: 1rem; }
      .${id}-spacer[data-size="lg"] { height: 2rem; }
    `;
    container.appendChild(style);
  }

  function renderBlock(block) {
    const accentStyle = block.accent ? `color: ${block.accent};` : '';

    switch (block.type) {
      case 'heading': {
        const level = block.level || 1;
        return `<div class="${id}-heading" data-level="${level}" ${accentStyle ? `style="${accentStyle}"` : ''}>${block.text}</div>`;
      }
      case 'text':
        return `<p class="${id}-text ${block.muted ? 'muted' : ''}">${block.text}</p>`;
      case 'bullets': {
        const bulletStyle = block.accent
          ? `style="--bullet-color: ${block.accent};"` : '';
        const items = block.items.map(item =>
          `<li${block.accent ? ` style="::before { background: ${block.accent}; }"` : ''}>${item}</li>`
        ).join('');
        return `<ul class="${id}-bullets" ${bulletStyle}>${items}</ul>`;
      }
      case 'code':
        return `<div class="${id}-code"><pre>${block.code}</pre></div>`;
      case 'quote': {
        const cite = block.attribution ? `<cite>— ${block.attribution}</cite>` : '';
        return `<div class="${id}-quote"><p>${block.text}</p>${cite}</div>`;
      }
      case 'columns': {
        const left = (block.left || []).map(renderBlock).join('');
        const right = (block.right || []).map(renderBlock).join('');
        return `<div class="${id}-columns"><div>${left}</div><div>${right}</div></div>`;
      }
      case 'spacer':
        return `<div class="${id}-spacer" data-size="${block.size || 'md'}"></div>`;
      default:
        return '';
    }
  }

  function renderSlide(slideBlocks, stepIndex, animated) {
    const cls = animated ? `${id}-block` : `${id}-block instant`;
    const html = slideBlocks.map((block, i) => {
      const visible = i <= stepIndex;
      const classes = visible ? `${cls} visible` : `${id}-block`;
      const delay = animated && visible ? `transition-delay: ${i * 80}ms;` : '';
      return `<div class="${classes}" style="${delay}">${renderBlock(block)}</div>`;
    }).join('');

    contentEl.innerHTML = `<div class="${id}-wrap">${html}</div>`;
  }

  return {
    title,
    slides: slides.map(s => ({ stepCount: s.length })),

    init(stage) {
      renderer = createHtmlRenderer();
      container = renderer.init(stage);
      injectStyles(container);
      contentEl = document.createElement('div');
      contentEl.style.cssText = 'width:100%;height:100%;';
      container.appendChild(contentEl);
      return { container };
    },

    destroy() {
      clearTimeouts();
      if (renderer) renderer.destroy();
      renderer = null;
      container = null;
      contentEl = null;
    },

    resolveToSlide(ctx, slideIndex, stepIndex) {
      clearTimeouts();
      renderSlide(slides[slideIndex], stepIndex, false);
    },

    animateToSlide(ctx, slideIndex, stepIndex, done) {
      clearTimeouts();
      renderSlide(slides[slideIndex], stepIndex, true);
      later(done, slides[slideIndex].length * 80 + 500);
    },
  };
}
