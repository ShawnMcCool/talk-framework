import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateImageBlock } from './validate.lib.js';

test('clean block has no issues', () => {
  const issues = validateImageBlock({
    images: [{ src: 'a.png', alt: '' }, { src: 'b.svg', alt: 'b' }],
  });
  assert.deepEqual(issues, []);
});

test('flags missing src as error', () => {
  const issues = validateImageBlock({
    images: [{ src: '', alt: '' }],
    line: 5,
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'error');
  assert.match(issues[0].message, /missing src/);
  assert.equal(issues[0].line, 5);
});

test('warns on unsupported extension', () => {
  const issues = validateImageBlock({
    images: [{ src: 'thing.bmp', alt: '' }],
    line: 3,
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'warn');
  assert.match(issues[0].message, /unsupported extension/);
});

test('warns when there is no extension at all', () => {
  const issues = validateImageBlock({
    images: [{ src: 'noext', alt: '' }],
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'warn');
});

test('treats extension case-insensitively', () => {
  const issues = validateImageBlock({
    images: [{ src: 'thing.PNG', alt: '' }],
  });
  assert.deepEqual(issues, []);
});

test('reports file-not-found via oracle', () => {
  const oracle = {
    resolve: (src) => `/scene/${src}`,
    exists: (p) => p.endsWith('exists.png'),
  };
  const issues = validateImageBlock(
    { images: [{ src: 'missing.png', alt: '' }, { src: 'exists.png', alt: '' }], line: 7 },
    oracle,
  );
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'error');
  assert.match(issues[0].message, /file not found.*missing\.png/);
});

test('skips file-existence when oracle is absent', () => {
  const issues = validateImageBlock({
    images: [{ src: 'wherever.png', alt: '' }],
  });
  assert.deepEqual(issues, []);
});
