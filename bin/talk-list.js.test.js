import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function runList(talkDir) {
  return spawnSync('node', [path.resolve('bin/talk-list.js')], {
    cwd: talkDir,
    encoding: 'utf8',
  });
}

test('prints one line per scene in order', () => {
  const result = runList(path.resolve('fixtures/sample-talk'));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), [
    '01  welcome',
    '02  intro',
    '03  outro',
  ].join('\n'));
});

test('errors when not inside a talk folder', () => {
  const result = runList(path.resolve('.'));
  // The framework repo itself is not a talk — no talk.toml.
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /talk\.toml/);
});
