// src/components/bullet-list/render.js

/**
 * Render a bullet list.
 *
 * @param {{ items: string[], accent?: string }} data
 * @param {{ classPrefix: string }} renderContext
 * @returns {HTMLElement}
 */
export function renderBulletList(data, renderContext) {
  const ul = document.createElement('ul');
  ul.className = `${renderContext.classPrefix}-bullets`;
  for (const item of data.items) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  }
  return ul;
}
