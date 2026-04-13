import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  lerp,
  tweenValueAt,
  createTimeline,
  timelineDuration,
  timelineValuesAt,
  timelineResolve,
} from './timeline.lib.js';

describe('lerp', () => {
  it('returns from at t=0', () => {
    assert.equal(lerp(10, 50, 0), 10);
  });

  it('returns to at t=1', () => {
    assert.equal(lerp(10, 50, 1), 50);
  });

  it('returns midpoint at t=0.5', () => {
    assert.equal(lerp(0, 100, 0.5), 50);
  });
});

describe('tweenValueAt', () => {
  const tween = { property: 'x', from: 0, to: 100, delay: 0, duration: 1000 };

  it('returns from before start (negative elapsed)', () => {
    assert.equal(tweenValueAt(tween, -100), 0);
  });

  it('returns from at elapsed=0', () => {
    assert.equal(tweenValueAt(tween, 0), 0);
  });

  it('returns interpolated value mid-tween', () => {
    assert.equal(tweenValueAt(tween, 500), 50);
  });

  it('returns to at elapsed=duration', () => {
    assert.equal(tweenValueAt(tween, 1000), 100);
  });

  it('clamps to "to" after duration', () => {
    assert.equal(tweenValueAt(tween, 2000), 100);
  });

  describe('with delay', () => {
    const delayed = { property: 'x', from: 0, to: 100, delay: 500, duration: 1000 };

    it('returns from before delay expires', () => {
      assert.equal(tweenValueAt(delayed, 0), 0);
    });

    it('returns from when delay just ends', () => {
      assert.equal(tweenValueAt(delayed, 500), 0);
    });

    it('returns interpolated value during tween after delay', () => {
      assert.equal(tweenValueAt(delayed, 1000), 50);
    });

    it('returns to when delay+duration reached', () => {
      assert.equal(tweenValueAt(delayed, 1500), 100);
    });
  });
});

describe('createTimeline', () => {
  it('wraps tweens in an object', () => {
    const tweens = [{ property: 'x', from: 0, to: 100, delay: 0, duration: 500 }];
    const timeline = createTimeline(tweens);
    assert.deepEqual(timeline.tweens, tweens);
  });
});

describe('timelineDuration', () => {
  it('returns max of delay+duration across all tweens', () => {
    const timeline = createTimeline([
      { property: 'a', from: 0, to: 1, delay: 0, duration: 500 },
      { property: 'b', from: 0, to: 1, delay: 200, duration: 800 },
    ]);
    assert.equal(timelineDuration(timeline), 1000);
  });
});

describe('timelineValuesAt', () => {
  const timeline = createTimeline([
    { property: 'x', from: 0, to: 100, delay: 0, duration: 1000 },
    { property: 'y', from: 50, to: 150, delay: 500, duration: 500 },
  ]);

  it('returns correct values at elapsed=500', () => {
    const values = timelineValuesAt(timeline, 500);
    assert.equal(values.x, 50);
    assert.equal(values.y, 50);
  });

  it('returns final clamped values at elapsed=2000', () => {
    const values = timelineValuesAt(timeline, 2000);
    assert.equal(values.x, 100);
    assert.equal(values.y, 150);
  });
});

describe('timelineResolve', () => {
  it('returns all final values at total duration', () => {
    const timeline = createTimeline([
      { property: 'x', from: 0, to: 100, delay: 0, duration: 1000 },
      { property: 'opacity', from: 0, to: 1, delay: 0, duration: 500 },
    ]);
    const resolved = timelineResolve(timeline);
    assert.equal(resolved.x, 100);
    assert.equal(resolved.opacity, 1);
  });
});
