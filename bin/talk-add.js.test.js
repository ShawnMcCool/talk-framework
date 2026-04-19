import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function copySample(dst) {
  fs.mkdirSync(dst, { recursive: true });
  const src = path.resolve('fixtures/sample-talk');
  fs.cpSync(src, dst, { recursive: true });
}

function runAdd(args, cwd) {
  return spawnSync('node', [path.resolve('bin/talk-add.js'), ...args], {
    cwd,
    encoding: 'utf8',
  });
}

test('appends a new scene by default', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-add-'));
  try {
    copySample(tmp);
    const r = runAdd(['conclusion'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '04-conclusion/scene.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--after N inserts and shifts later scenes', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-add-'));
  try {
    copySample(tmp);
    const r = runAdd(['break', '--after', '1'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-welcome/scene.md')));
    assert.ok(fs.existsSync(path.join(tmp, '02-break/scene.md')));
    assert.ok(fs.existsSync(path.join(tmp, '03-intro/scene.md')));
    assert.ok(fs.existsSync(path.join(tmp, '04-outro/scene.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--first inserts at the start', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-add-'));
  try {
    copySample(tmp);
    const r = runAdd(['cover', '--first'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-cover/scene.md')));
    assert.ok(fs.existsSync(path.join(tmp, '02-welcome/scene.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--dry-run prints the plan and makes no changes', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-add-'));
  try {
    copySample(tmp);
    const before = fs.readdirSync(tmp).sort();
    const r = runAdd(['x', '--after', '1', '--dry-run'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /02-x/);
    const after = fs.readdirSync(tmp).sort();
    assert.deepEqual(before, after);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('rejects a duplicate slug', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-add-'));
  try {
    copySample(tmp);
    const r = runAdd(['welcome'], tmp);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /slug/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
