import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function copySample(dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.cpSync(path.resolve('fixtures/sample-talk'), dst, { recursive: true });
}
function runMove(args, cwd) {
  return spawnSync('node', [path.resolve('bin/talk-move.js'), ...args], { cwd, encoding: 'utf8' });
}

test('move 1 after 3 (last)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-move-'));
  try {
    copySample(tmp);
    const r = runMove(['1', 'after', '3'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-intro')));
    assert.ok(fs.existsSync(path.join(tmp, '02-outro')));
    assert.ok(fs.existsSync(path.join(tmp, '03-welcome')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('move 3 first', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-move-'));
  try {
    copySample(tmp);
    const r = runMove(['3', 'first'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-outro')));
    assert.ok(fs.existsSync(path.join(tmp, '02-welcome')));
    assert.ok(fs.existsSync(path.join(tmp, '03-intro')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('move 1 last', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-move-'));
  try {
    copySample(tmp);
    const r = runMove(['1', 'last'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-intro')));
    assert.ok(fs.existsSync(path.join(tmp, '02-outro')));
    assert.ok(fs.existsSync(path.join(tmp, '03-welcome')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('move 2 before 1 == move 2 first (same outcome)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-move-'));
  try {
    copySample(tmp);
    const r = runMove(['2', 'before', '1'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-intro')));
    assert.ok(fs.existsSync(path.join(tmp, '02-welcome')));
    assert.ok(fs.existsSync(path.join(tmp, '03-outro')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--dry-run prints plan without renaming', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-move-'));
  try {
    copySample(tmp);
    const before = fs.readdirSync(tmp).sort();
    const r = runMove(['1', 'after', '3', '--dry-run'], tmp);
    assert.equal(r.status, 0, r.stderr);
    const after = fs.readdirSync(tmp).sort();
    assert.deepEqual(before, after);
    assert.match(r.stdout, /01-welcome/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
