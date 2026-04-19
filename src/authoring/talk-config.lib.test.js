import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTalkConfig } from './talk-config.lib.js';

test('accepts a minimal valid config', () => {
  const { config, errors } = validateTalkConfig({
    title: 'my-talk',
    author: '',
    framework_version: '0.1',
  });
  assert.deepEqual(errors, []);
  assert.equal(config.title, 'my-talk');
});

test('accepts a config with a palette section', () => {
  const { config, errors } = validateTalkConfig({
    title: 'x',
    framework_version: '0.1',
    palette: { accent: '#aaccff', bg: '#0a0a10' },
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(config.palette, { accent: '#aaccff', bg: '#0a0a10' });
});

test('errors on missing title', () => {
  const { errors } = validateTalkConfig({ framework_version: '0.1' });
  assert.ok(errors.some(e => /title/i.test(e)));
});

test('errors on missing framework_version', () => {
  const { errors } = validateTalkConfig({ title: 'x' });
  assert.ok(errors.some(e => /framework_version/i.test(e)));
});

test('errors on wrongly-typed title', () => {
  const { errors } = validateTalkConfig({ title: 42, framework_version: '0.1' });
  assert.ok(errors.some(e => /title/i.test(e) && /string/i.test(e)));
});

test('errors on wrongly-typed framework_version', () => {
  const { errors } = validateTalkConfig({ title: 'x', framework_version: 0.1 });
  assert.ok(errors.some(e => /framework_version/i.test(e) && /string/i.test(e)));
});

test('errors on non-object palette', () => {
  const { errors } = validateTalkConfig({
    title: 'x',
    framework_version: '0.1',
    palette: 'not-a-table',
  });
  assert.ok(errors.some(e => /palette/i.test(e) && /table/i.test(e)));
});

test('accepts empty author', () => {
  const { errors } = validateTalkConfig({
    title: 'x',
    author: '',
    framework_version: '0.1',
  });
  assert.deepEqual(errors, []);
});
