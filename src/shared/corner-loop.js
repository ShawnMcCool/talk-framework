import { colors } from './colors.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DOTS = ['excited', 'shipping', 'friction', 'breakage', 'rewrite'];
const DOT_LABELS = {
  excited: 'Excited',
  shipping: 'Shipping',
  friction: 'Friction',
  breakage: 'Breakage',
  rewrite: 'Rewrite',
};

/**
 * Singleton persistent overlay: a 5-dot loop (Excited → Rewrite → back) that
 * lives above the scene stage and outlives scene transitions.
 *
 * Usage:
 *   cornerLoop.show({ at: 'corner', highlight: 'friction', withQuestion: false });
 *   cornerLoop.animateTo({ at: 'center', withQuestion: true }, 800, () => {});
 *   cornerLoop.hide();
 *
 * The DOM element is created lazily on first show() and persists until hide().
 */

let root = null;      // outer positioned <div>
let svg = null;       // inner <svg>
let dotEls = {};      // { excited: <circle>, ... }
let labelEls = {};    // { excited: <text>, ... }
let questionEl = null;
let state = { visible: false, at: 'corner', highlight: null, withQuestion: false };

const VB_SIZE = 200;
const CENTER = VB_SIZE / 2;
const RADIUS = 60;

function ensureMounted() {
  if (root) return;

  root = document.createElement('div');
  root.id = 'corner-loop-root';
  root.style.cssText = [
    'position: fixed',
    'top: 24px',
    'right: 24px',
    'width: 140px',
    'height: 140px',
    'pointer-events: none',
    'z-index: 100',
    'opacity: 0',
    'transition: opacity 300ms ease, top 600ms cubic-bezier(0.4, 0, 0.2, 1), right 600ms cubic-bezier(0.4, 0, 0.2, 1), width 600ms cubic-bezier(0.4, 0, 0.2, 1), height 600ms cubic-bezier(0.4, 0, 0.2, 1)',
  ].join(';');

  svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VB_SIZE} ${VB_SIZE}`);
  svg.style.cssText = 'width:100%;height:100%;overflow:visible;';
  root.appendChild(svg);

  // Loop arc (a closed circle path)
  const loopPath = document.createElementNS(SVG_NS, 'circle');
  loopPath.setAttribute('cx', CENTER);
  loopPath.setAttribute('cy', CENTER);
  loopPath.setAttribute('r', RADIUS);
  loopPath.setAttribute('fill', 'none');
  loopPath.setAttribute('stroke', colors.textMuted);
  loopPath.setAttribute('stroke-width', '2');
  loopPath.setAttribute('opacity', '0.5');
  svg.appendChild(loopPath);

  // Arrowhead marker near the rewrite→excited transition
  const arrow = document.createElementNS(SVG_NS, 'path');
  const angle = -Math.PI / 2 - (Math.PI * 2 / 5) * 0.5;
  const ax = CENTER + Math.cos(angle) * RADIUS;
  const ay = CENTER + Math.sin(angle) * RADIUS;
  const arrowSize = 6;
  arrow.setAttribute('d', `M ${ax - arrowSize} ${ay - arrowSize} L ${ax + arrowSize} ${ay} L ${ax - arrowSize} ${ay + arrowSize} Z`);
  arrow.setAttribute('fill', colors.textMuted);
  arrow.setAttribute('opacity', '0.6');
  arrow.setAttribute('transform', `rotate(${(angle * 180 / Math.PI) + 90} ${ax} ${ay})`);
  svg.appendChild(arrow);

  // Dots around the loop
  DOTS.forEach((name, i) => {
    const theta = -Math.PI / 2 + (Math.PI * 2 / DOTS.length) * i;
    const x = CENTER + Math.cos(theta) * RADIUS;
    const y = CENTER + Math.sin(theta) * RADIUS;

    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    dot.setAttribute('r', '6');
    dot.setAttribute('fill', colors.textMuted);
    dot.setAttribute('opacity', '0.7');
    dot.style.transition = 'fill 300ms, opacity 300ms, r 300ms';
    svg.appendChild(dot);
    dotEls[name] = dot;

    const label = document.createElementNS(SVG_NS, 'text');
    const lx = CENTER + Math.cos(theta) * (RADIUS + 18);
    const ly = CENTER + Math.sin(theta) * (RADIUS + 18);
    label.setAttribute('x', lx);
    label.setAttribute('y', ly);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    label.setAttribute('font-size', '11');
    label.setAttribute('font-family', '-apple-system, sans-serif');
    label.setAttribute('fill', colors.textMuted);
    label.setAttribute('opacity', '0');
    label.style.transition = 'opacity 300ms';
    label.textContent = DOT_LABELS[name];
    svg.appendChild(label);
    labelEls[name] = label;
  });

  // Centered "?" (hidden by default)
  questionEl = document.createElementNS(SVG_NS, 'text');
  questionEl.setAttribute('x', CENTER);
  questionEl.setAttribute('y', CENTER);
  questionEl.setAttribute('text-anchor', 'middle');
  questionEl.setAttribute('dominant-baseline', 'central');
  questionEl.setAttribute('font-size', '48');
  questionEl.setAttribute('font-family', '-apple-system, sans-serif');
  questionEl.setAttribute('font-weight', '300');
  questionEl.setAttribute('fill', colors.accent);
  questionEl.setAttribute('opacity', '0');
  questionEl.style.transition = 'opacity 500ms';
  questionEl.textContent = '?';
  svg.appendChild(questionEl);

  document.body.appendChild(root);
}

function applyPosition(at) {
  if (at === 'corner') {
    root.style.top = '24px';
    root.style.right = '24px';
    root.style.left = '';
    root.style.bottom = '';
    root.style.transform = '';
    root.style.width = '140px';
    root.style.height = '140px';
  } else if (at === 'center') {
    root.style.top = '50%';
    root.style.left = '50%';
    root.style.right = '';
    root.style.bottom = '';
    root.style.transform = 'translate(-50%, -50%)';
    root.style.width = '420px';
    root.style.height = '420px';
  }
}

function applyHighlight(highlight) {
  DOTS.forEach((name) => {
    const isHi = name === highlight;
    dotEls[name].setAttribute('fill', isHi ? colors.accent : colors.textMuted);
    dotEls[name].setAttribute('opacity', isHi ? '1' : '0.7');
    dotEls[name].setAttribute('r', isHi ? '9' : '6');
    // Show labels only when at 'center' (see applyLabelVisibility)
  });
}

function applyLabelVisibility(at) {
  const visible = at === 'center';
  DOTS.forEach((name) => {
    labelEls[name].setAttribute('opacity', visible ? '0.9' : '0');
  });
}

function applyQuestion(withQuestion) {
  questionEl.setAttribute('opacity', withQuestion ? '0.9' : '0');
}

function applyAll() {
  applyPosition(state.at);
  applyHighlight(state.highlight);
  applyLabelVisibility(state.at);
  applyQuestion(state.withQuestion);
}

export const cornerLoop = {
  /**
   * Show the loop overlay. Idempotent — safe to call every scene init.
   * @param {{at?: 'corner'|'center', highlight?: string|null, withQuestion?: boolean}} opts
   */
  show({ at = 'corner', highlight = null, withQuestion = false } = {}) {
    ensureMounted();
    state = { visible: true, at, highlight, withQuestion };
    applyAll();
    // Force reflow before opacity transition triggers on first show.
    void root.offsetWidth;
    root.style.opacity = '1';
  },

  /** Hide the overlay (stays in DOM, just invisible). */
  hide() {
    if (!root) return;
    state.visible = false;
    root.style.opacity = '0';
  },

  /**
   * Animate a transition of any subset of state fields.
   * Calls `done` after the transition completes.
   */
  animateTo({ at, highlight, withQuestion } = {}, durationMs = 600, done = () => {}) {
    ensureMounted();
    if (at !== undefined) state.at = at;
    if (highlight !== undefined) state.highlight = highlight;
    if (withQuestion !== undefined) state.withQuestion = withQuestion;
    applyAll();
    setTimeout(done, durationMs);
  },

  /** For testing / teardown. */
  _reset() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    svg = null;
    dotEls = {};
    labelEls = {};
    questionEl = null;
    state = { visible: false, at: 'corner', highlight: null, withQuestion: false };
  },
};
