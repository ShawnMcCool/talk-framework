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
catch (err) { console.error(`talk rename: ${err.message}`); process.exit(2); }

const [idArg, slug] = opts.positional;
const id = Number(idArg);
if (!Number.isInteger(id) || id < 1) { console.error('talk rename: missing or invalid <N>'); process.exit(2); }
if (!slug) { console.error('talk rename: missing <new-slug>'); process.exit(2); }
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) { console.error(`talk rename: invalid slug "${slug}"`); process.exit(2); }

const root = findTalkRoot(process.cwd());
if (!root) { console.error('talk rename: no talk.toml found'); process.exit(1); }

const { scenes } = discoverScenes(listEntries(root));
let plan;
try { plan = planRename(scenes, { op: 'rename', id, slug }); }
catch (err) { console.error(`talk rename: ${err.message}`); process.exit(1); }

if (opts.dryRun) {
  console.log('talk rename: dry run — no changes made');
  printPlan(plan);
  process.exit(0);
}

for (const { from, to } of plan.renames) {
  fs.renameSync(path.join(root, from), path.join(root, to));
}
printPlan(plan);
