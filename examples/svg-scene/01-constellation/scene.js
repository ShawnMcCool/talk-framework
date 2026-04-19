// Constellation — a minimal SVG scene built with `createSvgScene`.
//
// Step 0: one star visible.
// Step 1: second star fades in.
// Step 2: third star fades in and a line connects the first two.
//
// See examples/three-scene/01-rotating-cube/scene.js for an explanation of
// the `/@fs/` import prefix.

import { createSvgScene } from '/@fs/app/src/components/svg-scene/scene-factory.js';
import { colors } from '/@fs/app/src/shared/colors.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeStar(cx, cy, r, fill) {
  const el = document.createElementNS(SVG_NS, 'circle');
  el.setAttribute('cx', String(cx));
  el.setAttribute('cy', String(cy));
  el.setAttribute('r', String(r));
  el.setAttribute('fill', fill);
  el.setAttribute('opacity', '0');
  return el;
}

export const constellation = createSvgScene({
  title: 'Constellation',
  slides: [{ stepCount: 3 }],
  background: colors.bg,

  setup({ svg }) {
    const stars = [
      makeStar(300, 220, 14, colors.accent),
      makeStar(520, 360, 12, colors.beam),
      makeStar(740, 200, 16, colors.accentWarm),
    ];
    stars.forEach((s) => svg.appendChild(s));

    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', '300');
    line.setAttribute('y1', '220');
    line.setAttribute('x2', '520');
    line.setAttribute('y2', '360');
    line.setAttribute('stroke', colors.textMuted);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('opacity', '0');
    svg.appendChild(line);

    return { stars, line };
  },

  resolveStep({ stars, line }, { stepIndex }) {
    stars.forEach((s, i) => s.setAttribute('opacity', i <= stepIndex ? '1' : '0'));
    line.setAttribute('opacity', stepIndex >= 2 ? '1' : '0');
  },

  animateStep({ stars, line }, { stepIndex, playTimeline, done }) {
    const targetStars = stars.map((_, i) => (i <= stepIndex ? 1 : 0));
    const targetLine = stepIndex >= 2 ? 1 : 0;
    const fromStars = stars.map((s) => Number(s.getAttribute('opacity')));
    const fromLine = Number(line.getAttribute('opacity'));

    playTimeline(
      [
        { property: 's0', from: fromStars[0], to: targetStars[0], delay: 0,   duration: 400 },
        { property: 's1', from: fromStars[1], to: targetStars[1], delay: 120, duration: 400 },
        { property: 's2', from: fromStars[2], to: targetStars[2], delay: 240, duration: 400 },
        { property: 'l',  from: fromLine,     to: targetLine,     delay: 360, duration: 500 },
      ],
      ({ s0, s1, s2, l }) => {
        stars[0].setAttribute('opacity', String(s0));
        stars[1].setAttribute('opacity', String(s1));
        stars[2].setAttribute('opacity', String(s2));
        line.setAttribute('opacity', String(l));
      },
      done,
    );
  },
});
