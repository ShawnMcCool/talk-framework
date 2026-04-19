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
function runRemove(args, cwd) {
  return spawnSync('node', [path.resolve('bin/talk-remove.js'), ...args], {
    cwd, encoding: 'utf8',
  });
}

test('removes the target scene and renumbers later ones', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-remove-'));
  try {
    copySample(tmp);
    const r = runRemove(['2'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-welcome')));
    assert.ok(fs.existsSync(path.join(tmp, '02-outro')));
    assert.ok(!fs.existsSync(path.join(tmp, '02-intro')));
    assert.ok(!fs.existsSync(path.join(tmp, '03-outro')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--dry-run prints plan and does nothing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-remove-'));
  try {
    copySample(tmp);
    const before = fs.readdirSync(tmp).sort();
    const r = runRemove(['2', '--dry-run'], tmp);
    assert.equal(r.status, 0, r.stderr);
    const after = fs.readdirSync(tmp).sort();
    assert.deepEqual(before, after);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('errors on unknown scene number', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-remove-'));
  try {
    copySample(tmp);
    const r = runRemove(['99'], tmp);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /scene 99/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
