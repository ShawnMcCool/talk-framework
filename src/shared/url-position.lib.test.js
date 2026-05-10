import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery, buildQuery } from './url-position.lib.js';

test('parseQuery: empty input → null', () => {
  assert.equal(parseQuery(''), null);
  assert.equal(parseQuery('?'), null);
});

test('parseQuery: param missing → null', () => {
  assert.equal(parseQuery('?other=foo'), null);
});

test('parseQuery: empty p value → null', () => {
  assert.equal(parseQuery('?p='), null);
});

test('parseQuery: folder only', () => {
  assert.deepEqual(
    parseQuery('?p=04-images'),
    { folder: '04-images', slideIndex: 0, stepIndex: 0 },
  );
});

test('parseQuery: folder + slide', () => {
  assert.deepEqual(
    parseQuery('?p=04-images.2'),
    { folder: '04-images', slideIndex: 1, stepIndex: 0 },
  );
});

test('parseQuery: folder + slide + step', () => {
  assert.deepEqual(
    parseQuery('?p=04-images.2.3'),
    { folder: '04-images', slideIndex: 1, stepIndex: 2 },
  );
});

test('parseQuery: tolerant of missing leading "?"', () => {
  assert.deepEqual(
    parseQuery('p=04-images.2'),
    { folder: '04-images', slideIndex: 1, stepIndex: 0 },
  );
});

test('parseQuery: ignores unrelated params', () => {
  assert.deepEqual(
    parseQuery('?other=foo&p=04-images&more=bar'),
    { folder: '04-images', slideIndex: 0, stepIndex: 0 },
  );
});

test('parseQuery: rejects non-integer or sub-1 slide', () => {
  assert.equal(parseQuery('?p=04-images.bogus'), null);
  assert.equal(parseQuery('?p=04-images.0'), null);
  assert.equal(parseQuery('?p=04-images.-1'), null);
});

test('parseQuery: rejects non-integer or sub-1 step', () => {
  assert.equal(parseQuery('?p=04-images.2.bogus'), null);
  assert.equal(parseQuery('?p=04-images.2.0'), null);
  assert.equal(parseQuery('?p=04-images.2.-1'), null);
});

test('parseQuery: non-string input → null', () => {
  assert.equal(parseQuery(null), null);
  assert.equal(parseQuery(undefined), null);
  assert.equal(parseQuery(42), null);
});

test('buildQuery: folder only when slide and step are defaults', () => {
  assert.equal(
    buildQuery({ folder: '04-images', slideIndex: 0, stepIndex: 0 }),
    '?p=04-images',
  );
});

test('buildQuery: slide segment appears for non-default slide', () => {
  assert.equal(
    buildQuery({ folder: '04-images', slideIndex: 1, stepIndex: 0 }),
    '?p=04-images.2',
  );
});

test('buildQuery: step segment forces slide segment too (positional)', () => {
  assert.equal(
    buildQuery({ folder: '04-images', slideIndex: 0, stepIndex: 1 }),
    '?p=04-images.1.2',
  );
});

test('buildQuery: full triple', () => {
  assert.equal(
    buildQuery({ folder: '04-images', slideIndex: 1, stepIndex: 2 }),
    '?p=04-images.2.3',
  );
});

test('buildQuery: missing folder → empty string', () => {
  assert.equal(buildQuery({ slideIndex: 0, stepIndex: 0 }), '');
  assert.equal(buildQuery({ folder: '', slideIndex: 1, stepIndex: 1 }), '');
  assert.equal(buildQuery(), '');
});

test('parseQuery(buildQuery(p)) is identity for representative positions', () => {
  for (const p of [
    { folder: '01-intro', slideIndex: 0, stepIndex: 0 },
    { folder: '04-images', slideIndex: 1, stepIndex: 2 },
    { folder: '02-foo-bar', slideIndex: 0, stepIndex: 4 },
    { folder: '10-something-long-and-hyphenated', slideIndex: 5, stepIndex: 7 },
  ]) {
    assert.deepEqual(parseQuery(buildQuery(p)), p);
  }
});
