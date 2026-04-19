// src/components/heading/render.js

/**
 * Produce a DOM node for a heading block.
 *
 * @param {{ text: string, level: number, accent?: string }} data
 * @param {{ classPrefix: string }} renderContext  class prefix for scoped CSS
 * @returns {HTMLElement}
 */
export function renderHeading(data, renderContext) {
  const el = document.createElement('div');
  el.className = `${renderContext.classPrefix}-heading`;
  el.dataset.level = String(data.level || 1);
  el.textContent = data.text;
  if (data.accent) el.style.color = data.accent;
  return el;
}
