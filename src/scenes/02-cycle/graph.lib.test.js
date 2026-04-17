import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLIDE_STATES,
  TIMELINE_DOTS,
  isDotLit,
  diffEdges,
  diffNodes,
  NODE_POSITIONS,
} from './graph.lib.js';

describe('SLIDE_STATES', () => {
  it('has 6 slides', () => {
    assert.equal(SLIDE_STATES.length, 6);
  });

  it('slide 0 (Day 1) has 3 nodes', () => {
    assert.equal(SLIDE_STATES[0].nodes.length, 3);
  });

  it('slide 5 (Day 1 again) has same node set as slide 0', () => {
    assert.deepEqual(
      [...SLIDE_STATES[5].nodes].sort(),
      [...SLIDE_STATES[0].nodes].sort(),
    );
  });

  it('slide 5 has same edges as slide 0', () => {
    assert.deepEqual(SLIDE_STATES[5].edges, SLIDE_STATES[0].edges);
  });

  it('slide 4 (Rewrite) has the START OVER stamp', () => {
    assert.equal(SLIDE_STATES[4].stampStartOver, true);
  });

  it('slide 5 has timelineCurled=true; all earlier slides do not', () => {
    assert.equal(SLIDE_STATES[5].timelineCurled, true);
    for (let i = 0; i < 5; i++) {
      assert.ok(!SLIDE_STATES[i].timelineCurled, `slide ${i} must not be curled`);
    }
  });

  it('every node in every slide has a position defined', () => {
    for (const slide of SLIDE_STATES) {
      for (const name of slide.nodes) {
        assert.ok(NODE_POSITIONS[name], `missing position for node ${name}`);
      }
    }
  });

  it('every edge references only nodes present in the slide', () => {
    for (const [i, slide] of SLIDE_STATES.entries()) {
      const set = new Set(slide.nodes);
      for (const [a, b] of slide.edges) {
        assert.ok(set.has(a), `slide ${i}: edge references missing node ${a}`);
        assert.ok(set.has(b), `slide ${i}: edge references missing node ${b}`);
      }
    }
  });
});

describe('TIMELINE_DOTS', () => {
  it('has exactly 5 dots', () => {
    assert.equal(TIMELINE_DOTS.length, 5);
  });
});

describe('isDotLit', () => {
  it('slide 0: only excited lit', () => {
    assert.equal(isDotLit(0, 'excited'), true);
    assert.equal(isDotLit(0, 'shipping'), false);
    assert.equal(isDotLit(0, 'rewrite'), false);
  });

  it('slide 2: excited, shipping, friction lit', () => {
    assert.equal(isDotLit(2, 'excited'), true);
    assert.equal(isDotLit(2, 'shipping'), true);
    assert.equal(isDotLit(2, 'friction'), true);
    assert.equal(isDotLit(2, 'breakage'), false);
  });

  it('slide 4 (rewrite): all dots lit', () => {
    for (const name of TIMELINE_DOTS) {
      assert.equal(isDotLit(4, name), true, `${name} should be lit on slide 4`);
    }
  });

  it('slide 5 (curled): all dots lit', () => {
    for (const name of TIMELINE_DOTS) {
      assert.equal(isDotLit(5, name), true, `${name} should be lit on slide 5`);
    }
  });
});

describe('diffNodes', () => {
  it('returns arriving nodes from 0 → 1', () => {
    const diff = diffNodes(SLIDE_STATES[0], SLIDE_STATES[1]);
    const arriving = diff.filter((d) => !d.fromVisible && d.toVisible);
    assert.equal(arriving.length, 4);
  });

  it('returns leaving nodes from 4 → 5 (the big reset)', () => {
    const diff = diffNodes(SLIDE_STATES[4], SLIDE_STATES[5]);
    const leaving = diff.filter((d) => d.fromVisible && !d.toVisible);
    assert.ok(leaving.length > 5, 'many nodes leave on the reset');
  });
});

describe('diffEdges', () => {
  it('returns arriving edges from 0 → 1', () => {
    const diff = diffEdges(SLIDE_STATES[0], SLIDE_STATES[1]);
    const arriving = diff.filter((d) => !d.fromVisible && d.toVisible);
    assert.ok(arriving.length >= 5);
  });

  it('flags edges that turn red from slide 2 → 3', () => {
    const diff = diffEdges(SLIDE_STATES[2], SLIDE_STATES[3]);
    const turningRed = diff.filter((d) => !d.fromRed && d.toRed);
    assert.ok(turningRed.length > 0);
  });
});
