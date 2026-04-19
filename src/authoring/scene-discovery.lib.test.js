import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverScenes } from './scene-discovery.lib.js';

// Each entry: { name, isDirectory, hasSceneMd, hasSceneJs }

test('discovers scenes and sorts by numeric prefix', () => {
  const entries = [
    { name: '02-intro', isDirectory: true, hasSceneMd: true, hasSceneJs: false },
    { name: '01-welcome', isDirectory: true, hasSceneMd: true, hasSceneJs: false },
    { name: '03-architecture', isDirectory: true, hasSceneMd: false, hasSceneJs: true },
  ];
  const { scenes, issues } = discoverScenes(entries);
  assert.deepEqual(scenes.map(s => s.slug), ['welcome', 'intro', 'architecture']);
  assert.deepEqual(scenes.map(s => s.index), [1, 2, 3]);
  assert.deepEqual(scenes.map(s => s.kind), ['md', 'md', 'js']);
  assert.deepEqual(issues, []);
});

test('ignores files and unprefixed directories', () => {
  const entries = [
    { name: '01-welcome', isDirectory: true, hasSceneMd: true, hasSceneJs: false },
    { name: 'README.md', isDirectory: false, hasSceneMd: false, hasSceneJs: false },
    { name: 'notes', isDirectory: true, hasSceneMd: false, hasSceneJs: false },
  ];
  const { scenes, issues } = discoverScenes(entries);
  assert.equal(scenes.length, 1);
  assert.equal(scenes[0].slug, 'welcome');
  assert.deepEqual(issues, []);
});

test('reports missing scene file as a warning', () => {
  const entries = [
    { name: '01-welcome', isDirectory: true, hasSceneMd: false, hasSceneJs: false },
  ];
  const { scenes, issues } = discoverScenes(entries);
  assert.equal(scenes.length, 0);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'warning');
  assert.match(issues[0].message, /01-welcome/);
  assert.match(issues[0].message, /scene\.md/);
});

test('reports both scene.md and scene.js present as an error', () => {
  const entries = [
    { name: '01-welcome', isDirectory: true, hasSceneMd: true, hasSceneJs: true },
  ];
  const { scenes, issues } = discoverScenes(entries);
  assert.equal(scenes.length, 0);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'error');
  assert.match(issues[0].message, /both/);
});

test('reports gap in numbering as an error', () => {
  const entries = [
    { name: '01-welcome', isDirectory: true, hasSceneMd: true, hasSceneJs: false },
    { name: '03-architecture', isDirectory: true, hasSceneMd: true, hasSceneJs: false },
  ];
  const { scenes, issues } = discoverScenes(entries);
  assert.equal(scenes.length, 2);
  assert.ok(issues.some(i => i.severity === 'error' && /gap/i.test(i.message)));
});

test('reports duplicate numbers as an error', () => {
  const entries = [
    { name: '01-welcome', isDirectory: true, hasSceneMd: true, hasSceneJs: false },
    { name: '01-intro', isDirectory: true, hasSceneMd: true, hasSceneJs: false },
  ];
  const { scenes, issues } = discoverScenes(entries);
  assert.ok(issues.some(i => i.severity === 'error' && /duplicate/i.test(i.message)));
});

test('reports unprefixed or badly-prefixed directories as warnings', () => {
  const entries = [
    { name: '1-welcome', isDirectory: true, hasSceneMd: true, hasSceneJs: false },
    { name: 'abc-foo', isDirectory: true, hasSceneMd: true, hasSceneJs: false },
  ];
  const { scenes, issues } = discoverScenes(entries);
  assert.equal(scenes.length, 0);
  assert.equal(issues.length, 2);
  assert.ok(issues.every(i => i.severity === 'warning'));
});

test('empty content folder returns no scenes and no issues', () => {
  const { scenes, issues } = discoverScenes([]);
  assert.deepEqual(scenes, []);
  assert.deepEqual(issues, []);
});
