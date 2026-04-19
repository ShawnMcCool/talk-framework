// src/authoring/last-good-cache.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLastGoodCache } from './last-good-cache.js';

test('cache retrieves a stored entry by sceneId', () => {
  const cache = createLastGoodCache();
  const entry = { dom: {}, ctx: {} };
  cache.set('scene-1', entry);
  assert.equal(cache.get('scene-1'), entry);
});

test('cache returns undefined for unknown sceneId', () => {
  const cache = createLastGoodCache();
  assert.equal(cache.get('missing'), undefined);
});

test('cache overwrites a stored entry', () => {
  const cache = createLastGoodCache();
  cache.set('s', { v: 1 });
  cache.set('s', { v: 2 });
  assert.deepEqual(cache.get('s'), { v: 2 });
});
