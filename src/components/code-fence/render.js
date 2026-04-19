// src/components/code-fence/render.js

/**
 * Render a generic code block (any info-string that isn't claimed by a more
 * specific markdown-block component).
 *
 * @param {{ code: string, language?: string }} data
 * @param {{ classPrefix: string }} renderContext
 * @returns {HTMLElement}
 */
export function renderCodeFence(data, renderContext) {
  const wrap = document.createElement('div');
  wrap.className = `${renderContext.classPrefix}-code`;
  const pre = document.createElement('pre');
  pre.textContent = data.code;
  if (data.language) pre.dataset.language = data.language;
  wrap.appendChild(pre);
  return wrap;
}
