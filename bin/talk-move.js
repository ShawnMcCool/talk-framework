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
    name: d.name, isDirectory: d.isDirectory(),
    hasSceneMd: d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'scene.md')),
    hasSceneJs: d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'scene.js')),
  }));
}

let opts;
try { opts = parseFlags(process.argv.slice(2)); }
catch (err) { console.error(`talk move: ${err.message}`); process.exit(2); }

const [idArg, where, targetArg] = opts.positional;
const id = Number(idArg);
if (!Number.isInteger(id) || id < 1) { console.error('talk move: missing or invalid <N>'); process.exit(2); }
if (!['before', 'after', 'first', 'last'].includes(where)) {
  console.error('talk move: <where> must be one of: before, after, first, last');
  process.exit(2);
}
let target = null;
if (where === 'before' || where === 'after') {
  target = Number(targetArg);
  if (!Number.isInteger(target) || target < 1) {
    console.error(`talk move: ${where} requires a target scene number`);
    process.exit(2);
  }
}

const root = findTalkRoot(process.cwd());
if (!root) { console.error('talk move: no talk.toml found'); process.exit(1); }

const { scenes } = discoverScenes(listEntries(root));
let plan;
try { plan = planRename(scenes, { op: 'move', id, position: where, target }); }
catch (err) { console.error(`talk move: ${err.message}`); process.exit(1); }

if (opts.dryRun) {
  console.log('talk move: dry run — no changes made');
  printPlan(plan);
  process.exit(0);
}

// Safely apply renames even though the plan may contain cycles of names.
// Strategy: rename each folder to a temp name first, then to its final name.
const tmp = new Map();
for (const { from, to } of plan.renames) {
  const tmpName = `.talk-tmp-${from}`;
  fs.renameSync(path.join(root, from), path.join(root, tmpName));
  tmp.set(tmpName, to);
}
for (const [tmpName, to] of tmp) {
  fs.renameSync(path.join(root, tmpName), path.join(root, to));
}
printPlan(plan);
