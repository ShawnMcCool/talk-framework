import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveImageUrl } from './resolve-path.lib.js';

test('scene-relative src under absolute base', () => {
  assert.equal(
    resolveImageUrl('diagram.png', '01-principles', '/'),
    '/content/01-principles/diagram.png',
  );
});

test('scene-relative src under project-pages base', () => {
  assert.equal(
    resolveImageUrl('diagram.png', '01-principles', '/talk-framework/'),
    '/talk-framework/content/01-principles/diagram.png',
  );
});

test('scene-relative src under relative base (Vite production default)', () => {
  assert.equal(
    resolveImageUrl('diagram.png', '01-principles', './'),
    'content/01-principles/diagram.png',
  );
});

test('leading-slash src resolves from content root', () => {
  assert.equal(
    resolveImageUrl('/shared/logo.png', '01-principles', '/'),
    '/content/shared/logo.png',
  );
});

test('leading-slash src ignores scene folder', () => {
  assert.equal(
    resolveImageUrl('/logo.png', 'whatever-scene', '/talk/'),
    '/talk/content/logo.png',
  );
});

test('throws on empty src', () => {
  assert.throws(() => resolveImageUrl('', 'scene', '/'), /non-empty string/);
});

test('handles missing baseUrl as absolute root', () => {
  assert.equal(
    resolveImageUrl('cat.png', 'scene', undefined),
    '/content/scene/cat.png',
  );
});

test('content-root scene (empty sceneFolder)', () => {
  assert.equal(
    resolveImageUrl('hero.png', '', '/'),
    '/content/hero.png',
  );
});
