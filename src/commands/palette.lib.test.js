import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRegistry,
  register,
  getCommands,
  fuzzyMatch,
  filterCommands,
} from './palette.lib.js';

describe('createRegistry + register + getCommands', () => {
  it('empty registry has 0 commands', () => {
    const registry = createRegistry();
    assert.equal(getCommands(registry).length, 0);
  });

  it('register adds a command', () => {
    const registry = createRegistry();
    const cmd = { id: 'go', title: 'Go to Scene', action: () => {} };
    const next = register(registry, cmd);
    assert.equal(getCommands(next).length, 1);
    assert.equal(getCommands(next)[0].id, 'go');
  });

  it('register with same id replaces existing', () => {
    const registry = createRegistry();
    const cmd1 = { id: 'go', title: 'Go to Scene', action: () => {} };
    const cmd2 = { id: 'go', title: 'Go Somewhere', action: () => {} };
    const next = register(register(registry, cmd1), cmd2);
    assert.equal(getCommands(next).length, 1);
    assert.equal(getCommands(next)[0].title, 'Go Somewhere');
  });
});

describe('fuzzyMatch', () => {
  it("empty query matches everything with score 0", () => {
    const result = fuzzyMatch('', 'anything');
    assert.equal(result.matched, true);
    assert.equal(result.score, 0);
  });

  it("'scene' matches 'Go to Scene'", () => {
    const result = fuzzyMatch('scene', 'Go to Scene');
    assert.equal(result.matched, true);
  });

  it("'SCENE' matches 'Go to Scene' (case insensitive)", () => {
    const result = fuzzyMatch('SCENE', 'Go to Scene');
    assert.equal(result.matched, true);
  });

  it("'gts' matches 'Go to Scene' (fuzzy)", () => {
    const result = fuzzyMatch('gts', 'Go to Scene');
    assert.equal(result.matched, true);
  });

  it("'stg' does not match 'Go to Scene' (wrong order)", () => {
    const result = fuzzyMatch('stg', 'Go to Scene');
    assert.equal(result.matched, false);
  });

  it("exact substring scores higher than sparse match", () => {
    const exact = fuzzyMatch('scene', 'Go to Scene');
    const sparse = fuzzyMatch('gts', 'Go to Scene');
    assert.ok(exact.score > sparse.score, `exact score ${exact.score} should be > sparse score ${sparse.score}`);
  });
});

describe('filterCommands', () => {
  const action = () => {};
  const commands = [
    { id: 'go', title: 'Go to Scene', action },
    { id: 'reset', title: 'Reset Scene', action },
    { id: 'debug', title: 'Toggle Debug', dev: true, action },
  ];

  it('empty query returns all 3 (devMode defaults to true)', () => {
    const results = filterCommands(commands, '');
    assert.equal(results.length, 3);
  });

  it("'scene' returns 2 matching commands", () => {
    const results = filterCommands(commands, 'scene');
    assert.equal(results.length, 2);
    const ids = results.map(c => c.id);
    assert.ok(ids.includes('go'));
    assert.ok(ids.includes('reset'));
  });

  it("'reset' returns Reset Scene first (highest score)", () => {
    const results = filterCommands(commands, 'reset');
    assert.ok(results.length >= 1);
    assert.equal(results[0].id, 'reset');
  });

  it('devMode:false excludes dev commands (returns 2)', () => {
    const results = filterCommands(commands, '', { devMode: false });
    assert.equal(results.length, 2);
    assert.ok(results.every(c => !c.dev));
  });

  it('devMode:true includes dev commands (returns 3)', () => {
    const results = filterCommands(commands, '', { devMode: true });
    assert.equal(results.length, 3);
  });
});
