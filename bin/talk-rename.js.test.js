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
function runRename(args, cwd) {
  return spawnSync('node', [path.resolve('bin/talk-rename.js'), ...args], { cwd, encoding: 'utf8' });
}

test('renames the folder preserving the number', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-rename-'));
  try {
    copySample(tmp);
    const r = runRename(['2', 'introduction'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '02-introduction/scene.md')));
    assert.ok(!fs.existsSync(path.join(tmp, '02-intro')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('rejects a duplicate slug', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-rename-'));
  try {
    copySample(tmp);
    const r = runRename(['2', 'welcome'], tmp);
    assert.notEqual(r.status, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--dry-run makes no changes', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-rename-'));
  try {
    copySample(tmp);
    const before = fs.readdirSync(tmp).sort();
    runRename(['2', 'introduction', '--dry-run'], tmp);
    const after = fs.readdirSync(tmp).sort();
    assert.deepEqual(before, after);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
