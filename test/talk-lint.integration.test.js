// test/talk-lint.integration.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lintBin = path.join(__dirname, '..', 'bin', 'talk-lint.js');

function runLint(cwd) {
  return spawnSync('node', [lintBin], { cwd, encoding: 'utf8' });
}

test('clean fixture lints ok', () => {
  const dir = path.join(__dirname, 'fixtures', 'b-linter', 'ok');
  const r = runLint(dir);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /lint: ok/);
});

test('bad-box-diagram fixture reports undeclared-node error', () => {
  const dir = path.join(__dirname, 'fixtures', 'b-linter', 'bad-box-diagram');
  const r = runLint(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /undeclared node 'apii'/);
  assert.match(r.stdout, /did you mean 'api'/);
});
