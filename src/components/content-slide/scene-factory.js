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
  const sceneFolder = opts.sceneFolder || '';
  const baseUrl = opts.baseUrl ?? '/';

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
      .${id}-bullet-item { opacity: 0; transform: translateY(12px); }
      .${id}-bullet-item.visible {
        opacity: 1; transform: translateY(0);
        transition: opacity 0.35s ease-out, transform 0.35s ease-out;
      }
      .${id}-bullet-item.instant { opacity: 1; transform: translateY(0); transition: none; }
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
        padding: 0.2rem 0 0.2rem 1.8rem; position: relative;
      }
      .${id}-bullets li::before {
        content: ''; position: absolute; left: 0.4rem;
        top: calc(0.2rem + 0.85em - 4px);
        width: 8px; height: 8px; border-radius: 50%;
        background: ${c.accent};
      }
      .${id}-bullets-sub {
        margin: 0.1rem 0 0.3rem 0;
      }
      .${id}-bullets-sub li {
        font-size: 1.2rem; line-height: 1.6; color: ${c.textMuted};
        padding: 0.15rem 0 0.15rem 1.4rem;
      }
      .${id}-bullets-sub li::before {
        left: 0.2rem;
        top: calc(0.15rem + 0.8em - 3px);
        width: 6px; height: 6px;
        background: ${c.textMuted};
      }
      .${id}-empty-host { padding: 0; }
      .${id}-empty-host::before { display: none; }
      /* +++ between bullet lists reads as one continuous list, not two. */
      .${id}-block:has(> .${id}-bullets:only-child) + .${id}-block:has(> .${id}-bullets:only-child) > .${id}-bullets {
        margin-top: 0;
      }
      .${id}-block:has(> .${id}-bullets:only-child):has(+ .${id}-block > .${id}-bullets:only-child) > .${id}-bullets {
        margin-bottom: 0;
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
      .${id}-image-row {
        display: flex; justify-content: center; align-items: center;
        gap: 2rem; margin: 0 0 1.2rem 0;
        max-width: 100%; max-height: 100%;
      }
      .${id}-image-row[data-count="1"] {
        justify-content: center;
      }
      .${id}-image-row[data-count="1"] .${id}-image-item {
        max-width: 70%; max-height: 100%;
        width: auto; height: auto;
        object-fit: contain;
      }
      .${id}-image-row:not([data-count="1"]) .${id}-image-item {
        flex: 1 1 0; min-width: 0;
        max-height: 100%;
        object-fit: contain;
      }
      .${id}-image-item.hidden {
        opacity: 0;
      }
      .${id}-image-item.visible {
        opacity: 1;
        transition: opacity 0.4s ease-out;
      }
      .${id}-image-item.instant {
        opacity: 1; transition: none;
      }
    `;
    container.appendChild(style);
  }

  function renderBlock(block, extraContext = {}) {
    // 1. Columns are a content-slide-native compositional primitive (not a
    //    registered component). Handle inline.
    if (block.type === 'columns') {
      const wrap = document.createElement('div');
      wrap.className = `${id}-columns`;
      const left = document.createElement('div');
      const right = document.createElement('div');
      for (const b of (block.left || [])) left.appendChild(renderBlock(b, extraContext));
      for (const b of (block.right || [])) right.appendChild(renderBlock(b, extraContext));
      wrap.appendChild(left);
      wrap.appendChild(right);
      return wrap;
    }

    const renderContext = {
      classPrefix: id,
      colors: c,
      sceneFolder,
      baseUrl,
      ...extraContext,
    };

    // 2. Fenced code with a recognized info-string → custom markdown-block.
    if (block.type === 'code' && block.language) {
      const custom = registry.getByInfoString(block.language);
      if (custom && custom.render) {
        const parsed = custom.parse ? custom.parse(block.code, { file: null, blockStartLine: 0 }) : block.code;
        return custom.render(parsed, renderContext);
      }
    }

    // 3. Built-in block type → registered markdown-block.
    const builtin = registry.getByBlockType(block.type);
    if (builtin && builtin.render) {
      const parsed = builtin.parse ? builtin.parse(block) : block;
      return builtin.render(parsed, renderContext);
    }

    // 4. Unknown: empty div (keeps the deck renderable; linter will flag).
    return document.createElement('div');
  }

  function stepEndsInBullets(step) {
    return step.length > 0 && step[step.length - 1].type === 'bullets';
  }

  function stepEndsInImageRow(step) {
    return step.length > 0 && step[step.length - 1].type === 'image-row';
  }

  // Find the end (exclusive) of a contiguous image-row run starting at
  // startIdx. The run continues through subsequent steps that contain a
  // single image-row block flagged `continuation: true`. Used to collapse
  // `+++`-separated image-only paragraphs into one <figure> with per-image
  // step-gated visibility.
  function imageRunEnd(slideSteps, startIdx) {
    let end = startIdx + 1;
    while (end < slideSteps.length
           && slideSteps[end].length === 1
           && slideSteps[end][0].type === 'image-row'
           && slideSteps[end][0].continuation) {
      end++;
    }
    return end;
  }

  // Render an image-row run as a single <figure>. The startIdx step's
  // *trailing* image-row contributes its images at step startIdx; each
  // continuation step contributes at its own step index. Leading blocks of
  // the startIdx step (e.g. a heading) are rendered separately by the
  // caller so the row layout isn't disturbed by them.
  function renderImageRun(slideSteps, startIdx, endIdx, stepIndex, animated) {
    const slot = document.createElement('div');
    slot.className = `${id}-block visible`;

    const merged = [];
    for (let s = startIdx; s < endIdx; s++) {
      const step = slideSteps[s];
      const block = (s === startIdx) ? step[step.length - 1] : step[0];
      for (const image of block.images) {
        merged.push({ ...image, visibleFromStep: s });
      }
    }
    const mergedBlock = { type: 'image-row', images: merged };
    slot.appendChild(renderBlock(mergedBlock, {
      currentStep: stepIndex,
      animated,
    }));
    return slot;
  }

  // A bullet run starts with any step whose last block is a bullet list and
  // continues through subsequent single-block bullet steps flagged
  // `continuation: true` (the author wrote `+++- text`, not `+++\n- text`).
  // Renders as one <ul> with per-<li> reveal so the list reads as one
  // continuous structure even when revealed progressively.
  function bulletRunEnd(slideSteps, startIdx) {
    let end = startIdx + 1;
    while (end < slideSteps.length
           && slideSteps[end].length === 1
           && slideSteps[end][0].type === 'bullets'
           && slideSteps[end][0].continuation) {
      end++;
    }
    return end;
  }

  // Render a run of consecutive bullet-only steps as a single <ul>. Each
  // <li> carries the step at which it becomes visible, so progressive reveal
  // works per-item while the list stays structurally and visually continuous
  // (no gap, no re-nesting, no loss of sub-bullet styling across `+++`).
  function renderBulletRun(slideSteps, startIdx, endIdx, stepIndex, animated) {
    const slot = document.createElement('div');
    slot.className = `${id}-block visible`;

    const root = document.createElement('ul');
    root.className = `${id}-bullets`;
    const stack = [root];

    for (let s = startIdx; s < endIdx; s++) {
      const stepBlocks = slideSteps[s];
      const block = stepBlocks[stepBlocks.length - 1];
      for (const it of block.items) {
        const depth = Math.max(0, it.depth | 0);

        while (stack.length <= depth) {
          const parent = stack[stack.length - 1];
          let host = parent.lastElementChild;
          if (!host || host.tagName !== 'LI') {
            host = document.createElement('li');
            host.className = `${id}-empty-host`;
            parent.appendChild(host);
          }
          const sub = document.createElement('ul');
          sub.className = `${id}-bullets ${id}-bullets-sub`;
          host.appendChild(sub);
          stack.push(sub);
        }
        while (stack.length > depth + 1) stack.pop();

        const li = document.createElement('li');
        li.textContent = it.text;
        const visible = s <= stepIndex;
        li.className = animated
          ? `${id}-bullet-item${visible ? ' visible' : ''}`
          : `${id}-bullet-item${visible ? ' instant' : ''}`;
        if (animated && visible) {
          li.style.transitionDelay = `${(s - startIdx) * 80}ms`;
        }
        stack[stack.length - 1].appendChild(li);
      }
    }

    slot.appendChild(root);
    return slot;
  }

  // `slideSteps` is Array<Array<Block>>: outer = reveal steps, inner = blocks
  // shown together within that step. By default a slide is one step containing
  // every block; `+++` in the markdown source splits further. Consecutive
  // bullet-only steps are collapsed into one <ul> run so sub-bullets read as
  // part of the same list even when revealed progressively.
  function renderSlide(slideSteps, stepIndex, animated) {
    const wrap = document.createElement('div');
    wrap.className = `${id}-wrap`;

    let i = 0;
    while (i < slideSteps.length) {
      const stepBlocks = slideSteps[i];
      if (stepEndsInImageRow(stepBlocks)) {
        const end = imageRunEnd(slideSteps, i);
        if (end > i + 1 || stepBlocks.length === 1) {
          // Render any leading non-image-row blocks of this step in their
          // own slot so the figure can claim its full width below them.
          if (stepBlocks.length > 1) {
            const head = document.createElement('div');
            const visible = i <= stepIndex;
            head.className = animated
              ? `${id}-block${visible ? ' visible' : ''}`
              : `${id}-block${visible ? ' instant' : ''}`;
            if (animated && visible) head.style.transitionDelay = `${i * 80}ms`;
            for (let b = 0; b < stepBlocks.length - 1; b++) {
              head.appendChild(renderBlock(stepBlocks[b]));
            }
            wrap.appendChild(head);
          }
          wrap.appendChild(renderImageRun(slideSteps, i, end, stepIndex, animated));
          i = end;
          continue;
        }
      }
      if (stepEndsInBullets(stepBlocks)) {
        const end = bulletRunEnd(slideSteps, i);
        if (end > i + 1) {
          // Non-bullet blocks in this step render as their own slot; the
          // trailing bullet block joins the run so the first bullet is not
          // visually segmented from its continuations.
          if (stepBlocks.length > 1) {
            const head = document.createElement('div');
            const visible = i <= stepIndex;
            head.className = animated
              ? `${id}-block${visible ? ' visible' : ''}`
              : `${id}-block${visible ? ' instant' : ''}`;
            if (animated && visible) head.style.transitionDelay = `${i * 80}ms`;
            for (let b = 0; b < stepBlocks.length - 1; b++) {
              head.appendChild(renderBlock(stepBlocks[b]));
            }
            wrap.appendChild(head);
          }
          wrap.appendChild(renderBulletRun(slideSteps, i, end, stepIndex, animated));
          i = end;
          continue;
        }
      }
      const slot = document.createElement('div');
      const visible = i <= stepIndex;
      slot.className = animated
        ? `${id}-block${visible ? ' visible' : ''}`
        : `${id}-block${visible ? ' instant' : ''}`;
      if (animated && visible) slot.style.transitionDelay = `${i * 80}ms`;
      for (const block of stepBlocks) slot.appendChild(renderBlock(block));
      wrap.appendChild(slot);
      i++;
    }

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
