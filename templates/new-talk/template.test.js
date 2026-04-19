import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseMarkdownScene } from '../../src/authoring/markdown-scene.lib.js';

test('starter scene parses as a valid content scene', () => {
  const src = fs.readFileSync(new URL('./01-welcome/scene.md', import.meta.url), 'utf8')
    .replace(/\{\{TALK_NAME\}\}/g, 'demo');
  const scene = parseMarkdownScene(src);
  assert.equal(scene.title, 'Welcome');
  assert.equal(scene.type, 'content');
  assert.ok(scene.slides.length >= 1);
});
