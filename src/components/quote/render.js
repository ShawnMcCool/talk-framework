// src/components/quote/render.js

/**
 * Render a blockquote with optional attribution.
 *
 * @param {{ text: string, attribution?: string }} data
 * @param {{ classPrefix: string }} renderContext
 * @returns {HTMLElement}
 */
export function renderQuote(data, renderContext) {
  const wrap = document.createElement('div');
  wrap.className = `${renderContext.classPrefix}-quote`;
  const p = document.createElement('p');
  p.textContent = data.text;
  wrap.appendChild(p);
  if (data.attribution) {
    const cite = document.createElement('cite');
    cite.textContent = `— ${data.attribution}`;
    wrap.appendChild(cite);
  }
  return wrap;
}
