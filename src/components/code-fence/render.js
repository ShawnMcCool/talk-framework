// src/components/code-fence/render.js
//
// Syntax highlighting via highlight.js is lazy-loaded. Eager-importing the
// bundle would pull it into every consumer of the component registry —
// including `talk lint`, which runs in Node without DOM or browser deps.
//
// First call to `renderCodeFence` with a language starts the import; the
// module cache makes subsequent calls synchronous. The DOM node returns
// immediately; highlighting paints in after hljs resolves.

let hljsPromise = null;

function loadHljs() {
  if (!hljsPromise) {
    hljsPromise = import('./highlight.js').then((m) => m.hljs);
  }
  return hljsPromise;
}

/**
 * Kick off the highlight.js bundle load eagerly. Call once from the deck
 * boot so the chunk arrives before the first code-fence renders, avoiding
 * the brief flash of plain (un-highlighted) code on scene mount.
 */
export function prefetchHighlighter() {
  loadHljs();
}

/**
 * Render a generic code block (any info-string that isn't claimed by a more
 * specific markdown-block component). When the language is registered with
 * highlight.js, the code is tokenized and emitted as spans with `.hljs-*`
 * classes; otherwise it renders as plain text.
 *
 * @param {{ code: string, language?: string }} data
 * @param {{ classPrefix: string }} renderContext
 * @returns {HTMLElement}
 */
export function renderCodeFence(data, renderContext) {
  const wrap = document.createElement('div');
  wrap.className = `${renderContext.classPrefix}-code`;
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = data.code;
  if (data.language) pre.dataset.language = data.language;
  pre.appendChild(code);
  wrap.appendChild(pre);

  if (data.language) {
    loadHljs().then((hljs) => {
      if (hljs.getLanguage(data.language)) {
        code.className = `language-${data.language} hljs`;
        hljs.highlightElement(code);
      }
    });
  }

  return wrap;
}
