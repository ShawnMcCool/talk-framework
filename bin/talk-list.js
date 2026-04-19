#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { discoverScenes } from '../src/authoring/scene-discovery.lib.js';

function findTalkRoot(start) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, 'talk.toml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const root = findTalkRoot(process.cwd());
if (!root) {
  console.error('talk list: no talk.toml found in this folder or any parent');
  process.exit(1);
}

const entries = fs.readdirSync(root, { withFileTypes: true }).map(d => {
  const isDirectory = d.isDirectory();
  let hasSceneMd = false, hasSceneJs = false;
  if (isDirectory) {
    const sub = path.join(root, d.name);
    hasSceneMd = fs.existsSync(path.join(sub, 'scene.md'));
    hasSceneJs = fs.existsSync(path.join(sub, 'scene.js'));
  }
  return { name: d.name, isDirectory, hasSceneMd, hasSceneJs };
});

const { scenes, issues } = discoverScenes(entries);

for (const issue of issues) {
  if (issue.severity === 'error') {
    console.error(`[${issue.severity}] ${issue.message}`);
  }
}

for (const s of scenes) {
  console.log(`${String(s.index).padStart(2, '0')}  ${s.slug}`);
}
