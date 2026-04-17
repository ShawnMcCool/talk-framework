import { colors } from '../colors.js';
import {
  curlControlPoint,
  tangentAtEnd,
  retractedTip,
  arrowheadPoints,
} from './curved-arrow.lib.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function setAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

/**
 * A curled (quadratic-Bezier) arrow as an SVG <g> wrapping a <path> curve and
 * a <path> arrowhead. The arrowhead is tangent-oriented and positioned *outside*
 * the target circle (when `to.r` is supplied) so the tip is visually clear of it.
 *
 * Created hidden. Use `resolveVisible(true)` for an instant-on (e.g. palette
 * jump) or `reveal({ playTimeline, ... })` for a stroke-dasharray animation.
 *
 * @param {{
 *   from: { x: number, y: number },
 *   to:   { x: number, y: number, r?: number },
 *   arcHeight?: number,
 *   stroke?: string,
 *   strokeWidth?: number,
 *   tipGap?: number,
 *   arrowLen?: number,
 *   arrowHalfWidth?: number,
 * }} config
 */
export function createCurvedArrow(config) {
  const {
    from,
    to,
    arcHeight = 120,
    stroke = colors.accent,
    strokeWidth = 2.5,
    tipGap = 4,
    arrowLen = 10,
    arrowHalfWidth = 8,
  } = config;

  const cp = curlControlPoint(from, to, arcHeight);
  const tangent = tangentAtEnd(cp, to);
  const effGap = (to.r || 0) + tipGap;
  const tip = retractedTip({ to, tangent, gap: effGap });
  const { w1, w2 } = arrowheadPoints({
    tip,
    tangent,
    length: arrowLen,
    halfWidth: arrowHalfWidth,
  });

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('opacity', 0);

  const path = document.createElementNS(SVG_NS, 'path');
  setAttrs(path, {
    d: `M ${from.x} ${from.y} Q ${cp.x} ${cp.y} ${tip.x} ${tip.y}`,
    fill: 'none',
    stroke,
    'stroke-width': strokeWidth,
  });
  group.appendChild(path);

  const arrowhead = document.createElementNS(SVG_NS, 'path');
  setAttrs(arrowhead, {
    d: `M ${w1.x} ${w1.y} L ${tip.x} ${tip.y} L ${w2.x} ${w2.y}`,
    fill: 'none',
    stroke,
    'stroke-width': strokeWidth,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    opacity: 0,
  });
  group.appendChild(arrowhead);

  const totalLength = path.getTotalLength ? path.getTotalLength() : 0;

  function resolveVisible(visible) {
    if (visible) {
      group.setAttribute('opacity', 1);
      path.setAttribute('stroke-dasharray', '');
      path.setAttribute('stroke-dashoffset', '0');
      arrowhead.setAttribute('opacity', 1);
    } else {
      group.setAttribute('opacity', 0);
      arrowhead.setAttribute('opacity', 0);
    }
  }

  function reveal({ playTimeline, duration = 900, done = () => {} }) {
    group.setAttribute('opacity', 1);
    path.setAttribute('stroke-dasharray', totalLength);
    path.setAttribute('stroke-dashoffset', totalLength);
    arrowhead.setAttribute('opacity', 0);
    playTimeline(
      [{ property: 'off', from: totalLength, to: 0, delay: 0, duration }],
      (v) => path.setAttribute('stroke-dashoffset', v.off),
      () => {
        arrowhead.setAttribute('opacity', 1);
        done();
      },
    );
  }

  function destroy() {
    if (group.parentNode) group.parentNode.removeChild(group);
  }

  return { group, path, arrowhead, totalLength, resolveVisible, reveal, destroy };
}
