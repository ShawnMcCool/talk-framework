import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  tangentAtEnd,
  retractedTip,
  arrowheadPoints,
  curlControlPoint,
} from './curved-arrow.lib.js';

const approx = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

describe('tangentAtEnd', () => {
  it('returns a unit vector', () => {
    const t = tangentAtEnd({ x: 50, y: -80 }, { x: 100, y: 0 });
    assert.ok(approx(Math.hypot(t.x, t.y), 1));
  });

  it('for a symmetric upward curl, points down-right at the right-hand end', () => {
    // cp above midpoint; from (0,0) → to (100,0) with arcHeight 80.
    const t = tangentAtEnd({ x: 50, y: -80 }, { x: 100, y: 0 });
    assert.ok(t.x > 0 && t.y > 0, 'tangent should point right and down');
  });

  it('for a horizontal straight-line degenerate case, points along +x', () => {
    const t = tangentAtEnd({ x: 50, y: 0 }, { x: 100, y: 0 });
    assert.ok(approx(t.x, 1));
    assert.ok(approx(t.y, 0));
  });
});

describe('retractedTip', () => {
  it('moves the tip exactly `gap` pixels back along the tangent', () => {
    const tip = retractedTip({
      to: { x: 100, y: 0 },
      tangent: { x: 1, y: 0 },
      gap: 10,
    });
    assert.ok(approx(tip.x, 90));
    assert.ok(approx(tip.y, 0));
  });

  it('respects diagonal tangents', () => {
    const tangent = { x: Math.SQRT1_2, y: Math.SQRT1_2 }; // 45°
    const tip = retractedTip({
      to: { x: 100, y: 100 },
      tangent,
      gap: Math.SQRT2 * 10,
    });
    assert.ok(approx(tip.x, 90));
    assert.ok(approx(tip.y, 90));
  });
});

describe('arrowheadPoints', () => {
  it('places wings perpendicular to the tangent, equidistant from the back point', () => {
    const { w1, tip, w2 } = arrowheadPoints({
      tip: { x: 100, y: 0 },
      tangent: { x: 1, y: 0 },
      length: 10,
      halfWidth: 8,
    });
    // Back point is (90, 0); perpendicular is (0, 1) after 90° rotation.
    assert.ok(approx(w1.x, 90));
    assert.ok(approx(w1.y, 8));
    assert.ok(approx(w2.x, 90));
    assert.ok(approx(w2.y, -8));
    assert.deepEqual(tip, { x: 100, y: 0 });
  });

  it('wings are symmetric about the tip-to-back line', () => {
    const { w1, tip, w2 } = arrowheadPoints({
      tip: { x: 100, y: 100 },
      tangent: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
      length: 10,
      halfWidth: 8,
    });
    // Midpoint of w1 and w2 should equal the back point (tip minus tangent·length).
    const midX = (w1.x + w2.x) / 2;
    const midY = (w1.y + w2.y) / 2;
    const backX = tip.x - Math.SQRT1_2 * 10;
    const backY = tip.y - Math.SQRT1_2 * 10;
    assert.ok(approx(midX, backX));
    assert.ok(approx(midY, backY));
  });
});

describe('curlControlPoint', () => {
  it('lifts the chord midpoint by `arcHeight` (SVG y-down)', () => {
    const cp = curlControlPoint({ x: 0, y: 0 }, { x: 100, y: 0 }, 80);
    assert.deepEqual(cp, { x: 50, y: -80 });
  });

  it('works for non-horizontal chords', () => {
    const cp = curlControlPoint({ x: 0, y: 0 }, { x: 100, y: 100 }, 50);
    assert.deepEqual(cp, { x: 50, y: 0 }); // (0+100)/2 = 50; (0+100)/2 - 50 = 0
  });
});
