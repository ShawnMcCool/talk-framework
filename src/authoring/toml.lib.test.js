import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseToml } from './toml.lib.js';

test('parses top-level string, number, bool', () => {
  const result = parseToml(`
title = "my talk"
year = 2026
draft = true
`);
  assert.deepEqual(result, { title: 'my talk', year: 2026, draft: true });
});

test('preserves numeric strings as strings', () => {
  const result = parseToml(`framework_version = "0.1"`);
  assert.equal(result.framework_version, '0.1');
  assert.equal(typeof result.framework_version, 'string');
});

test('parses a table', () => {
  const result = parseToml(`
title = "x"

[palette]
accent = "#aaccff"
bg = "#0a0a10"
`);
  assert.deepEqual(result, {
    title: 'x',
    palette: { accent: '#aaccff', bg: '#0a0a10' },
  });
});

test('ignores comments and blank lines', () => {
  const result = parseToml(`
# top comment
title = "x"   # trailing comment
# another
`);
  assert.deepEqual(result, { title: 'x' });
});

test('throws on unterminated string', () => {
  assert.throws(() => parseToml(`title = "abc`), /line 1/);
});

test('throws on missing equals', () => {
  assert.throws(() => parseToml(`title "abc"`), /line 1/);
});

test('throws on duplicate top-level key', () => {
  assert.throws(() => parseToml(`a = 1\na = 2`), /duplicate/i);
});

test('throws on duplicate key inside table', () => {
  assert.throws(() => parseToml(`[t]\na = 1\na = 2`), /duplicate/i);
});

test('throws on unknown value type', () => {
  assert.throws(() => parseToml(`x = [1,2,3]`), /line 1/);
});
