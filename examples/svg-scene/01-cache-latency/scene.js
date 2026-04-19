// Cache latency — a horizontal bar chart in SVG that reveals the memory
// hierarchy one tier at a time. Drawn to scale: L1 at 1ns is a thin sliver,
// main memory at 100ns fills the whole chart. The point lands viscerally
// the moment the last bar animates in.
//
// This example exercises more of `createSvgScene` than a simple dot demo:
// `<text>` labels, a baseline axis, and a multi-property timeline that
// stagger-animates bar width and opacity together.

import { createSvgScene } from '/@fs/app/src/components/svg-scene/scene-factory.js';
import { colors } from '/@fs/app/src/shared/colors.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Bars are drawn to linear scale: width in SVG units = nanoseconds × 9.
// Main memory at 100ns occupies the full 900-unit chart area.
const BAR_X = 60;
const BAR_MAX_WIDTH = 900;
const BAR_HEIGHT = 80;
const BAR_ROWS_Y = [150, 270, 390];
const SCALE_Y = 510;

const ENTRIES = [
  { label: 'L1 cache',    time: '1 ns',   width: 9,   fill: colors.green },
  { label: 'L2 cache',    time: '4 ns',   width: 36,  fill: colors.beam },
  { label: 'Main memory', time: '100 ns', width: 900, fill: colors.accentWarm },
];

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function text(content, attrs = {}) {
  const node = el('text', {
    'font-family': 'system-ui, -apple-system, sans-serif',
    fill: colors.textMuted,
    ...attrs,
  });
  node.textContent = content;
  return node;
}

export const cacheLatency = createSvgScene({
  title: 'Cache latency',
  slides: [{ stepCount: 3 }],
  background: colors.bg,

  setup({ svg }) {
    // Heading.
    svg.appendChild(text('Latency isn\u2019t free', {
      x: 500, y: 70, 'text-anchor': 'middle',
      fill: colors.text, 'font-size': 30, 'font-weight': 600,
    }));

    // Axis baseline with 0 / 100ns markers.
    svg.appendChild(el('line', {
      x1: BAR_X, x2: BAR_X + BAR_MAX_WIDTH,
      y1: SCALE_Y, y2: SCALE_Y,
      stroke: colors.textMuted, 'stroke-width': 1, opacity: 0.4,
    }));
    svg.appendChild(text('0 ns', {
      x: BAR_X, y: SCALE_Y + 26, 'text-anchor': 'start', 'font-size': 14,
    }));
    svg.appendChild(text('100 ns', {
      x: BAR_X + BAR_MAX_WIDTH, y: SCALE_Y + 26, 'text-anchor': 'end', 'font-size': 14,
    }));

    // Bars + labels.
    const bars = ENTRIES.map((entry, i) => {
      const rect = el('rect', {
        x: BAR_X, y: BAR_ROWS_Y[i],
        width: 0, height: BAR_HEIGHT,
        rx: 6, ry: 6,
        fill: entry.fill, opacity: 0,
      });
      const label = text(`${entry.label}  ·  ${entry.time}`, {
        x: BAR_X, y: BAR_ROWS_Y[i] - 12,
        'text-anchor': 'start',
        fill: colors.text, 'font-size': 20, 'font-weight': 500,
        opacity: 0,
      });
      svg.appendChild(rect);
      svg.appendChild(label);
      return { rect, label, target: entry.width };
    });

    return { bars };
  },

  resolveStep({ bars }, { stepIndex }) {
    bars.forEach((b, i) => {
      const visible = i <= stepIndex;
      b.rect.setAttribute('width', visible ? String(b.target) : '0');
      b.rect.setAttribute('opacity', visible ? '1' : '0');
      b.label.setAttribute('opacity', visible ? '1' : '0');
    });
  },

  animateStep({ bars }, { stepIndex, playTimeline, done }) {
    const fromW = bars.map((b) => Number(b.rect.getAttribute('width')));
    const fromO = bars.map((b) => Number(b.rect.getAttribute('opacity')));
    const toW = bars.map((b, i) => (i <= stepIndex ? b.target : 0));
    const toO = bars.map((_, i) => (i <= stepIndex ? 1 : 0));

    const tweens = bars.flatMap((_, i) => [
      { property: `w${i}`, from: fromW[i], to: toW[i], delay: i * 140, duration: 650 },
      { property: `o${i}`, from: fromO[i], to: toO[i], delay: i * 140, duration: 350 },
    ]);

    playTimeline(
      tweens,
      (v) => {
        bars.forEach((b, i) => {
          b.rect.setAttribute('width', String(v[`w${i}`]));
          b.rect.setAttribute('opacity', String(v[`o${i}`]));
          b.label.setAttribute('opacity', String(v[`o${i}`]));
        });
      },
      done,
    );
  },
});
