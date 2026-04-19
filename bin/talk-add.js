#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseFlags, printPlan } from './cli-args.lib.js';
import { discoverScenes } from '../src/authoring/scene-discovery.lib.js';
import { planRename } from '../src/authoring/rename-planner.lib.js';

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
    name: d.name,
    isDirectory: d.isDirectory(),
    hasSceneMd: d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'scene.md')),
    hasSceneJs: d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'scene.js')),
  }));
}

let opts;
try {
  opts = parseFlags(process.argv.slice(2));
} catch (err) {
  console.error(`talk add: ${err.message}`);
  process.exit(2);
}

const [slug] = opts.positional;
if (!slug) {
  console.error('talk add: missing <slug>');
  process.exit(2);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(`talk add: invalid slug "${slug}" (use lowercase letters, digits, hyphens)`);
  process.exit(2);
}

const root = findTalkRoot(process.cwd());
if (!root) {
  console.error('talk add: no talk.toml found');
  process.exit(1);
}

const { scenes } = discoverScenes(listEntries(root));

let command;
if (opts.first) command = { op: 'add', slug, position: 'first' };
else if (opts.after !== null) command = { op: 'add', slug, position: 'after', target: opts.after };
else command = { op: 'add', slug };

let plan;
try {
  plan = planRename(scenes, command);
} catch (err) {
  console.error(`talk add: ${err.message}`);
  process.exit(1);
}

if (opts.dryRun) {
  console.log('talk add: dry run — no changes made');
  printPlan(plan);
  process.exit(0);
}

// Rename in reverse order so shifting-up renames don't collide.
const sortedRenames = [...plan.renames].sort((a, b) => {
  const an = parseInt(a.from.slice(0, 2), 10);
  const bn = parseInt(b.from.slice(0, 2), 10);
  return bn - an;
});
for (const { from, to } of sortedRenames) {
  fs.renameSync(path.join(root, from), path.join(root, to));
}
for (const created of plan.creates) {
  const dir = path.join(root, created);
  fs.mkdirSync(path.join(dir), { recursive: true });
  fs.writeFileSync(path.join(dir, 'scene.md'), `---\ntitle: ${slug}\n---\n\n# ${slug}\n`);
}
printPlan(plan);
