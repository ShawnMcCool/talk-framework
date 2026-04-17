// Pure geometry for quadratic-Bezier "curl" arrows.
// No DOM imports — safe to unit test.

/**
 * Unit tangent direction at the end of a quadratic Bezier `M * Q cp to`.
 * The derivative at t=1 is 2·(to - cp), so direction = (to - cp) normalized.
 */
export function tangentAtEnd(cp, to) {
  const dx = to.x - cp.x;
  const dy = to.y - cp.y;
  const mag = Math.hypot(dx, dy) || 1;
  return { x: dx / mag, y: dy / mag };
}

/**
 * Retract an endpoint `gap` pixels back along the incoming tangent — used to
 * stop a curve short of a target circle so an arrowhead tip lands *outside*
 * the circle instead of inside it.
 */
export function retractedTip({ to, tangent, gap }) {
  return {
    x: to.x - tangent.x * gap,
    y: to.y - tangent.y * gap,
  };
}

/**
 * Three points for an arrowhead pointing along `tangent`:
 * w1 → tip → w2. Draw as SVG `M w1 L tip L w2` (two strokes, no fill).
 */
export function arrowheadPoints({ tip, tangent, length, halfWidth }) {
  const backX = tip.x - tangent.x * length;
  const backY = tip.y - tangent.y * length;
  // Perpendicular to tangent (rotate 90°): (-ty, tx).
  const px = -tangent.y;
  const py = tangent.x;
  return {
    w1: { x: backX + px * halfWidth, y: backY + py * halfWidth },
    tip,
    w2: { x: backX - px * halfWidth, y: backY - py * halfWidth },
  };
}

/**
 * Control point for a symmetric upward arc between `from` and `to`.
 * In SVG coordinates, smaller y = higher on screen, so arcHeight is subtracted.
 */
export function curlControlPoint(from, to, arcHeight) {
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2 - arcHeight,
  };
}
