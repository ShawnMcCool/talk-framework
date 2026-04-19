// src/components/box-diagram/render.js
import { colors as defaultColors } from '../../shared/colors.js';

const ROLE_COLORS = {
  external: 'border',  // neutral
  accent:   'accent',  // cyan
  warm:     'accentWarm', // amber
};

/**
 * Render a parsed box-diagram into a DOM node.
 *
 * @param {{ section: string|null, nodes: Array, arrows: Array }} data
 * @param {{ classPrefix: string, colors?: object }} renderContext
 * @returns {HTMLElement}
 */
export function renderBoxDiagram(data, renderContext) {
  const c = { ...defaultColors, ...(renderContext.colors || {}) };
  const wrap = document.createElement('div');
  wrap.className = `${renderContext.classPrefix}-boxdiagram`;
  wrap.style.cssText = `
    display: flex; flex-direction: column; align-items: center;
    gap: 1rem; margin: 1.5rem 0;
    font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
  `;

  if (data.section) {
    const header = document.createElement('div');
    header.textContent = data.section;
    header.style.cssText = `
      font-size: 0.95rem; letter-spacing: 0.18em; text-transform: uppercase;
      color: ${c.textMuted || '#c8d4ee'}; margin-bottom: 0.4rem;
    `;
    wrap.appendChild(header);
  }

  const row = buildRow(data, c);
  wrap.appendChild(row);

  return wrap;
}

function buildRow(data, c) {
  const row = document.createElement('div');
  row.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 1.5rem;';

  // Chain: for a simple linear diagram, render nodes in declared order with
  // arrows between consecutive pairs that match a declared arrow. Otherwise
  // render all nodes in declared order and put arrows beneath as a fallback
  // list. (Linear chaining is enough for v1's boxes+arrows scope.)
  const nodeById = new Map(data.nodes.map(n => [n.id, n]));
  const used = new Set();
  const pairs = []; // [{ from, to, arrow }]
  for (const a of data.arrows) pairs.push(a);

  // Render each declared node, inserting an arrow between consecutive nodes
  // whenever an arrow's from/to matches.
  data.nodes.forEach((node, i) => {
    row.appendChild(buildBox(node, c));
    used.add(node.id);
    const next = data.nodes[i + 1];
    if (next) {
      const arrow = data.arrows.find(a => a.from === node.id && a.to === next.id);
      if (arrow) row.appendChild(buildArrow(arrow, c));
    }
  });

  return row;
}

function buildBox(node, c) {
  const accent =
    node.role === 'accent' ? (c.accent || '#6cb4d9') :
    node.role === 'warm'   ? (c.accentWarm || '#e4b36a') :
                             (c.border || '#888');

  const box = document.createElement('div');
  box.style.cssText = `
    border: 3px solid ${accent}; border-radius: 14px; padding: 1.4rem 2.2rem;
    min-width: 9rem; display: flex; flex-direction: column; align-items: center;
    background: ${c.bgDark || '#0a0a10'};
  `;

  const label = document.createElement('div');
  label.textContent = node.label;
  label.style.cssText = `font-size: 1.4rem; font-weight: 600; color: ${c.text || '#fff'};`;
  box.appendChild(label);

  if (node.subtitle) {
    const sub = document.createElement('div');
    sub.textContent = node.subtitle;
    sub.style.cssText = `font-size: 0.95rem; color: ${c.textMuted || '#c8d4ee'}; margin-top: 0.3rem;`;
    box.appendChild(sub);
  }

  return box;
}

function buildArrow(arrow, c) {
  const col = document.createElement('div');
  col.style.cssText = 'display: flex; flex-direction: column; align-items: center; min-width: 7rem;';

  const lbl = document.createElement('div');
  lbl.textContent = arrow.label;
  lbl.style.cssText = `font-size: 0.95rem; color: ${c.textMuted || '#c8d4ee'}; margin-bottom: 0.25rem;`;
  col.appendChild(lbl);

  const line = document.createElement('div');
  line.style.cssText = `
    width: 100%; height: 2px; background: ${c.border || '#888'}; position: relative;
  `;
  const head = document.createElement('span');
  head.style.cssText = `
    position: absolute; right: -2px; top: -5px;
    border-left: 10px solid ${c.border || '#888'};
    border-top: 6px solid transparent; border-bottom: 6px solid transparent;
  `;
  line.appendChild(head);
  col.appendChild(line);

  return col;
}
