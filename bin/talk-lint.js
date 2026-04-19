#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { discoverScenes } from '../src/authoring/scene-discovery.lib.js';
import { parseToml } from '../src/authoring/toml.lib.js';
import { validateTalkConfig } from '../src/authoring/talk-config.lib.js';
import { parseMarkdownScene } from '../src/authoring/markdown-scene.lib.js';
import { registry } from '../src/authoring/component-registry.js';
import { formatDiagnostics } from '../src/authoring/diagnostic-printer.lib.js';
import { walkSceneDiagnostics } from '../src/authoring/scene-diagnostics.lib.js';

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

const allDiags = [];
let errorCount = 0;
let warnCount = 0;

// 1. talk.toml
try {
  const src = fs.readFileSync(path.join(root, 'talk.toml'), 'utf8');
  const parsed = parseToml(src);
  const { errors } = validateTalkConfig(parsed);
  for (const e of errors) {
    allDiags.push({ severity: 'error', component: 'talk.toml', file: 'talk.toml', line: 1, column: 1, message: e });
    errorCount++;
  }
} catch (err) {
  allDiags.push({ severity: 'error', component: 'talk.toml', file: 'talk.toml', line: 1, column: 1, message: err.message });
  errorCount++;
}

// 2. Structural scene discovery. scene-discovery emits `severity: 'warning'`;
//    normalize to the diagnostic-record 'warn' variant.
const { scenes, issues } = discoverScenes(listEntries(root));
for (const issue of issues) {
  const severity = issue.severity === 'warning' ? 'warn' : 'error';
  allDiags.push({
    severity,
    component: 'scene-discovery',
    file: issue.folder || '.',
    line: 1, column: 1,
    message: issue.message,
  });
  if (severity === 'error') errorCount++; else warnCount++;
}

// 3. Content-aware lint per scene.
for (const scene of scenes) {
  const sceneDir = path.join(root, scene.folder);
  const mdPath = path.join(sceneDir, 'scene.md');
  if (!fs.existsSync(mdPath)) continue;   // JS scenes validated at runtime (Phase 8)

  let parsed;
  try {
    const src = fs.readFileSync(mdPath, 'utf8');
    parsed = parseMarkdownScene(src, {});
  } catch (err) {
    allDiags.push({
      severity: 'error',
      component: 'scene-type',
      file: `${scene.folder}/scene.md`,
      line: 1, column: 1,
      message: err.message,
    });
    errorCount++;
    continue;
  }

  for (const d of walkSceneDiagnostics(parsed, { file: `${scene.folder}/scene.md`, registry })) {
    allDiags.push(d);
    if (d.severity === 'error') errorCount++; else warnCount++;
  }
}

// 4. Emit.
process.stdout.write(formatDiagnostics(allDiags));
if (errorCount > 0) {
  console.error(`lint: ${errorCount} error(s), ${warnCount} warning(s)`);
  process.exit(1);
}
console.log(`lint: ok (${warnCount} warning(s))`);
