// src/components/bullet-list/render.js

/**
 * Render a bullet list. Items may nest via `depth` (0 = top-level,
 * 1 = first sub-level, etc). A deeper item nests inside the last `<li>`
 * of its parent level.
 *
 * @param {{ items: Array<{ text: string, depth?: number }>, accent?: string }} data
 * @param {{ classPrefix: string }} renderContext
 * @returns {HTMLElement}
 */
export function renderBulletList(data, renderContext) {
  const classPrefix = renderContext.classPrefix;
  const root = document.createElement('ul');
  root.className = `${classPrefix}-bullets`;
  // stack[i] is the <ul> at depth i.
  const stack = [root];

  for (const item of data.items) {
    const depth = Math.max(0, item.depth | 0);

    while (stack.length <= depth) {
      const parent = stack[stack.length - 1];
      let host = parent.lastElementChild;
      if (!host || host.tagName !== 'LI') {
        host = document.createElement('li');
        host.className = `${classPrefix}-empty-host`;
        parent.appendChild(host);
      }
      const sub = document.createElement('ul');
      sub.className = `${classPrefix}-bullets ${classPrefix}-bullets-sub`;
      host.appendChild(sub);
      stack.push(sub);
    }
    while (stack.length > depth + 1) stack.pop();

    const li = document.createElement('li');
    li.textContent = item.text;
    stack[stack.length - 1].appendChild(li);
  }

  return root;
}
