import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeck,
  createPosition,
  next,
  prev,
  goToScene,
  isRapidInput,
  sceneChanged,
} from './engine.lib.js';

const deck = createDeck([
  { title: 'A', slides: [{ stepCount: 2 }, { stepCount: 1 }] },
  { title: 'B', slides: [{ stepCount: 3 }] },
]);

describe('createDeck', () => {
  it('creates scenes from scene definitions', () => {
    assert.equal(deck.scenes.length, 2);
    assert.equal(deck.scenes[0].title, 'A');
    assert.equal(deck.scenes[1].title, 'B');
    assert.equal(deck.scenes[0].slides.length, 2);
    assert.equal(deck.scenes[0].slides[0].stepCount, 2);
    assert.equal(deck.scenes[1].slides[0].stepCount, 3);
  });
});

describe('createPosition', () => {
  it('returns position at origin', () => {
    assert.deepEqual(createPosition(), { sceneIndex: 0, slideIndex: 0, stepIndex: 0 });
  });
});

describe('next', () => {
  it('(0,0,0) → (0,0,1) — advance step within slide', () => {
    assert.deepEqual(
      next({ sceneIndex: 0, slideIndex: 0, stepIndex: 0 }, deck),
      { sceneIndex: 0, slideIndex: 0, stepIndex: 1 }
    );
  });

  it('(0,0,1) → (0,1,0) — advance to next slide when steps exhausted', () => {
    assert.deepEqual(
      next({ sceneIndex: 0, slideIndex: 0, stepIndex: 1 }, deck),
      { sceneIndex: 0, slideIndex: 1, stepIndex: 0 }
    );
  });

  it('(0,1,0) → (1,0,0) — advance to next scene when slides exhausted', () => {
    assert.deepEqual(
      next({ sceneIndex: 0, slideIndex: 1, stepIndex: 0 }, deck),
      { sceneIndex: 1, slideIndex: 0, stepIndex: 0 }
    );
  });

  it('(1,0,2) → (1,0,2) — stays at end of deck', () => {
    assert.deepEqual(
      next({ sceneIndex: 1, slideIndex: 0, stepIndex: 2 }, deck),
      { sceneIndex: 1, slideIndex: 0, stepIndex: 2 }
    );
  });
});

describe('prev', () => {
  it('(0,0,1) → (0,0,0) — back a step', () => {
    assert.deepEqual(
      prev({ sceneIndex: 0, slideIndex: 0, stepIndex: 1 }, deck),
      { sceneIndex: 0, slideIndex: 0, stepIndex: 0 }
    );
  });

  it('(0,1,0) → (0,0,1) — back to previous slide last step', () => {
    assert.deepEqual(
      prev({ sceneIndex: 0, slideIndex: 1, stepIndex: 0 }, deck),
      { sceneIndex: 0, slideIndex: 0, stepIndex: 1 }
    );
  });

  it('(1,0,0) → (0,1,0) — back to previous scene last slide last step', () => {
    assert.deepEqual(
      prev({ sceneIndex: 1, slideIndex: 0, stepIndex: 0 }, deck),
      { sceneIndex: 0, slideIndex: 1, stepIndex: 0 }
    );
  });

  it('(0,0,0) → (0,0,0) — stays at start', () => {
    assert.deepEqual(
      prev({ sceneIndex: 0, slideIndex: 0, stepIndex: 0 }, deck),
      { sceneIndex: 0, slideIndex: 0, stepIndex: 0 }
    );
  });
});

describe('goToScene', () => {
  it('goToScene(1, deck) → (1,0,0)', () => {
    assert.deepEqual(goToScene(1, deck), { sceneIndex: 1, slideIndex: 0, stepIndex: 0 });
  });

  it('goToScene(99, deck) → (1,0,0) — clamps high', () => {
    assert.deepEqual(goToScene(99, deck), { sceneIndex: 1, slideIndex: 0, stepIndex: 0 });
  });

  it('goToScene(-1, deck) → (0,0,0) — clamps low', () => {
    assert.deepEqual(goToScene(-1, deck), { sceneIndex: 0, slideIndex: 0, stepIndex: 0 });
  });
});

describe('isRapidInput', () => {
  it('[100, 200] → false (fewer than 3)', () => {
    assert.equal(isRapidInput([100, 200]), false);
  });

  it('[100, 250, 400] with threshold 200 → true', () => {
    assert.equal(isRapidInput([100, 250, 400], 200), true);
  });

  it('[100, 400, 900] with threshold 200 → false', () => {
    assert.equal(isRapidInput([100, 400, 900], 200), false);
  });

  it('[0, 1000, 2000, 2100, 2200] with threshold 200 → true (only last 3)', () => {
    assert.equal(isRapidInput([0, 1000, 2000, 2100, 2200], 200), true);
  });
});

describe('sceneChanged', () => {
  it('(sceneIndex: 0) to (sceneIndex: 1) → true', () => {
    assert.equal(
      sceneChanged({ sceneIndex: 0, slideIndex: 0, stepIndex: 0 }, { sceneIndex: 1, slideIndex: 0, stepIndex: 0 }),
      true
    );
  });

  it('(sceneIndex: 0) to (sceneIndex: 0) → false', () => {
    assert.equal(
      sceneChanged({ sceneIndex: 0, slideIndex: 0, stepIndex: 0 }, { sceneIndex: 0, slideIndex: 1, stepIndex: 0 }),
      false
    );
  });
});
