import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImageOnlyParagraph } from './parse.lib.js';

test('returns null for plain text', () => {
  assert.equal(parseImageOnlyParagraph('Just some words.'), null);
});

test('returns null for empty input', () => {
  assert.equal(parseImageOnlyParagraph(''), null);
  assert.equal(parseImageOnlyParagraph('   '), null);
});

test('parses a single image-only paragraph', () => {
  assert.deepEqual(
    parseImageOnlyParagraph('![a cat](cat.png)'),
    [{ alt: 'a cat', src: 'cat.png' }],
  );
});

test('parses three images separated by whitespace', () => {
  assert.deepEqual(
    parseImageOnlyParagraph('![](a.png) ![](b.png) ![](c.png)'),
    [
      { alt: '', src: 'a.png' },
      { alt: '', src: 'b.png' },
      { alt: '', src: 'c.png' },
    ],
  );
});

test('parses three images separated by newlines (joined with spaces)', () => {
  // The slide-body parser joins multi-line paragraphs with single spaces,
  // so consecutive `![]()` lines arrive here as one space-separated string.
  assert.deepEqual(
    parseImageOnlyParagraph('![client](client.png) ![api](api.png) ![db](db.png)'),
    [
      { alt: 'client', src: 'client.png' },
      { alt: 'api', src: 'api.png' },
      { alt: 'db', src: 'db.png' },
    ],
  );
});

test('rejects mixed text + image', () => {
  assert.equal(parseImageOnlyParagraph('Look at this ![](a.png) right here'), null);
});

test('rejects html mixed with image', () => {
  assert.equal(parseImageOnlyParagraph('<span>x</span> ![](a.png)'), null);
});

test('handles leading-slash content-root paths in src', () => {
  assert.deepEqual(
    parseImageOnlyParagraph('![logo](/images/logo.svg)'),
    [{ alt: 'logo', src: '/images/logo.svg' }],
  );
});

test('preserves alt text with spaces and punctuation', () => {
  assert.deepEqual(
    parseImageOnlyParagraph('![A diagram of the system, v2](diagram.png)'),
    [{ alt: 'A diagram of the system, v2', src: 'diagram.png' }],
  );
});

test('rejects malformed image (missing src)', () => {
  assert.equal(parseImageOnlyParagraph('![alt]()'), null);
});

test('rejects markdown link (not an image)', () => {
  assert.equal(parseImageOnlyParagraph('[a link](http://example.com)'), null);
});
