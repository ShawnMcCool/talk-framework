// src/components/spacer/render.js

/**
 * Render a vertical spacer. `size` is an opaque string token (`md`, `lg`).
 *
 * @param {{ size?: string }} data
 * @param {{ classPrefix: string }} renderContext
 * @returns {HTMLElement}
 */
export function renderSpacer(data, renderContext) {
  const el = document.createElement('div');
  el.className = `${renderContext.classPrefix}-spacer`;
  el.dataset.size = data.size || 'md';
  return el;
}
