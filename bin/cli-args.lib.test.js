import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFlags, printPlan } from './cli-args.lib.js';

test('parseFlags extracts --dry-run', () => {
  const result = parseFlags(['foo', '--dry-run', 'bar']);
  assert.equal(result.dryRun, true);
  assert.deepEqual(result.positional, ['foo', 'bar']);
});

test('parseFlags extracts --first and --after N', () => {
  const r1 = parseFlags(['x', '--first']);
  assert.equal(r1.first, true);
  const r2 = parseFlags(['x', '--after', '3']);
  assert.equal(r2.after, 3);
});

test('parseFlags rejects --after without a value', () => {
  assert.throws(() => parseFlags(['x', '--after']), /--after/);
});

test('parseFlags rejects --after with a non-integer', () => {
  assert.throws(() => parseFlags(['x', '--after', 'foo']), /--after/);
});

test('printPlan formats rename + create + remove sections', () => {
  const lines = [];
  const out = (s) => lines.push(s);
  printPlan({
    renames: [{ from: '03-a', to: '02-a' }],
    creates: ['04-new'],
    removes: ['02-old'],
  }, out);
  const joined = lines.join('\n');
  assert.match(joined, /03-a → 02-a/);
  assert.match(joined, /\+ 04-new/);
  assert.match(joined, /- 02-old/);
});

test('printPlan handles empty plans', () => {
  const lines = [];
  printPlan({ renames: [], creates: [], removes: [] }, (s) => lines.push(s));
  assert.match(lines.join('\n'), /no changes/i);
});
