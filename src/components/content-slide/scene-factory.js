import { createHtmlRenderer } from '../../rendering/html-scene.js';
import { colors as defaultColors } from '../../shared/colors.js';
import { registry } from '../../authoring/component-registry.js';

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
      .${id}-code pre code { background: transparent; padding: 0; }
      .${id}-code .hljs-comment,
      .${id}-code .hljs-quote       { color: ${c.textMuted}; font-style: italic; }
      .${id}-code .hljs-keyword,
      .${id}-code .hljs-selector-tag,
      .${id}-code .hljs-literal     { color: ${c.purple}; }
      .${id}-code .hljs-string,
      .${id}-code .hljs-symbol,
      .${id}-code .hljs-regexp      { color: ${c.green}; }
      .${id}-code .hljs-number,
      .${id}-code .hljs-meta        { color: ${c.accentWarm}; }
      .${id}-code .hljs-title,
      .${id}-code .hljs-title.function_,
      .${id}-code .hljs-section     { color: ${c.beam}; }
      .${id}-code .hljs-built_in,
      .${id}-code .hljs-type,
      .${id}-code .hljs-class,
      .${id}-code .hljs-attr,
      .${id}-code .hljs-attribute,
      .${id}-code .hljs-variable    { color: ${c.accent}; }
      .${id}-code .hljs-tag,
      .${id}-code .hljs-name        { color: ${c.beam}; }
      .${id}-code .hljs-params,
      .${id}-code .hljs-operator,
      .${id}-code .hljs-punctuation { color: ${c.text}; }
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
    // 1. Columns are a content-slide-native compositional primitive (not a
    //    registered component). Handle inline.
    if (block.type === 'columns') {
      const wrap = document.createElement('div');
      wrap.className = `${id}-columns`;
      const left = document.createElement('div');
      const right = document.createElement('div');
      for (const b of (block.left || [])) left.appendChild(renderBlock(b));
      for (const b of (block.right || [])) right.appendChild(renderBlock(b));
      wrap.appendChild(left);
      wrap.appendChild(right);
      return wrap;
    }

    // 2. Fenced code with a recognized info-string → custom markdown-block.
    if (block.type === 'code' && block.language) {
      const custom = registry.getByInfoString(block.language);
      if (custom && custom.render) {
        const parsed = custom.parse ? custom.parse(block.code, { file: null, blockStartLine: 0 }) : block.code;
        return custom.render(parsed, { classPrefix: id, colors: c });
      }
    }

    // 3. Built-in block type → registered markdown-block.
    const builtin = registry.getByBlockType(block.type);
    if (builtin && builtin.render) {
      const parsed = builtin.parse ? builtin.parse(block) : block;
      return builtin.render(parsed, { classPrefix: id, colors: c });
    }

    // 4. Unknown: empty div (keeps the deck renderable; linter will flag).
    return document.createElement('div');
  }

  function renderSlide(slideBlocks, stepIndex, animated) {
    const wrap = document.createElement('div');
    wrap.className = `${id}-wrap`;

    slideBlocks.forEach((block, i) => {
      const slot = document.createElement('div');
      const visible = i <= stepIndex;
      slot.className = animated
        ? `${id}-block${visible ? ' visible' : ''}`
        : `${id}-block${visible ? ' instant' : ''}`;
      if (animated && visible) slot.style.transitionDelay = `${i * 80}ms`;
      slot.appendChild(renderBlock(block));
      wrap.appendChild(slot);
    });

    contentEl.innerHTML = '';
    contentEl.appendChild(wrap);
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
