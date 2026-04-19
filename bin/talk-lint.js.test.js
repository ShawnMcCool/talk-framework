import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function runLint(talkDir) {
  return spawnSync('node', [path.resolve('bin/talk-lint.js')], { cwd: talkDir, encoding: 'utf8' });
}

test('lint passes on the sample fixture', () => {
  const r = runLint(path.resolve('fixtures/sample-talk'));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ok/i);
});

test('lint fails on a folder with structural issues', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-lint-'));
  try {
    fs.cpSync(path.resolve('fixtures/sample-talk'), tmp, { recursive: true });
    // create a duplicate number (collision)
    fs.cpSync(path.join(tmp, '02-intro'), path.join(tmp, '02-duplicate'), { recursive: true });
    const r = runLint(tmp);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /duplicate/i);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('lint fails when talk.toml is missing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-lint-'));
  try {
    // no talk.toml
    const r = runLint(tmp);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /talk\.toml/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
