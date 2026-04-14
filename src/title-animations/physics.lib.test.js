import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, simulateStep, computeRestState, DEFAULT_CONFIG } from './physics.lib.js';

describe('createInitialState', () => {
  it('starts at configured startY with zero velocity', () => {
    const state = createInitialState();
    assert.equal(state.y, DEFAULT_CONFIG.startY);
    assert.equal(state.vy, 0);
    assert.equal(state.settled, false);
  });
});

describe('simulateStep', () => {
  it('applies gravity to move object downward', () => {
    const state = createInitialState();
    const next = simulateStep(state, 0.016);
    assert.ok(next.y < state.y, 'y should decrease');
    assert.ok(next.vy > 0, 'downward velocity should increase');
  });

  it('stops dead on ground contact', () => {
    const state = { ...createInitialState(), y: -2.4, vy: 10 };
    const next = simulateStep(state, 0.016);
    assert.equal(next.y, DEFAULT_CONFIG.groundY);
    assert.equal(next.vy, 0);
    assert.equal(next.settled, true);
    assert.equal(next.justLanded, true);
    assert.ok(next.impactVelocity > 0);
  });

  it('does not change settled state once settled', () => {
    const state = computeRestState();
    const next = simulateStep(state, 0.016);
    assert.equal(next.settled, true);
    assert.equal(next.justLanded, false);
  });

  it('settles via maxDuration timeout', () => {
    const config = { ...DEFAULT_CONFIG, gravity: 1, maxDuration: 0.1 };
    let state = createInitialState(config);
    for (let i = 0; i < 20; i++) {
      state = simulateStep(state, 0.016, config);
    }
    assert.equal(state.settled, true);
    assert.equal(state.y, config.groundY);
  });

  it('falls and lands in a reasonable time', () => {
    let state = createInitialState();
    for (let i = 0; i < 200; i++) {
      state = simulateStep(state, 0.008);
      if (state.settled) break;
    }
    assert.equal(state.settled, true);
    assert.ok(state.elapsed < 1.5, `should land within 1.5s, took ${state.elapsed}s`);
  });
});

describe('computeRestState', () => {
  it('returns deterministic end state at ground level', () => {
    const rest = computeRestState();
    assert.equal(rest.y, DEFAULT_CONFIG.groundY);
    assert.equal(rest.settled, true);
  });
});
