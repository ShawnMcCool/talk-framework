import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseSvgDimensions } from './svg-dimensions.lib.js';

test('extracts dimensions from viewBox', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480"><rect/></svg>';
  assert.deepEqual(parseSvgDimensions(svg), { width: 800, height: 480 });
});

test('viewBox with comma separators and decimals', () => {
  const svg = '<svg viewBox="0,0,12.5,7.25"></svg>';
  assert.deepEqual(parseSvgDimensions(svg), { width: 12.5, height: 7.25 });
});

test('viewBox with whitespace padding around numbers', () => {
  const svg = '<svg viewBox="  0   0   100   50  "></svg>';
  assert.deepEqual(parseSvgDimensions(svg), { width: 100, height: 50 });
});

test('falls back to numeric width/height when viewBox absent', () => {
  const svg = '<svg width="640" height="360"></svg>';
  assert.deepEqual(parseSvgDimensions(svg), { width: 640, height: 360 });
});

test('strips px unit from width/height', () => {
  const svg = '<svg width="640px" height="360px"></svg>';
  assert.deepEqual(parseSvgDimensions(svg), { width: 640, height: 360 });
});

test('rejects percentage width/height (no fixed ratio)', () => {
  const svg = '<svg width="100%" height="50%"></svg>';
  assert.equal(parseSvgDimensions(svg), null);
});

test('viewBox preferred over width/height when both present', () => {
  const svg = '<svg viewBox="0 0 800 480" width="100" height="50"></svg>';
  assert.deepEqual(parseSvgDimensions(svg), { width: 800, height: 480 });
});

test('returns null when neither viewBox nor width/height present', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
  assert.equal(parseSvgDimensions(svg), null);
});

test('returns null for non-SVG input', () => {
  assert.equal(parseSvgDimensions('<html></html>'), null);
  assert.equal(parseSvgDimensions(''), null);
  assert.equal(parseSvgDimensions('not an svg'), null);
});

test('returns null for non-string input without throwing', () => {
  assert.equal(parseSvgDimensions(null), null);
  assert.equal(parseSvgDimensions(undefined), null);
  assert.equal(parseSvgDimensions(42), null);
});

test('handles single-quoted attribute values', () => {
  const svg = "<svg viewBox='0 0 200 100'></svg>";
  assert.deepEqual(parseSvgDimensions(svg), { width: 200, height: 100 });
});

test('returns null when viewBox numbers are non-finite', () => {
  const svg = '<svg viewBox="0 0 NaN 100"></svg>';
  assert.equal(parseSvgDimensions(svg), null);
});

test('returns null when viewBox dimensions are zero or negative', () => {
  assert.equal(parseSvgDimensions('<svg viewBox="0 0 0 100"></svg>'), null);
  assert.equal(parseSvgDimensions('<svg viewBox="0 0 100 -5"></svg>'), null);
});

test('returns null for malformed SVG without throwing', () => {
  assert.equal(parseSvgDimensions('<svg viewBox=oops'), null);
  assert.equal(parseSvgDimensions('<svg'), null);
});
