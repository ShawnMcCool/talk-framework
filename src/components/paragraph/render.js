// src/components/paragraph/render.js

/**
 * Render a paragraph (or muted paragraph) block.
 *
 * @param {{ text: string, muted?: boolean }} data
 * @param {{ classPrefix: string }} renderContext
 * @returns {HTMLElement}
 */
export function renderParagraph(data, renderContext) {
  const el = document.createElement('p');
  el.className = `${renderContext.classPrefix}-text${data.muted ? ' muted' : ''}`;
  el.textContent = data.text;
  return el;
}
