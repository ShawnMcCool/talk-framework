import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function runNew(args, cwd) {
  return spawnSync('node', [path.resolve('bin/talk-new.js'), ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, FRAMEWORK_ROOT: path.resolve('.') },
  });
}

test('scaffolds a new talk with talk.toml and a welcome scene', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-new-'));
  try {
    const result = runNew(['my-talk'], tmp);
    assert.equal(result.status, 0, result.stderr);

    const root = path.join(tmp, 'my-talk');
    assert.ok(fs.existsSync(path.join(root, 'talk.toml')));
    assert.ok(fs.existsSync(path.join(root, '01-welcome/scene.md')));
    assert.ok(fs.existsSync(path.join(root, 'CLAUDE.md')));
    assert.ok(fs.existsSync(path.join(root, '.claude/skills/talk-author/SKILL.md')));

    const toml = fs.readFileSync(path.join(root, 'talk.toml'), 'utf8');
    assert.match(toml, /title = "my-talk"/);
    assert.doesNotMatch(toml, /\{\{TALK_NAME\}\}/);

    const scene = fs.readFileSync(path.join(root, '01-welcome/scene.md'), 'utf8');
    assert.match(scene, /# my-talk/);
    assert.doesNotMatch(scene, /\{\{TALK_NAME\}\}/);

    const claudeMd = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
    assert.match(claudeMd, /# my-talk/);
    assert.doesNotMatch(claudeMd, /\{\{TALK_NAME\}\}/);

    const skill = fs.readFileSync(path.join(root, '.claude/skills/talk-author/SKILL.md'), 'utf8');
    assert.match(skill, /^---\nname: talk-author\n/);
    assert.match(skill, /description:/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('refuses if the target folder already exists and is non-empty', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-new-'));
  try {
    fs.mkdirSync(path.join(tmp, 'my-talk'));
    fs.writeFileSync(path.join(tmp, 'my-talk', 'something'), 'x');

    const result = runNew(['my-talk'], tmp);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /exists/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--dry-run prints the plan without creating anything', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-new-'));
  try {
    const result = runNew(['my-talk', '--dry-run'], tmp);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!fs.existsSync(path.join(tmp, 'my-talk')));
    assert.match(result.stdout, /my-talk\/talk\.toml/);
    assert.match(result.stdout, /my-talk\/01-welcome\/scene\.md/);
    assert.match(result.stdout, /my-talk\/CLAUDE\.md/);
    assert.match(result.stdout, /my-talk\/\.claude\/skills\/talk-author\/SKILL\.md/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
