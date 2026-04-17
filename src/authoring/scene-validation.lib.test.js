import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateScenesLib } from './scene-validation.lib.js';

function validScene(overrides = {}) {
  return {
    title: 'Test',
    slides: [{ stepCount: 1 }],
    init() {},
    destroy() {},
    resolveToSlide() {},
    animateToSlide() {},
    ...overrides,
  };
}

describe('validateScenesLib', () => {
  it('returns no reports for a valid scene', () => {
    assert.deepEqual(validateScenesLib([validScene()]), []);
  });

  it('flags a missing title', () => {
    const r = validateScenesLib([validScene({ title: '' })]);
    assert.equal(r.length, 1);
    assert.ok(r[0].issues.some(i => i.includes('title')));
  });

  it('flags a missing lifecycle method', () => {
    const s = validScene();
    delete s.destroy;
    const r = validateScenesLib([s]);
    assert.ok(r[0].issues.some(i => i.includes('destroy')));
  });

  it('flags empty or non-array slides', () => {
    assert.ok(validateScenesLib([validScene({ slides: [] })])[0].issues[0].includes('empty'));
    assert.ok(validateScenesLib([validScene({ slides: null })])[0].issues[0].includes('array'));
  });

  it('flags invalid stepCount on a slide', () => {
    const r = validateScenesLib([validScene({ slides: [{ stepCount: 0 }] })]);
    assert.ok(r[0].issues[0].includes('stepCount'));
  });

  it('skips non-object scenes gracefully', () => {
    const r = validateScenesLib([null, undefined]);
    assert.equal(r.length, 2);
  });

  it('reports only scenes with issues', () => {
    const r = validateScenesLib([validScene(), validScene({ title: '' }), validScene()]);
    assert.equal(r.length, 1);
    assert.equal(r[0].sceneIndex, 1);
  });
});
