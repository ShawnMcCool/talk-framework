#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { discoverScenes } from '../src/authoring/scene-discovery.lib.js';
import { parseToml } from '../src/authoring/toml.lib.js';
import { validateTalkConfig } from '../src/authoring/talk-config.lib.js';

function findTalkRoot(start) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, 'talk.toml'))) return dir;
    const p = path.dirname(dir);
    if (p === dir) return null;
    dir = p;
  }
}
function listEntries(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).map(d => ({
    name: d.name, isDirectory: d.isDirectory(),
    hasSceneMd: d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'scene.md')),
    hasSceneJs: d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'scene.js')),
  }));
}

const root = findTalkRoot(process.cwd());
if (!root) {
  console.error('talk lint: no talk.toml found in this folder or any parent');
  process.exit(1);
}

let errorCount = 0;
let warnCount = 0;

// 1. talk.toml
try {
  const src = fs.readFileSync(path.join(root, 'talk.toml'), 'utf8');
  const parsed = parseToml(src);
  const { errors } = validateTalkConfig(parsed);
  for (const e of errors) {
    console.error(`error: ${e}`);
    errorCount++;
  }
} catch (err) {
  console.error(`error: talk.toml — ${err.message}`);
  errorCount++;
}

// 2. Structural checks on scene directories.
const { issues } = discoverScenes(listEntries(root));
for (const issue of issues) {
  const stream = issue.severity === 'error' ? 'stderr' : 'stdout';
  const target = stream === 'stderr' ? console.error : console.log;
  target(`${issue.severity}: ${issue.message}`);
  if (issue.severity === 'error') errorCount++; else warnCount++;
}

if (errorCount > 0) {
  console.error(`lint: ${errorCount} error(s), ${warnCount} warning(s)`);
  process.exit(1);
}
console.log(`lint: ok (${warnCount} warning(s))`);
