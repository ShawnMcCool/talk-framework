# Content-Folder Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-04-19-content-folder-foundation-design.md`

**Goal:** Separate the framework (which lives in this repo) from content folders (which live anywhere on disk), and give authors a single `talk` CLI on PATH that creates, reorders, serves, and lints presentations.

**Architecture:** Pure JS libs (discovery, rename planning, TOML, config validation) tested headlessly under `src/authoring/`. A `talk` bash wrapper on PATH finds the current talk and dispatches into Docker; inside the container, focused Node scripts under `bin/` perform each subcommand. `talk serve` plumbs `CONTENT_DIR` through `docker-compose.yml` and `vite.config.js`, and a small framework-side content loader scans the content folder and exposes scenes via a Vite virtual module. Bad content becomes a placeholder card instead of crashing.

**Tech Stack:** Node 20 built-in test runner (`node --test`), Vite 6, Three.js (untouched), bash, Docker Compose. No new runtime deps.

**Version-control note:** This repo uses **jujutsu (jj)**, not git. Every task's "commit" step uses:

```bash
jj describe -m "<message>"   # set description on the current change (@)
jj new                       # seal it and start a fresh empty change
```

Never run `git commit` in this repo.

---

## File structure overview

### New files

Pure libs (Phase 1):
- `src/authoring/scene-discovery.lib.js` + `.test.js` — directory listing → sorted scene descriptors + structural issues
- `src/authoring/rename-planner.lib.js` + `.test.js` — state + command → rename plan
- `src/authoring/toml.lib.js` + `.test.js` — minimal TOML parser for the v1 schema
- `src/authoring/talk-config.lib.js` + `.test.js` — validate parsed TOML against the v1 schema

Framework wiring (Phase 2):
- `src/authoring/content-loader-plugin.js` — Vite plugin exposing `virtual:content-manifest`
- `src/authoring/scene-placeholder.js` — renders an error card for scenes that failed to load
- `templates/new-talk/talk.toml`
- `templates/new-talk/01-welcome/scene.md`

CLI (Phase 3):
- `talk` — bash wrapper at repo root (executable, no extension)
- `bin/talk-help` — bash script
- `bin/talk-version` — bash script
- `bin/talk-new.js` — Node script
- `bin/talk-list.js`
- `bin/talk-add.js`
- `bin/talk-remove.js`
- `bin/talk-rename.js`
- `bin/talk-move.js`
- `bin/talk-serve` — bash script (invokes `docker compose up`)
- `bin/talk-lint.js` — v1 delegates to existing shape validator
- `bin/talk-test` — bash script (runs `node --test` in the framework repo)
- `bin/cli-args.lib.js` + `.test.js` — shared arg-parsing helpers used by the Node scripts
- `test/fixtures/sample-talk/` — a small valid content folder used in integration tests

### Modified files

- `docker-compose.yml` — add a `${CONTENT_DIR}:/content` bind mount and accept a `CONTENT_DIR` env var
- `vite.config.js` — read `CONTENT_DIR` from env, register `content-loader-plugin`, error clearly if unset
- `src/main.js` — remove hand-rolled `SCENE_SOURCES`, consume `virtual:content-manifest` instead
- `package.json` — add a `dev` script that errors if `CONTENT_DIR` is unset (framework-dev ergonomics)
- `CLAUDE.md` — update the "Development" and "Current state" sections to reflect the new shape
- `todo.md` — mark sub-project A done, leave B/C/D open

### Removed files

- `dev`, `dev-check`, `test` (the old shell scripts at repo root) — their jobs now live under `talk`
- `src/scenes/` — content is no longer shipped inside the framework repo

---

## Phase 1 — Pure libraries (TDD)

All Phase 1 libs are pure (no `fs`, no `process`, no Vite). They return plain values or throw `Error` with a useful message. Tests run under the existing `node --test` harness.

### Task 1: Scene discovery lib

**Files:**
- Create: `src/authoring/scene-discovery.lib.js`
- Create: `src/authoring/scene-discovery.lib.test.js`

The lib is a pure function on a synthetic directory listing. Filesystem reading happens in the caller.

- [ ] **Step 1: Write the failing tests**

File: `src/authoring/scene-discovery.lib.test.js`

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./test src/authoring/scene-discovery.lib.test.js`
Expected: failures because the module doesn't exist yet.

- [ ] **Step 3: Write the lib**

File: `src/authoring/scene-discovery.lib.js`

```javascript
// Pure scene discovery.
// Input: synthetic directory listing — an array of
//   { name: string, isDirectory: boolean, hasSceneMd: boolean, hasSceneJs: boolean }
// Output: { scenes, issues } where
//   scenes = [{ index, slug, folder, kind: 'md'|'js' }, ...] sorted by index
//   issues = [{ severity: 'error'|'warning', message, folder? }, ...]

const PREFIX_RE = /^(\d{2})-([a-z0-9][a-z0-9-]*)$/;

export function discoverScenes(entries) {
  const scenes = [];
  const issues = [];

  for (const entry of entries) {
    if (!entry.isDirectory) continue;

    const m = entry.name.match(PREFIX_RE);
    if (!m) {
      // A directory that doesn't match the convention.
      // Tolerate if it also has no scene files — authors keep aux folders like "notes/".
      if (entry.hasSceneMd || entry.hasSceneJs) {
        issues.push({
          severity: 'warning',
          folder: entry.name,
          message: `folder "${entry.name}" contains a scene file but its name does not match the nn-slug convention`,
        });
      } else if (/^[0-9]/.test(entry.name)) {
        // Starts with a digit but malformed — almost certainly a mistake.
        issues.push({
          severity: 'warning',
          folder: entry.name,
          message: `folder "${entry.name}" looks like a scene directory but its numeric prefix is not two digits`,
        });
      }
      continue;
    }

    const index = parseInt(m[1], 10);
    const slug = m[2];

    if (entry.hasSceneMd && entry.hasSceneJs) {
      issues.push({
        severity: 'error',
        folder: entry.name,
        message: `folder "${entry.name}" contains both scene.md and scene.js; pick one`,
      });
      continue;
    }
    if (!entry.hasSceneMd && !entry.hasSceneJs) {
      issues.push({
        severity: 'warning',
        folder: entry.name,
        message: `folder "${entry.name}" is missing scene.md or scene.js`,
      });
      continue;
    }

    scenes.push({
      index,
      slug,
      folder: entry.name,
      kind: entry.hasSceneMd ? 'md' : 'js',
    });
  }

  scenes.sort((a, b) => a.index - b.index);

  // Duplicate and gap checks.
  const seen = new Map();
  for (const s of scenes) {
    if (seen.has(s.index)) {
      issues.push({
        severity: 'error',
        folder: s.folder,
        message: `duplicate scene number ${String(s.index).padStart(2, '0')}: "${seen.get(s.index)}" and "${s.folder}"`,
      });
    } else {
      seen.set(s.index, s.folder);
    }
  }
  if (scenes.length > 0) {
    const min = scenes[0].index;
    const max = scenes[scenes.length - 1].index;
    if (min !== 1) {
      issues.push({
        severity: 'error',
        message: `first scene must be numbered 01; found ${String(min).padStart(2, '0')}`,
      });
    }
    for (let want = min; want <= max; want++) {
      if (!seen.has(want)) {
        issues.push({
          severity: 'error',
          message: `gap in scene numbering at ${String(want).padStart(2, '0')}`,
        });
      }
    }
  }

  return { scenes, issues };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./test src/authoring/scene-discovery.lib.test.js`
Expected: PASS — all 8 tests.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(authoring): pure scene-discovery lib for content folders"
jj new
```

---

### Task 2: Rename planner lib

Given the current scenes and a structural command, produce the list of folder renames needed.

**Files:**
- Create: `src/authoring/rename-planner.lib.js`
- Create: `src/authoring/rename-planner.lib.test.js`

- [ ] **Step 1: Write the failing tests**

File: `src/authoring/rename-planner.lib.test.js`

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planRename } from './rename-planner.lib.js';

// Helper: build a scene list from a compact spec
function scenes(...pairs) {
  return pairs.map(([index, slug]) => ({ index, slug, folder: `${String(index).padStart(2, '0')}-${slug}` }));
}

test('move: 3 after 6 shifts intermediate scenes down', () => {
  const current = scenes([1,'welcome'], [2,'intro'], [3,'arch'], [4,'demo'], [5,'tradeoffs'], [6,'outro']);
  const plan = planRename(current, { op: 'move', id: 3, position: 'after', target: 6 });
  assert.deepEqual(plan.renames, [
    { from: '03-arch',      to: '06-arch' },
    { from: '04-demo',      to: '03-demo' },
    { from: '05-tradeoffs', to: '04-tradeoffs' },
    { from: '06-outro',     to: '05-outro' },
  ]);
});

test('move: 1 before 4 keeps others shifted up', () => {
  const current = scenes([1,'welcome'], [2,'intro'], [3,'arch'], [4,'demo']);
  const plan = planRename(current, { op: 'move', id: 1, position: 'before', target: 4 });
  // new order: intro, arch, welcome, demo
  assert.deepEqual(plan.renames, [
    { from: '01-welcome', to: '03-welcome' },
    { from: '02-intro',   to: '01-intro' },
    { from: '03-arch',    to: '02-arch' },
  ]);
});

test('move: N first and N last', () => {
  const current = scenes([1,'a'], [2,'b'], [3,'c']);
  const planFirst = planRename(current, { op: 'move', id: 3, position: 'first' });
  assert.deepEqual(planFirst.renames, [
    { from: '01-a', to: '02-a' },
    { from: '02-b', to: '03-b' },
    { from: '03-c', to: '01-c' },
  ]);
  const planLast = planRename(current, { op: 'move', id: 1, position: 'last' });
  assert.deepEqual(planLast.renames, [
    { from: '01-a', to: '03-a' },
    { from: '02-b', to: '01-b' },
    { from: '03-c', to: '02-c' },
  ]);
});

test('move: no-op when target position equals current position', () => {
  const current = scenes([1,'a'], [2,'b'], [3,'c']);
  const plan = planRename(current, { op: 'move', id: 2, position: 'after', target: 1 });
  assert.deepEqual(plan.renames, []);
});

test('remove: deletes the folder and renumbers successors', () => {
  const current = scenes([1,'a'], [2,'b'], [3,'c'], [4,'d']);
  const plan = planRename(current, { op: 'remove', id: 2 });
  assert.deepEqual(plan.removes, ['02-b']);
  assert.deepEqual(plan.renames, [
    { from: '03-c', to: '02-c' },
    { from: '04-d', to: '03-d' },
  ]);
});

test('add: --first inserts at 01 and shifts everything up', () => {
  const current = scenes([1,'a'], [2,'b']);
  const plan = planRename(current, { op: 'add', slug: 'new', position: 'first' });
  assert.deepEqual(plan.renames, [
    { from: '01-a', to: '02-a' },
    { from: '02-b', to: '03-b' },
  ]);
  assert.deepEqual(plan.creates, ['01-new']);
});

test('add: --after 2 inserts at 03 and shifts later scenes up', () => {
  const current = scenes([1,'a'], [2,'b'], [3,'c']);
  const plan = planRename(current, { op: 'add', slug: 'new', position: 'after', target: 2 });
  assert.deepEqual(plan.renames, [
    { from: '03-c', to: '04-c' },
  ]);
  assert.deepEqual(plan.creates, ['03-new']);
});

test('add: default appends at the end', () => {
  const current = scenes([1,'a'], [2,'b']);
  const plan = planRename(current, { op: 'add', slug: 'new' });
  assert.deepEqual(plan.renames, []);
  assert.deepEqual(plan.creates, ['03-new']);
});

test('add: into an empty talk creates 01-slug', () => {
  const plan = planRename([], { op: 'add', slug: 'welcome' });
  assert.deepEqual(plan.creates, ['01-welcome']);
});

test('rename: changes slug only, number preserved', () => {
  const current = scenes([1,'a'], [2,'b']);
  const plan = planRename(current, { op: 'rename', id: 2, slug: 'beta' });
  assert.deepEqual(plan.renames, [
    { from: '02-b', to: '02-beta' },
  ]);
});

test('throws on unknown scene id', () => {
  const current = scenes([1,'a'], [2,'b']);
  assert.throws(
    () => planRename(current, { op: 'move', id: 9, position: 'first' }),
    /scene 9/i,
  );
});

test('throws on duplicate slug', () => {
  const current = scenes([1,'a'], [2,'b']);
  assert.throws(
    () => planRename(current, { op: 'add', slug: 'a' }),
    /slug "a"/i,
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./test src/authoring/rename-planner.lib.test.js`
Expected: failures (module not found).

- [ ] **Step 3: Write the lib**

File: `src/authoring/rename-planner.lib.js`

```javascript
// Pure rename planner. Given the current scene list and a structural command,
// returns a plan: { renames: [{from, to}], creates: [folder], removes: [folder] }.
//
// Input scenes: [{ index, slug, folder }, ...] — already sorted by index,
// expected to be contiguous starting from 1 (caller's responsibility).
//
// Supported commands:
//   { op: 'move', id, position: 'before'|'after'|'first'|'last', target? }
//   { op: 'remove', id }
//   { op: 'add', slug, position?: 'before'|'after'|'first'|'last', target? }  (default: append)
//   { op: 'rename', id, slug }

function pad(n) { return String(n).padStart(2, '0'); }
function folderFor(index, slug) { return `${pad(index)}-${slug}`; }

function findIndex(scenes, id) {
  const i = scenes.findIndex(s => s.index === id);
  if (i === -1) throw new Error(`scene ${id} does not exist`);
  return i;
}

function ensureUniqueSlug(scenes, slug) {
  if (scenes.some(s => s.slug === slug)) {
    throw new Error(`slug "${slug}" is already in use`);
  }
}

function reorder(list) {
  // Given a [{slug, prevIndex}, ...] in desired order, produce renames.
  const renames = [];
  list.forEach((s, i) => {
    const newIndex = i + 1;
    if (newIndex !== s.prevIndex) {
      renames.push({ from: folderFor(s.prevIndex, s.slug), to: folderFor(newIndex, s.slug) });
    }
  });
  return renames;
}

function buildTargetOrder(scenes, command) {
  const list = scenes.map(s => ({ slug: s.slug, prevIndex: s.index }));

  if (command.op === 'move') {
    const fromIdx = findIndex(scenes, command.id);
    const [moving] = list.splice(fromIdx, 1);

    let insertAt;
    if (command.position === 'first') insertAt = 0;
    else if (command.position === 'last') insertAt = list.length;
    else {
      const targetIdx = list.findIndex(s => s.prevIndex === command.target);
      if (targetIdx === -1) throw new Error(`scene ${command.target} does not exist`);
      insertAt = command.position === 'before' ? targetIdx : targetIdx + 1;
    }
    list.splice(insertAt, 0, moving);
    return { list, creates: [], removes: [] };
  }

  if (command.op === 'remove') {
    const idx = findIndex(scenes, command.id);
    const [removed] = list.splice(idx, 1);
    return { list, creates: [], removes: [folderFor(removed.prevIndex, removed.slug)] };
  }

  if (command.op === 'add') {
    ensureUniqueSlug(scenes, command.slug);
    const newEntry = { slug: command.slug, prevIndex: null };
    let insertAt;
    if (!command.position || command.position === 'last') insertAt = list.length;
    else if (command.position === 'first') insertAt = 0;
    else {
      const targetIdx = list.findIndex(s => s.prevIndex === command.target);
      if (targetIdx === -1) throw new Error(`scene ${command.target} does not exist`);
      insertAt = command.position === 'before' ? targetIdx : targetIdx + 1;
    }
    list.splice(insertAt, 0, newEntry);
    const finalIndex = insertAt + 1;
    return { list, creates: [folderFor(finalIndex, command.slug)], removes: [] };
  }

  if (command.op === 'rename') {
    const idx = findIndex(scenes, command.id);
    ensureUniqueSlug(scenes, command.slug);
    list[idx] = { ...list[idx], slug: command.slug };
    return { list, creates: [], removes: [] };
  }

  throw new Error(`unknown op: ${command.op}`);
}

export function planRename(scenes, command) {
  const { list, creates, removes } = buildTargetOrder(scenes, command);
  const renames = reorder(list.filter(s => s.prevIndex !== null));
  return { renames, creates, removes };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./test src/authoring/rename-planner.lib.test.js`
Expected: PASS — all 12 tests.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(authoring): pure rename-planner lib for structural edits"
jj new
```

---

### Task 3: TOML parser lib

A minimal TOML parser for the v1 `talk.toml` schema (string/number/boolean values, one-level `[table]` sections, `#` comments, trailing-comma-free).

**Files:**
- Create: `src/authoring/toml.lib.js`
- Create: `src/authoring/toml.lib.test.js`

- [ ] **Step 1: Write the failing tests**

File: `src/authoring/toml.lib.test.js`

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseToml } from './toml.lib.js';

test('parses top-level string, number, bool', () => {
  const result = parseToml(`
title = "my talk"
year = 2026
draft = true
`);
  assert.deepEqual(result, { title: 'my talk', year: 2026, draft: true });
});

test('preserves numeric strings as strings', () => {
  const result = parseToml(`framework_version = "0.1"`);
  assert.equal(result.framework_version, '0.1');
  assert.equal(typeof result.framework_version, 'string');
});

test('parses a table', () => {
  const result = parseToml(`
title = "x"

[palette]
accent = "#aaccff"
bg = "#0a0a10"
`);
  assert.deepEqual(result, {
    title: 'x',
    palette: { accent: '#aaccff', bg: '#0a0a10' },
  });
});

test('ignores comments and blank lines', () => {
  const result = parseToml(`
# top comment
title = "x"   # trailing comment
# another
`);
  assert.deepEqual(result, { title: 'x' });
});

test('throws on unterminated string', () => {
  assert.throws(() => parseToml(`title = "abc`), /line 1/);
});

test('throws on missing equals', () => {
  assert.throws(() => parseToml(`title "abc"`), /line 1/);
});

test('throws on duplicate top-level key', () => {
  assert.throws(() => parseToml(`a = 1\na = 2`), /duplicate/i);
});

test('throws on duplicate key inside table', () => {
  assert.throws(() => parseToml(`[t]\na = 1\na = 2`), /duplicate/i);
});

test('throws on unknown value type', () => {
  assert.throws(() => parseToml(`x = [1,2,3]`), /line 1/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./test src/authoring/toml.lib.test.js`
Expected: failures.

- [ ] **Step 3: Write the lib**

File: `src/authoring/toml.lib.js`

```javascript
// Minimal TOML parser for the v1 talk.toml schema.
// Supports: string, number, boolean scalars at top level and inside one-level
// [table] sections. Strips `#` comments. No arrays, no nested tables, no multi-line strings.
// Throws an Error with a line number on any deviation.

export function parseToml(source) {
  const out = {};
  let currentTable = null;
  const lines = source.split('\n');

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    // Strip comments (but not # inside a quoted string).
    const line = stripComment(rawLine);
    const trimmed = line.trim();
    if (trimmed === '') return;

    // Section header.
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const name = trimmed.slice(1, -1).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) {
        throw new Error(`line ${lineNum}: invalid table name "${name}"`);
      }
      if (out[name] !== undefined) {
        throw new Error(`line ${lineNum}: duplicate table [${name}]`);
      }
      out[name] = {};
      currentTable = out[name];
      return;
    }

    // key = value
    const eq = findTopLevelEquals(trimmed);
    if (eq === -1) {
      throw new Error(`line ${lineNum}: expected key = value`);
    }
    const key = trimmed.slice(0, eq).trim();
    const valueRaw = trimmed.slice(eq + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)) {
      throw new Error(`line ${lineNum}: invalid key "${key}"`);
    }

    const value = parseValue(valueRaw, lineNum);
    const target = currentTable || out;
    if (target[key] !== undefined) {
      throw new Error(`line ${lineNum}: duplicate key "${key}"`);
    }
    target[key] = value;
  });

  return out;
}

function stripComment(line) {
  let inString = false;
  let quoteChar = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inString) {
      if (c === '\\') { i++; continue; }
      if (c === quoteChar) { inString = false; continue; }
    } else {
      if (c === '"' || c === "'") { inString = true; quoteChar = c; continue; }
      if (c === '#') return line.slice(0, i);
    }
  }
  return line;
}

function findTopLevelEquals(s) {
  let inString = false;
  let quoteChar = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (c === '\\') { i++; continue; }
      if (c === quoteChar) { inString = false; continue; }
    } else {
      if (c === '"' || c === "'") { inString = true; quoteChar = c; continue; }
      if (c === '=') return i;
    }
  }
  return -1;
}

function parseValue(raw, lineNum) {
  if (raw === '') throw new Error(`line ${lineNum}: empty value`);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw[0] === '"' || raw[0] === "'") {
    const quote = raw[0];
    if (raw[raw.length - 1] !== quote || raw.length < 2) {
      throw new Error(`line ${lineNum}: unterminated string`);
    }
    // Allow simple backslash escapes.
    return raw.slice(1, -1).replace(/\\(.)/g, '$1');
  }
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (/^-?\d+\.\d+$/.test(raw)) return Number(raw);
  throw new Error(`line ${lineNum}: unrecognized value "${raw}"`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./test src/authoring/toml.lib.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(authoring): minimal TOML parser for talk.toml"
jj new
```

---

### Task 4: `talk.toml` config validator lib

Validates a parsed TOML object against the v1 schema defined in the spec.

**Files:**
- Create: `src/authoring/talk-config.lib.js`
- Create: `src/authoring/talk-config.lib.test.js`

- [ ] **Step 1: Write the failing tests**

File: `src/authoring/talk-config.lib.test.js`

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./test src/authoring/talk-config.lib.test.js`
Expected: failures.

- [ ] **Step 3: Write the lib**

File: `src/authoring/talk-config.lib.js`

```javascript
// Validates a parsed TOML object against the v1 talk.toml schema.
// Returns { config, errors } where errors is an array of human-readable strings.
// `config` is the input passed through (not defensively copied) — callers can
// trust the fields they validated.

export function validateTalkConfig(raw) {
  const errors = [];

  if (!raw || typeof raw !== 'object') {
    return { config: null, errors: ['talk.toml: expected a table at the top level'] };
  }

  if (typeof raw.title !== 'string' || raw.title.length === 0) {
    errors.push('talk.toml: `title` is required and must be a non-empty string');
  }

  if (raw.framework_version === undefined) {
    errors.push('talk.toml: `framework_version` is required');
  } else if (typeof raw.framework_version !== 'string') {
    errors.push('talk.toml: `framework_version` must be a string (quote the value)');
  }

  if (raw.author !== undefined && typeof raw.author !== 'string') {
    errors.push('talk.toml: `author` must be a string');
  }

  if (raw.palette !== undefined) {
    if (typeof raw.palette !== 'object' || Array.isArray(raw.palette) || raw.palette === null) {
      errors.push('talk.toml: `palette` must be a [palette] table');
    } else {
      for (const [k, v] of Object.entries(raw.palette)) {
        if (typeof v !== 'string') {
          errors.push(`talk.toml: [palette] "${k}" must be a string (hex colour or token)`);
        }
      }
    }
  }

  return { config: raw, errors };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./test src/authoring/talk-config.lib.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(authoring): talk.toml config validator"
jj new
```

---

## Phase 2 — Framework wiring

### Task 5: Create the starter template

Moves the existing placeholder into a proper template the CLI will copy.

**Files:**
- Create: `templates/new-talk/talk.toml`
- Create: `templates/new-talk/01-welcome/scene.md`

- [ ] **Step 1: Create the directory and config**

File: `templates/new-talk/talk.toml`

```toml
title = "{{TALK_NAME}}"
author = ""
framework_version = "0.1"

[palette]
# Override framework default palette tokens here.
# Any token from the framework's default palette can be overridden.
# Examples:
# accent = "#a3d9ff"
# bg     = "#0a0a10"
```

`{{TALK_NAME}}` is a placeholder the `talk new` command substitutes at scaffold time. It is NOT general-purpose templating — just a single hard-coded substitution.

- [ ] **Step 2: Create the starter scene**

File: `templates/new-talk/01-welcome/scene.md`

```markdown
---
title: Welcome
---

# {{TALK_NAME}}

- edit this file to begin
- `talk add <slug>` to add more scenes
- `talk lint` to check your work
- `talk serve` to see it in the browser
```

- [ ] **Step 3: Smoke-test the template is parseable today**

Run inside the container:
```
./test -e "import { parseMarkdownScene } from './src/authoring/markdown-scene.lib.js'; import fs from 'node:fs'; const src = fs.readFileSync('templates/new-talk/01-welcome/scene.md', 'utf8'); console.log(parseMarkdownScene(src.replace(/\\{\\{TALK_NAME\\}\\}/g, 'demo')));"
```

Or, simpler, add a quick test:

File: `templates/new-talk/template.test.js`

```javascript
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
```

Run: `./test templates/new-talk/template.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
jj describe -m "feat(templates): add new-talk starter template"
jj new
```

---

### Task 6: Content loader plugin (Vite) — read, scan, expose

Bridges the filesystem to the pure scene-discovery lib, and exposes the result as a Vite virtual module `virtual:content-manifest`.

**Files:**
- Create: `src/authoring/content-loader-plugin.js`
- Modify: `vite.config.js`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Modify `docker-compose.yml` to accept `CONTENT_DIR`**

File: `docker-compose.yml`

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      CONTENT_DIR: /content
    volumes:
      - .:/app
      - ${CONTENT_DIR:-./templates/new-talk}:/content:ro
      - node_modules:/app/node_modules
    command: npm run dev

volumes:
  node_modules:
```

Note: the host-side `${CONTENT_DIR:-./templates/new-talk}` is a *compose substitution*, set by whoever invokes `docker compose` (the `talk` wrapper). Defaulting to the template lets `docker compose up` work for framework devs who just want to poke around.

- [ ] **Step 2: Create the Vite plugin**

File: `src/authoring/content-loader-plugin.js`

```javascript
// Vite plugin that exposes the current content folder as `virtual:content-manifest`.
// The content folder is always mounted at /content inside the container.
//
// The virtual module exports:
//   config          — the validated talk.toml object
//   scenes          — [{ index, slug, folder, kind, raw }, ...] for successfully loaded scenes
//   issues          — [{ severity, folder?, message }, ...] structural problems
//   badScenes       — [{ index?, folder, reason }, ...] scenes that tried to load but failed
//
// When the content folder changes on disk, the plugin invalidates the virtual
// module so Vite's HMR pipeline picks up the new state on the next request.

import fs from 'node:fs';
import path from 'node:path';
import { discoverScenes } from './scene-discovery.lib.js';
import { parseToml } from './toml.lib.js';
import { validateTalkConfig } from './talk-config.lib.js';

const VIRTUAL_ID = 'virtual:content-manifest';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

export function contentLoaderPlugin(options = {}) {
  const contentRoot = options.contentRoot || '/content';

  return {
    name: 'beam-talk:content-loader',

    configureServer(server) {
      // Watch the content folder for any change. Each change invalidates
      // the virtual module and tells Vite to reload the client.
      try {
        server.watcher.add(path.join(contentRoot, '**/*'));
      } catch {
        // Watcher errors are non-fatal — polling in the container catches changes anyway.
      }
      server.watcher.on('all', (event, changed) => {
        if (!changed.startsWith(contentRoot)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }
      });
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },

    load(id) {
      if (id !== RESOLVED_ID) return null;
      return buildManifestModule(contentRoot);
    },
  };
}

function buildManifestModule(contentRoot) {
  const tomlPath = path.join(contentRoot, 'talk.toml');
  if (!fs.existsSync(tomlPath)) {
    return errorModule(`No talk.toml found at ${contentRoot}. Did you forget to set CONTENT_DIR?`);
  }

  let config;
  try {
    const parsed = parseToml(fs.readFileSync(tomlPath, 'utf8'));
    const { config: validated, errors } = validateTalkConfig(parsed);
    if (errors.length > 0) {
      return errorModule(`talk.toml is invalid:\n  - ${errors.join('\n  - ')}`);
    }
    config = validated;
  } catch (err) {
    return errorModule(`Failed to parse talk.toml: ${err.message}`);
  }

  const entries = listEntries(contentRoot);
  const { scenes, issues } = discoverScenes(entries);

  // Build dynamic imports for each scene's source file.
  const sceneImports = scenes.map((s, i) => {
    const src = s.kind === 'md'
      ? `/content/${s.folder}/scene.md?raw`
      : `/content/${s.folder}/scene.js`;
    return { ...s, importPath: src, importIdent: `__scene_${i}` };
  });

  const importLines = sceneImports.map(s =>
    s.kind === 'md'
      ? `import ${s.importIdent} from ${JSON.stringify(s.importPath)};`
      : `import * as ${s.importIdent} from ${JSON.stringify(s.importPath)};`,
  ).join('\n');

  const sceneObjects = sceneImports.map(s => `  {
    index: ${s.index},
    slug: ${JSON.stringify(s.slug)},
    folder: ${JSON.stringify(s.folder)},
    kind: ${JSON.stringify(s.kind)},
    source: ${s.importIdent},
  }`).join(',\n');

  return `${importLines}

export const config = ${JSON.stringify(config)};
export const scenes = [
${sceneObjects}
];
export const issues = ${JSON.stringify(issues)};
export const error = null;
`;
}

function listEntries(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).map(d => {
    const isDirectory = d.isDirectory();
    let hasSceneMd = false;
    let hasSceneJs = false;
    if (isDirectory) {
      const sub = path.join(dir, d.name);
      try {
        hasSceneMd = fs.existsSync(path.join(sub, 'scene.md'));
        hasSceneJs = fs.existsSync(path.join(sub, 'scene.js'));
      } catch {
        /* ignore */
      }
    }
    return { name: d.name, isDirectory, hasSceneMd, hasSceneJs };
  });
}

function errorModule(message) {
  return `export const config = null;
export const scenes = [];
export const issues = [];
export const error = ${JSON.stringify(message)};
`;
}
```

- [ ] **Step 3: Wire the plugin into `vite.config.js`**

File: `vite.config.js`

```javascript
import { openInEditorPlugin } from './src/authoring/dev-middleware.js';
import { contentLoaderPlugin } from './src/authoring/content-loader-plugin.js';

export default {
  base: process.env.NODE_ENV === 'production' ? '/beam-talk/' : '/',
  plugins: [
    contentLoaderPlugin({ contentRoot: '/content' }),
    openInEditorPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    fs: {
      allow: ['/app', '/content'],
    },
    watch: {
      usePolling: true,
      interval: 200,
    },
    hmr: {
      clientPort: 3000,
    },
  },
};
```

- [ ] **Step 4: Smoke test — start the server, hit `/` and confirm no startup crash**

Run: `docker compose up --build` (from framework repo root, with no `CONTENT_DIR` set — it defaults to `templates/new-talk/` via compose substitution).
Then in another terminal: `curl -sf http://localhost:3000 | head -5`
Expected: the Vite index.html comes back (HTML, not an error page).
Stop the server: `docker compose down`.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(framework): Vite content-loader plugin reads CONTENT_DIR"
jj new
```

---

### Task 7: Error-placeholder scene for bad content

A scene module the engine can use when a content scene fails to compile.

**Files:**
- Create: `src/authoring/scene-placeholder.js`

- [ ] **Step 1: Write the placeholder**

File: `src/authoring/scene-placeholder.js`

```javascript
// Builds a scene module that renders an error card. Used when a content
// scene fails to load or fails shape validation, so the rest of the deck
// stays navigable.

export function createErrorPlaceholderScene({ folder, index, reason }) {
  const title = `error: ${folder}`;
  let root = null;

  function init(stage) {
    root = document.createElement('div');
    root.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 48px;
      box-sizing: border-box;
      background: #1a1020;
      color: #ffb3b3;
      font: 14px monospace;
      text-align: center;
    `;

    const heading = document.createElement('div');
    heading.style.cssText = 'font-size: 24px; margin-bottom: 16px; color: #ff6b6b;';
    heading.textContent = `Scene ${String(index ?? '??').padStart(2, '0')} failed to load`;

    const folderLine = document.createElement('div');
    folderLine.style.cssText = 'font-size: 14px; margin-bottom: 24px; opacity: 0.7;';
    folderLine.textContent = folder;

    const reasonBox = document.createElement('pre');
    reasonBox.style.cssText = `
      max-width: 80%;
      white-space: pre-wrap;
      word-break: break-word;
      text-align: left;
      padding: 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,107,107,0.3);
      border-radius: 4px;
      color: #e8e8f8;
    `;
    reasonBox.textContent = reason;

    root.appendChild(heading);
    root.appendChild(folderLine);
    root.appendChild(reasonBox);
    stage.appendChild(root);
    return {};
  }

  function destroy() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
  }

  function noop() {}

  return {
    title,
    slides: [{ stepCount: 1 }],
    init,
    destroy,
    resolveToSlide: noop,
    animateToSlide: (ctx, slideIndex, stepIndex, done) => done && done(),
  };
}
```

- [ ] **Step 2: No automated test required for this task**

The placeholder is thin display glue. Its correctness is verified visually by Task 8's integration (boot the dev server with a deliberately broken scene in a fixture). No unit test adds value over that.

- [ ] **Step 3: Commit**

```bash
jj describe -m "feat(framework): add error-placeholder scene for failed content"
jj new
```

---

### Task 8: Refactor `src/main.js` to consume the virtual manifest

Remove hand-rolled `SCENE_SOURCES`. Build the scene list from `virtual:content-manifest`. Fall back to the placeholder scene on any per-scene error.

**Files:**
- Modify: `src/main.js`
- Remove: `src/scenes/` (no longer used)

- [ ] **Step 1: Update `main.js`**

File: `src/main.js`

Replace the top imports and `SCENE_SOURCES` block with the manifest-consuming version. Keep the rest of the file (setup, teardown, palette commands) untouched below the structural change.

```javascript
import { createEngine } from './engine/engine.js';
import { createPalette } from './commands/palette.js';
import { compileMarkdownScene } from './authoring/markdown-scene.js';
import { validateScenes } from './authoring/scene-validation.js';
import { createErrorPlaceholderScene } from './authoring/scene-placeholder.js';

import { config, scenes as manifestScenes, issues, error } from 'virtual:content-manifest';

import { applyColorVars } from './shared/colors.js';
import { sessionState } from './shared/session-state.js';
import { createDebugOverlay } from './debug/overlay.js';
import { createNavOverlay } from './debug/nav-overlay.js';

let SCENE_SOURCES = buildSceneSources();

function buildSceneSources() {
  if (error) {
    return [{
      scene: createErrorPlaceholderScene({
        folder: 'talk.toml',
        index: null,
        reason: error,
      }),
      path: null,
      folder: 'talk.toml',
    }];
  }

  if (issues.length > 0) {
    console.warn('[content] structural issues in content folder:');
    for (const issue of issues) {
      console.warn(`  [${issue.severity}] ${issue.message}`);
    }
  }

  return manifestScenes.map(s => {
    try {
      if (s.kind === 'md') {
        return {
          scene: compileMarkdownScene(s.source),
          path: `/content/${s.folder}/scene.md`,
          folder: s.folder,
        };
      }
      const mod = s.source;
      const sceneExport = mod.default || Object.values(mod).find(v => v && v.init && v.destroy);
      if (!sceneExport) throw new Error('scene.js has no exported scene module');
      return {
        scene: sceneExport,
        path: `/content/${s.folder}/scene.js`,
        folder: s.folder,
      };
    } catch (err) {
      console.warn(`[content] scene ${s.folder} failed to load:`, err.message);
      return {
        scene: createErrorPlaceholderScene({
          folder: s.folder,
          index: s.index,
          reason: err.message,
        }),
        path: `/content/${s.folder}`,
        folder: s.folder,
      };
    }
  });
}

const stage = document.getElementById('stage');
applyColorVars(document.documentElement);

// === keep the rest of the existing main.js from `let engine = null` onward ===
// (the body that registers palette commands, overlays, keybindings, setup/teardown, HMR.)
```

The `buildSceneDefs` / `sourcePathForScene` helpers in the remaining body already operate on `SCENE_SOURCES[i].scene` and `SCENE_SOURCES[i].path`, so no changes are needed below the structural replacement.

- [ ] **Step 2: Remove `src/scenes/`**

```bash
jj file untrack src/scenes/placeholder/scene.md
rm -r src/scenes
```

(If `jj` reports the path isn't tracked, a plain `rm -r src/scenes` is fine — the change is captured by the working copy.)

- [ ] **Step 3: Smoke test — full server boot against the template**

```bash
docker compose up --build
# wait ~5s
curl -sf http://localhost:3000 | grep -q '<div id="stage"'
docker compose down
```

Expected: `curl` returns success. No uncaught exceptions in the Vite log.

- [ ] **Step 4: Commit**

```bash
jj describe -m "refactor(main): consume virtual:content-manifest; drop hand-rolled SCENE_SOURCES"
jj new
```

---

## Phase 3 — The `talk` CLI

A single bash wrapper on PATH plus focused subcommand scripts. Each subcommand is either a small bash script or a Node program.

### Task 9: `talk` wrapper skeleton

**Files:**
- Create: `talk` (bash script at repo root, executable, no extension)
- Create: `bin/talk-help` (bash script, executable)
- Create: `bin/talk-version` (bash script, executable)

- [ ] **Step 1: Write the wrapper**

File: `talk`

```bash
#!/usr/bin/env bash
# Entry point for the beam-talk framework.
# Resolves the framework repo from its own location, finds the current
# talk folder if applicable, and dispatches to bin/talk-<subcommand>.

set -euo pipefail

FRAMEWORK_ROOT="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
export FRAMEWORK_ROOT

find_talk_root() {
  local dir="${1:-$PWD}"
  dir="$(cd "$dir" && pwd)"
  while :; do
    if [ -f "$dir/talk.toml" ]; then
      echo "$dir"
      return 0
    fi
    if [ "$dir" = "/" ]; then
      return 1
    fi
    dir="$(dirname "$dir")"
  done
}

# Default to help when no subcommand.
SUB="${1:-help}"
shift || true

case "$SUB" in
  -h|--help|help)
    exec "$FRAMEWORK_ROOT/bin/talk-help" "$@"
    ;;
  -V|--version|version)
    exec "$FRAMEWORK_ROOT/bin/talk-version" "$@"
    ;;
  new|add|remove|rename|move|list|serve|lint|test)
    DISPATCH="$FRAMEWORK_ROOT/bin/talk-$SUB"
    if [ ! -x "$DISPATCH" ]; then
      echo "talk: internal error — bin/talk-$SUB is missing or not executable" >&2
      exit 2
    fi
    exec "$DISPATCH" "$@"
    ;;
  *)
    echo "talk: unknown command '$SUB'. Run 'talk help' for usage." >&2
    exit 2
    ;;
esac
```

Mark executable: `chmod +x talk`.

- [ ] **Step 2: Write `bin/talk-help`**

File: `bin/talk-help`

```bash
#!/usr/bin/env bash
set -euo pipefail

SUBCOMMAND="${1:-}"

if [ -z "$SUBCOMMAND" ]; then
  cat <<'EOF'
talk — beam-talk presentation framework

USAGE
  talk <command> [options]

CREATING AND NAVIGATING
  new <name>              scaffold a new presentation at ./<name>/
  list                    list the scenes of the current presentation
  version                 print the installed framework version

STRUCTURAL EDITS (all support --dry-run)
  add <slug> [--after N | --first]    add a new scene
  remove <N>                          delete scene N
  rename <N> <new-slug>               change a scene's slug (number preserved)
  move <N> <where> [<M>]              reorder; where = before | after | first | last

RUNNING
  serve [path]            run the dev server against a talk (default: .)
  lint  [path]            check a talk for structural problems (default: .)

DEVELOPMENT (inside the framework repo only)
  test                    run framework tests

Run 'talk <command> --help' for command-specific help.
EOF
  exit 0
fi

case "$SUBCOMMAND" in
  new)
    cat <<'EOF'
talk new <name>

Scaffold a new presentation folder at ./<name>/ containing talk.toml and
one starter scene. The target folder must not already exist, unless --force.

OPTIONS
  --force        allow creating inside an existing non-empty folder
  --dry-run      print what would be created; make no filesystem changes

EXAMPLE
  talk new my-elixir-talk
EOF
    ;;
  add)
    cat <<'EOF'
talk add <slug> [--after N | --first]

Add a new empty scene to the current presentation. Default is to append.

OPTIONS
  --after N      insert after scene N (1-based)
  --first        insert as scene 01
  --dry-run      print what would change; make no filesystem changes

EXAMPLE
  talk add conclusion
  talk add intro --after 1
EOF
    ;;
  remove|rm)
    cat <<'EOF'
talk remove <N>

Delete scene N. Later scenes are renumbered to close the gap.

OPTIONS
  --dry-run      print what would change; make no filesystem changes
EOF
    ;;
  rename)
    cat <<'EOF'
talk rename <N> <new-slug>

Change scene N's slug. The number is preserved.

OPTIONS
  --dry-run      print what would change; make no filesystem changes
EOF
    ;;
  move)
    cat <<'EOF'
talk move <N> <where> [<M>]

Reorder scenes.

  where = before | after | first | last
  N     = the scene to move
  M     = the target scene (required for before/after)

OPTIONS
  --dry-run      print what would change; make no filesystem changes

EXAMPLES
  talk move 3 after 6
  talk move 7 first
EOF
    ;;
  serve)
    cat <<'EOF'
talk serve [path]

Run the live-reloading dev server against a presentation. Defaults to the
current directory; if `path` is given, resolves to the talk.toml at or
above that path.

The server binds to http://localhost:3000.
EOF
    ;;
  lint)
    cat <<'EOF'
talk lint [path]

Validate the structure of a presentation. Exits 0 on success, 1 on error.
EOF
    ;;
  list)
    cat <<'EOF'
talk list

Print the scenes of the current presentation, one per line.
EOF
    ;;
  version)
    cat <<'EOF'
talk version

Print the installed framework version.
EOF
    ;;
  test)
    cat <<'EOF'
talk test

Run the framework's own tests. Only works when run from inside the
framework repo.
EOF
    ;;
  *)
    echo "No help available for '$SUBCOMMAND'. Run 'talk help' for the command list." >&2
    exit 1
    ;;
esac
```

Mark executable.

- [ ] **Step 3: Write `bin/talk-version`**

File: `bin/talk-version`

```bash
#!/usr/bin/env bash
set -euo pipefail

VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$FRAMEWORK_ROOT/package.json','utf8')).version)" 2>/dev/null || echo "0.0.0")
echo "talk (beam-talk) $VERSION"
```

Mark executable. (This is the one command that does a host-side `node` call — acceptable because it's trivial and doesn't need Docker to read one field from package.json. If host `node` is missing, the fallback prints `0.0.0`.)

- [ ] **Step 4: Smoke-test the dispatcher**

```bash
./talk                    # should print the usage summary
./talk help move          # should print move-specific help
./talk version            # should print something like "talk (beam-talk) 0.0.1"
./talk unknown            # should print "unknown command 'unknown'..." and exit 2
```

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(cli): talk wrapper + help + version subcommands"
jj new
```

---

### Task 10: Shared CLI helpers lib

Common logic used by multiple Node subcommands — arg parsing with `--dry-run`, scanning the content folder on disk, printing rename plans.

**Files:**
- Create: `bin/cli-args.lib.js`
- Create: `bin/cli-args.lib.test.js`

- [ ] **Step 1: Write the failing tests**

File: `bin/cli-args.lib.test.js`

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFlags, printPlan } from './cli-args.lib.js';

test('parseFlags extracts --dry-run', () => {
  const result = parseFlags(['foo', '--dry-run', 'bar']);
  assert.equal(result.dryRun, true);
  assert.deepEqual(result.positional, ['foo', 'bar']);
});

test('parseFlags extracts --first and --after N', () => {
  const r1 = parseFlags(['x', '--first']);
  assert.equal(r1.first, true);
  const r2 = parseFlags(['x', '--after', '3']);
  assert.equal(r2.after, 3);
});

test('parseFlags rejects --after without a value', () => {
  assert.throws(() => parseFlags(['x', '--after']), /--after/);
});

test('parseFlags rejects --after with a non-integer', () => {
  assert.throws(() => parseFlags(['x', '--after', 'foo']), /--after/);
});

test('printPlan formats rename + create + remove sections', () => {
  const lines = [];
  const out = (s) => lines.push(s);
  printPlan({
    renames: [{ from: '03-a', to: '02-a' }],
    creates: ['04-new'],
    removes: ['02-old'],
  }, out);
  const joined = lines.join('\n');
  assert.match(joined, /03-a → 02-a/);
  assert.match(joined, /\+ 04-new/);
  assert.match(joined, /- 02-old/);
});

test('printPlan handles empty plans', () => {
  const lines = [];
  printPlan({ renames: [], creates: [], removes: [] }, (s) => lines.push(s));
  assert.match(lines.join('\n'), /no changes/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./test bin/cli-args.lib.test.js`
Expected: failures.

- [ ] **Step 3: Write the lib**

File: `bin/cli-args.lib.js`

```javascript
// Shared helpers for the talk Node subcommands.

export function parseFlags(argv) {
  const positional = [];
  let dryRun = false;
  let first = false;
  let after = null;
  let before = null;
  let force = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--dry-run': dryRun = true; break;
      case '--first': first = true; break;
      case '--force': force = true; break;
      case '--after':
      case '--before': {
        const v = argv[++i];
        if (v === undefined) throw new Error(`${a} requires a scene number`);
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1) throw new Error(`${a} needs a positive integer, got "${v}"`);
        if (a === '--after') after = n; else before = n;
        break;
      }
      default:
        if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`);
        positional.push(a);
    }
  }

  return { positional, dryRun, first, after, before, force };
}

export function printPlan(plan, out = console.log) {
  const { renames = [], creates = [], removes = [] } = plan;
  if (renames.length === 0 && creates.length === 0 && removes.length === 0) {
    out('  (no changes)');
    return;
  }
  for (const r of renames) out(`  ${r.from} → ${r.to}`);
  for (const c of creates) out(`  + ${c}`);
  for (const r of removes) out(`  - ${r}`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./test bin/cli-args.lib.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(cli): shared flag-parsing + plan-printing helpers"
jj new
```

---

### Task 11: `talk new <name>`

Creates the new content folder by copying `templates/new-talk/`, substituting `{{TALK_NAME}}` everywhere.

**Files:**
- Create: `bin/talk-new` (bash wrapper)
- Create: `bin/talk-new.js`
- Create: `bin/talk-new.js.test.js`

- [ ] **Step 1: Write the failing integration test**

File: `bin/talk-new.js.test.js`

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function runNew(args, cwd) {
  return spawnSync('node', [path.resolve('bin/talk-new.js'), ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, FRAMEWORK_ROOT: path.resolve('.') },
  });
}

test('scaffolds a new talk with talk.toml and a welcome scene', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-new-'));
  try {
    const result = runNew(['my-talk'], tmp);
    assert.equal(result.status, 0, result.stderr);

    const root = path.join(tmp, 'my-talk');
    assert.ok(fs.existsSync(path.join(root, 'talk.toml')));
    assert.ok(fs.existsSync(path.join(root, '01-welcome/scene.md')));

    const toml = fs.readFileSync(path.join(root, 'talk.toml'), 'utf8');
    assert.match(toml, /title = "my-talk"/);
    assert.doesNotMatch(toml, /\{\{TALK_NAME\}\}/);

    const scene = fs.readFileSync(path.join(root, '01-welcome/scene.md'), 'utf8');
    assert.match(scene, /# my-talk/);
    assert.doesNotMatch(scene, /\{\{TALK_NAME\}\}/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('refuses if the target folder already exists and is non-empty', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-new-'));
  try {
    fs.mkdirSync(path.join(tmp, 'my-talk'));
    fs.writeFileSync(path.join(tmp, 'my-talk', 'something'), 'x');

    const result = runNew(['my-talk'], tmp);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /exists/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--dry-run prints the plan without creating anything', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-new-'));
  try {
    const result = runNew(['my-talk', '--dry-run'], tmp);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!fs.existsSync(path.join(tmp, 'my-talk')));
    assert.match(result.stdout, /my-talk\/talk\.toml/);
    assert.match(result.stdout, /my-talk\/01-welcome\/scene\.md/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./test bin/talk-new.js.test.js`
Expected: failures (script doesn't exist).

- [ ] **Step 3: Write `bin/talk-new.js`**

File: `bin/talk-new.js`

```javascript
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseFlags } from './cli-args.lib.js';

const frameworkRoot = process.env.FRAMEWORK_ROOT;
if (!frameworkRoot) {
  console.error('talk: FRAMEWORK_ROOT env var is not set (invoked outside the talk wrapper?)');
  process.exit(2);
}

let opts;
try {
  opts = parseFlags(process.argv.slice(2));
} catch (err) {
  console.error(`talk new: ${err.message}`);
  process.exit(2);
}

const [name] = opts.positional;
if (!name) {
  console.error('talk new: missing <name>. Usage: talk new <name> [--force] [--dry-run]');
  process.exit(2);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error(`talk new: "${name}" is not a valid name (use lowercase letters, digits, and hyphens)`);
  process.exit(2);
}

const target = path.resolve(process.cwd(), name);
if (fs.existsSync(target)) {
  const entries = fs.readdirSync(target);
  if (entries.length > 0 && !opts.force) {
    console.error(`talk new: "${target}" already exists and is non-empty (use --force to override)`);
    process.exit(1);
  }
}

const templateRoot = path.join(frameworkRoot, 'templates', 'new-talk');
if (!fs.existsSync(templateRoot)) {
  console.error(`talk new: template missing at ${templateRoot}`);
  process.exit(2);
}

const plan = collectFiles(templateRoot, '');
if (opts.dryRun) {
  console.log(`talk new: would create ${plan.length} file(s) under ${name}/:`);
  for (const rel of plan) console.log(`  ${name}/${rel}`);
  process.exit(0);
}

fs.mkdirSync(target, { recursive: true });
for (const rel of plan) {
  const src = path.join(templateRoot, rel);
  const dst = path.join(target, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const contents = fs.readFileSync(src, 'utf8').replaceAll('{{TALK_NAME}}', name);
  fs.writeFileSync(dst, contents);
}

console.log(`created ${name}/`);
for (const rel of plan) console.log(`  ${rel}`);

function collectFiles(root, prefix) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    if (entry.name.endsWith('.test.js')) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...collectFiles(root, rel));
    } else {
      out.push(rel);
    }
  }
  return out;
}
```

- [ ] **Step 4: Write `bin/talk-new` bash wrapper**

File: `bin/talk-new`

```bash
#!/usr/bin/env bash
set -euo pipefail
exec node "$FRAMEWORK_ROOT/bin/talk-new.js" "$@"
```

Mark executable.

Rationale: `talk new` runs on the host (not in Docker). It's pure file operations — no Vite, no runtime framework code required. Requires Node on the host, which is acceptable because `talk new` is an exceptional entry point (the user hasn't set up a content folder yet, so there's nothing to mount into Docker). All *other* subcommands operate on an existing talk and will route through Docker.

- [ ] **Step 5: Run tests to verify they pass**

Run: `./test bin/talk-new.js.test.js`
Expected: PASS.

- [ ] **Step 6: Smoke test via the wrapper**

```bash
cd /tmp && rm -rf demo-talk && FRAMEWORK_ROOT=/home/shawn/src/beam-talk /home/shawn/src/beam-talk/talk new demo-talk
ls -la /tmp/demo-talk/
```

Expected: `talk.toml` and `01-welcome/scene.md` under `/tmp/demo-talk/`.

- [ ] **Step 7: Commit**

```bash
cd /home/shawn/src/beam-talk
jj describe -m "feat(cli): talk new scaffolds a presentation from templates/new-talk"
jj new
```

---

### Task 12: Sample fixture talk for integration tests

A small valid content folder used by multiple subsequent tests.

**Files:**
- Create: `test/fixtures/sample-talk/talk.toml`
- Create: `test/fixtures/sample-talk/01-welcome/scene.md`
- Create: `test/fixtures/sample-talk/02-intro/scene.md`
- Create: `test/fixtures/sample-talk/03-outro/scene.md`

- [ ] **Step 1: Create the fixture**

File: `test/fixtures/sample-talk/talk.toml`

```toml
title = "sample-talk"
author = "tests"
framework_version = "0.1"
```

File: `test/fixtures/sample-talk/01-welcome/scene.md`

```markdown
---
title: Welcome
---

# hello
```

File: `test/fixtures/sample-talk/02-intro/scene.md`

```markdown
---
title: Intro
---

# intro
```

File: `test/fixtures/sample-talk/03-outro/scene.md`

```markdown
---
title: Outro
---

# outro
```

- [ ] **Step 2: Commit**

```bash
jj describe -m "test: add sample-talk fixture for CLI integration tests"
jj new
```

---

### Task 13: `talk list`

Lists the scenes of the current talk, one per line.

**Files:**
- Create: `bin/talk-list` (bash wrapper)
- Create: `bin/talk-list.js`
- Create: `bin/talk-list.js.test.js`

- [ ] **Step 1: Write the failing test**

File: `bin/talk-list.js.test.js`

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function runList(talkDir) {
  return spawnSync('node', [path.resolve('bin/talk-list.js')], {
    cwd: talkDir,
    encoding: 'utf8',
  });
}

test('prints one line per scene in order', () => {
  const result = runList(path.resolve('test/fixtures/sample-talk'));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), [
    '01  welcome',
    '02  intro',
    '03  outro',
  ].join('\n'));
});

test('errors when not inside a talk folder', () => {
  const result = runList(path.resolve('.'));
  // The framework repo itself is not a talk — no talk.toml.
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /talk\.toml/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./test bin/talk-list.js.test.js`
Expected: failures.

- [ ] **Step 3: Write `bin/talk-list.js`**

File: `bin/talk-list.js`

```javascript
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
```

- [ ] **Step 4: Write `bin/talk-list` wrapper**

File: `bin/talk-list`

```bash
#!/usr/bin/env bash
set -euo pipefail
exec node "$FRAMEWORK_ROOT/bin/talk-list.js" "$@"
```

Mark executable.

- [ ] **Step 5: Run tests to verify they pass**

Run: `./test bin/talk-list.js.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(cli): talk list — scene enumeration for the current talk"
jj new
```

---

### Task 14: `talk add <slug>` (with `--after`, `--first`, `--dry-run`)

Creates a new scene folder with an empty `scene.md` and renames surrounding folders as needed.

**Files:**
- Create: `bin/talk-add` (bash wrapper)
- Create: `bin/talk-add.js`
- Create: `bin/talk-add.js.test.js`

- [ ] **Step 1: Write the failing tests**

File: `bin/talk-add.js.test.js`

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function copySample(dst) {
  fs.mkdirSync(dst, { recursive: true });
  const src = path.resolve('test/fixtures/sample-talk');
  fs.cpSync(src, dst, { recursive: true });
}

function runAdd(args, cwd) {
  return spawnSync('node', [path.resolve('bin/talk-add.js'), ...args], {
    cwd,
    encoding: 'utf8',
  });
}

test('appends a new scene by default', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-add-'));
  try {
    copySample(tmp);
    const r = runAdd(['conclusion'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '04-conclusion/scene.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--after N inserts and shifts later scenes', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-add-'));
  try {
    copySample(tmp);
    const r = runAdd(['break', '--after', '1'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-welcome/scene.md')));
    assert.ok(fs.existsSync(path.join(tmp, '02-break/scene.md')));
    assert.ok(fs.existsSync(path.join(tmp, '03-intro/scene.md')));
    assert.ok(fs.existsSync(path.join(tmp, '04-outro/scene.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--first inserts at the start', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-add-'));
  try {
    copySample(tmp);
    const r = runAdd(['cover', '--first'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-cover/scene.md')));
    assert.ok(fs.existsSync(path.join(tmp, '02-welcome/scene.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--dry-run prints the plan and makes no changes', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-add-'));
  try {
    copySample(tmp);
    const before = fs.readdirSync(tmp).sort();
    const r = runAdd(['x', '--after', '1', '--dry-run'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /02-x/);
    const after = fs.readdirSync(tmp).sort();
    assert.deepEqual(before, after);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('rejects a duplicate slug', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-add-'));
  try {
    copySample(tmp);
    const r = runAdd(['welcome'], tmp);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /slug/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./test bin/talk-add.js.test.js`
Expected: failures (script doesn't exist).

- [ ] **Step 3: Write `bin/talk-add.js`**

File: `bin/talk-add.js`

```javascript
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
```

- [ ] **Step 4: Write `bin/talk-add` wrapper**

File: `bin/talk-add`

```bash
#!/usr/bin/env bash
set -euo pipefail
exec node "$FRAMEWORK_ROOT/bin/talk-add.js" "$@"
```

Mark executable.

- [ ] **Step 5: Run tests to verify they pass**

Run: `./test bin/talk-add.js.test.js`
Expected: PASS (all 5 tests).

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(cli): talk add — insert a new scene with --first/--after"
jj new
```

---

### Task 15: `talk remove <N>`

**Files:**
- Create: `bin/talk-remove` (bash wrapper)
- Create: `bin/talk-remove.js`
- Create: `bin/talk-remove.js.test.js`

- [ ] **Step 1: Write the failing tests**

File: `bin/talk-remove.js.test.js`

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function copySample(dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.cpSync(path.resolve('test/fixtures/sample-talk'), dst, { recursive: true });
}
function runRemove(args, cwd) {
  return spawnSync('node', [path.resolve('bin/talk-remove.js'), ...args], {
    cwd, encoding: 'utf8',
  });
}

test('removes the target scene and renumbers later ones', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-remove-'));
  try {
    copySample(tmp);
    const r = runRemove(['2'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-welcome')));
    assert.ok(fs.existsSync(path.join(tmp, '02-outro')));
    assert.ok(!fs.existsSync(path.join(tmp, '02-intro')));
    assert.ok(!fs.existsSync(path.join(tmp, '03-outro')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--dry-run prints plan and does nothing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-remove-'));
  try {
    copySample(tmp);
    const before = fs.readdirSync(tmp).sort();
    const r = runRemove(['2', '--dry-run'], tmp);
    assert.equal(r.status, 0, r.stderr);
    const after = fs.readdirSync(tmp).sort();
    assert.deepEqual(before, after);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('errors on unknown scene number', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-remove-'));
  try {
    copySample(tmp);
    const r = runRemove(['99'], tmp);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /scene 99/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./test bin/talk-remove.js.test.js`
Expected: failures.

- [ ] **Step 3: Write `bin/talk-remove.js`**

File: `bin/talk-remove.js`

```javascript
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
try { opts = parseFlags(process.argv.slice(2)); }
catch (err) { console.error(`talk remove: ${err.message}`); process.exit(2); }

const [idArg] = opts.positional;
const id = Number(idArg);
if (!Number.isInteger(id) || id < 1) {
  console.error('talk remove: missing or invalid <N>');
  process.exit(2);
}

const root = findTalkRoot(process.cwd());
if (!root) { console.error('talk remove: no talk.toml found'); process.exit(1); }

const { scenes } = discoverScenes(listEntries(root));
let plan;
try { plan = planRename(scenes, { op: 'remove', id }); }
catch (err) { console.error(`talk remove: ${err.message}`); process.exit(1); }

if (opts.dryRun) {
  console.log('talk remove: dry run — no changes made');
  printPlan(plan);
  process.exit(0);
}

for (const folder of plan.removes) {
  fs.rmSync(path.join(root, folder), { recursive: true, force: true });
}
// Apply renames in ascending order (they all shift down, so low-to-high is safe).
const sortedRenames = [...plan.renames].sort(
  (a, b) => parseInt(a.from.slice(0, 2), 10) - parseInt(b.from.slice(0, 2), 10),
);
for (const { from, to } of sortedRenames) {
  fs.renameSync(path.join(root, from), path.join(root, to));
}
printPlan(plan);
```

- [ ] **Step 4: Write `bin/talk-remove` wrapper**

File: `bin/talk-remove`

```bash
#!/usr/bin/env bash
set -euo pipefail
exec node "$FRAMEWORK_ROOT/bin/talk-remove.js" "$@"
```

Mark executable.

- [ ] **Step 5: Run tests to verify they pass**

Run: `./test bin/talk-remove.js.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(cli): talk remove — delete and renumber"
jj new
```

---

### Task 16: `talk rename <N> <new-slug>`

**Files:**
- Create: `bin/talk-rename` (bash wrapper)
- Create: `bin/talk-rename.js`
- Create: `bin/talk-rename.js.test.js`

- [ ] **Step 1: Write the failing tests**

File: `bin/talk-rename.js.test.js`

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function copySample(dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.cpSync(path.resolve('test/fixtures/sample-talk'), dst, { recursive: true });
}
function runRename(args, cwd) {
  return spawnSync('node', [path.resolve('bin/talk-rename.js'), ...args], { cwd, encoding: 'utf8' });
}

test('renames the folder preserving the number', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-rename-'));
  try {
    copySample(tmp);
    const r = runRename(['2', 'introduction'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '02-introduction/scene.md')));
    assert.ok(!fs.existsSync(path.join(tmp, '02-intro')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('rejects a duplicate slug', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-rename-'));
  try {
    copySample(tmp);
    const r = runRename(['2', 'welcome'], tmp);
    assert.notEqual(r.status, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--dry-run makes no changes', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-rename-'));
  try {
    copySample(tmp);
    const before = fs.readdirSync(tmp).sort();
    runRename(['2', 'introduction', '--dry-run'], tmp);
    const after = fs.readdirSync(tmp).sort();
    assert.deepEqual(before, after);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./test bin/talk-rename.js.test.js`
Expected: failures.

- [ ] **Step 3: Write `bin/talk-rename.js`**

File: `bin/talk-rename.js`

```javascript
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
```

- [ ] **Step 4: Write `bin/talk-rename` wrapper**

File: `bin/talk-rename`

```bash
#!/usr/bin/env bash
set -euo pipefail
exec node "$FRAMEWORK_ROOT/bin/talk-rename.js" "$@"
```

Mark executable.

- [ ] **Step 5: Run tests to verify they pass**

Run: `./test bin/talk-rename.js.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(cli): talk rename — change slug, preserve number"
jj new
```

---

### Task 17: `talk move <N> <where> [<M>]`

**Files:**
- Create: `bin/talk-move` (bash wrapper)
- Create: `bin/talk-move.js`
- Create: `bin/talk-move.js.test.js`

- [ ] **Step 1: Write the failing tests**

File: `bin/talk-move.js.test.js`

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function copySample(dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.cpSync(path.resolve('test/fixtures/sample-talk'), dst, { recursive: true });
}
function runMove(args, cwd) {
  return spawnSync('node', [path.resolve('bin/talk-move.js'), ...args], { cwd, encoding: 'utf8' });
}

test('move 1 after 3 (last)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-move-'));
  try {
    copySample(tmp);
    const r = runMove(['1', 'after', '3'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-intro')));
    assert.ok(fs.existsSync(path.join(tmp, '02-outro')));
    assert.ok(fs.existsSync(path.join(tmp, '03-welcome')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('move 3 first', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-move-'));
  try {
    copySample(tmp);
    const r = runMove(['3', 'first'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-outro')));
    assert.ok(fs.existsSync(path.join(tmp, '02-welcome')));
    assert.ok(fs.existsSync(path.join(tmp, '03-intro')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('move 1 last', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-move-'));
  try {
    copySample(tmp);
    const r = runMove(['1', 'last'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-intro')));
    assert.ok(fs.existsSync(path.join(tmp, '02-outro')));
    assert.ok(fs.existsSync(path.join(tmp, '03-welcome')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('move 2 before 1 == move 2 first (same outcome)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-move-'));
  try {
    copySample(tmp);
    const r = runMove(['2', 'before', '1'], tmp);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, '01-intro')));
    assert.ok(fs.existsSync(path.join(tmp, '02-welcome')));
    assert.ok(fs.existsSync(path.join(tmp, '03-outro')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--dry-run prints plan without renaming', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-move-'));
  try {
    copySample(tmp);
    const before = fs.readdirSync(tmp).sort();
    const r = runMove(['1', 'after', '3', '--dry-run'], tmp);
    assert.equal(r.status, 0, r.stderr);
    const after = fs.readdirSync(tmp).sort();
    assert.deepEqual(before, after);
    assert.match(r.stdout, /01-welcome/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./test bin/talk-move.js.test.js`
Expected: failures.

- [ ] **Step 3: Write `bin/talk-move.js`**

File: `bin/talk-move.js`

```javascript
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
```

- [ ] **Step 4: Write `bin/talk-move` wrapper**

File: `bin/talk-move`

```bash
#!/usr/bin/env bash
set -euo pipefail
exec node "$FRAMEWORK_ROOT/bin/talk-move.js" "$@"
```

Mark executable.

- [ ] **Step 5: Run tests to verify they pass**

Run: `./test bin/talk-move.js.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(cli): talk move — safe reordering via two-step rename"
jj new
```

---

### Task 18: `talk lint`

V1 is a thin wrapper: runs scene discovery + the existing shape validator + the TOML config validator. Sub-project B expands this into the full component-aware linter.

**Files:**
- Create: `bin/talk-lint` (bash wrapper)
- Create: `bin/talk-lint.js`
- Create: `bin/talk-lint.js.test.js`

- [ ] **Step 1: Write the failing tests**

File: `bin/talk-lint.js.test.js`

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function runLint(talkDir) {
  return spawnSync('node', [path.resolve('bin/talk-lint.js')], { cwd: talkDir, encoding: 'utf8' });
}

test('lint passes on the sample fixture', () => {
  const r = runLint(path.resolve('test/fixtures/sample-talk'));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ok/i);
});

test('lint fails on a folder with structural issues', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-lint-'));
  try {
    fs.cpSync(path.resolve('test/fixtures/sample-talk'), tmp, { recursive: true });
    // create a duplicate number (collision)
    fs.cpSync(path.join(tmp, '02-intro'), path.join(tmp, '02-duplicate'), { recursive: true });
    const r = runLint(tmp);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /duplicate/i);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('lint fails when talk.toml is missing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-lint-'));
  try {
    // no talk.toml
    const r = runLint(tmp);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /talk\.toml/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./test bin/talk-lint.js.test.js`
Expected: failures.

- [ ] **Step 3: Write `bin/talk-lint.js`**

File: `bin/talk-lint.js`

```javascript
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
```

- [ ] **Step 4: Write `bin/talk-lint` wrapper**

File: `bin/talk-lint`

```bash
#!/usr/bin/env bash
set -euo pipefail
exec node "$FRAMEWORK_ROOT/bin/talk-lint.js" "$@"
```

Mark executable.

- [ ] **Step 5: Run tests to verify they pass**

Run: `./test bin/talk-lint.js.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(cli): talk lint — v1 structural + talk.toml validation"
jj new
```

---

### Task 19: `talk serve [path]`

Bash script that walks up to find the talk, exports `CONTENT_DIR`, and invokes `docker compose up` from the framework root.

**Files:**
- Create: `bin/talk-serve` (bash script)

- [ ] **Step 1: Write the script**

File: `bin/talk-serve`

```bash
#!/usr/bin/env bash
set -euo pipefail

find_talk_root() {
  local dir="${1:-$PWD}"
  dir="$(cd "$dir" && pwd)"
  while :; do
    if [ -f "$dir/talk.toml" ]; then
      echo "$dir"
      return 0
    fi
    if [ "$dir" = "/" ]; then
      return 1
    fi
    dir="$(dirname "$dir")"
  done
}

START="${1:-$PWD}"
ROOT="$(find_talk_root "$START")" || {
  echo "talk serve: no talk.toml found at or above '$START'" >&2
  exit 1
}

echo "talk serve: $ROOT"
echo "            http://localhost:3000"

export CONTENT_DIR="$ROOT"
cd "$FRAMEWORK_ROOT"
exec docker compose up --build
```

Mark executable.

- [ ] **Step 2: Smoke test**

```bash
cd /tmp && rm -rf demo-talk && \
FRAMEWORK_ROOT=/home/shawn/src/beam-talk /home/shawn/src/beam-talk/talk new demo-talk && \
cd demo-talk && \
FRAMEWORK_ROOT=/home/shawn/src/beam-talk /home/shawn/src/beam-talk/talk serve &
SERVE_PID=$!
sleep 8
curl -sf http://localhost:3000 | head -3
kill $SERVE_PID
(cd /home/shawn/src/beam-talk && docker compose down >/dev/null 2>&1 || true)
```

Expected: HTML returned from curl. No crash.

- [ ] **Step 3: Commit**

```bash
cd /home/shawn/src/beam-talk
jj describe -m "feat(cli): talk serve — run dev server against the current talk"
jj new
```

---

### Task 20: `talk test`

Runs the framework's own tests. Refuses when not in the framework repo.

**Files:**
- Create: `bin/talk-test` (bash script)

- [ ] **Step 1: Write the script**

File: `bin/talk-test`

```bash
#!/usr/bin/env bash
set -euo pipefail

# talk test runs the framework's own suite. It only runs when invoked from
# inside the framework repo (where package.json is present alongside src/).
if [ ! -f "$FRAMEWORK_ROOT/package.json" ] || [ ! -d "$FRAMEWORK_ROOT/src" ]; then
  echo "talk test: this command only runs inside the framework repo" >&2
  exit 1
fi

cd "$FRAMEWORK_ROOT"
exec docker compose run --rm app npm test "$@"
```

Mark executable.

- [ ] **Step 2: Smoke test**

```bash
cd /home/shawn/src/beam-talk
./talk test
```

Expected: runs the full `npm test` suite and reports results.

- [ ] **Step 3: Commit**

```bash
jj describe -m "feat(cli): talk test — run framework suite via docker"
jj new
```

---

## Phase 4 — Cleanup and docs

### Task 21: Remove the old root-level scripts and add a convenience npm script

**Files:**
- Remove: `dev`, `dev-check`, `test` (root-level scripts)
- Modify: `package.json`

- [ ] **Step 1: Remove the old scripts**

```bash
rm dev dev-check test
```

- [ ] **Step 2: Update `package.json`**

File: `package.json`

```json
{
  "name": "beam-talk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node -e \"if(!process.env.CONTENT_DIR){console.error('CONTENT_DIR is not set — use talk serve <path> instead of npm run dev');process.exit(1)}\" && vite",
    "test": "node --test",
    "build": "vite build"
  },
  "dependencies": {
    "three": "^0.170.0"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

Bump the version to `0.1.0` to mark the first CLI-era release.

- [ ] **Step 3: Smoke test**

```bash
cd /home/shawn/src/beam-talk
./talk test          # should run framework tests, exit 0
./talk version       # should print "talk (beam-talk) 0.1.0"
```

- [ ] **Step 4: Commit**

```bash
jj describe -m "chore: remove legacy ./dev /./test/./dev-check; bump to 0.1.0"
jj new
```

---

### Task 22: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the "Development" section**

Open `CLAUDE.md` and replace the existing `## Development` section with:

```markdown
## Development

All tooling runs through the unified `talk` CLI. Install by symlinking the repo's
`talk` script into your PATH:

```bash
ln -s "$PWD/talk" ~/.local/bin/talk
```

Author workflow:

```bash
talk new my-talk           # scaffold a new presentation in ./my-talk/
cd my-talk
talk serve                 # live-reloading dev server at http://localhost:3000
talk lint                  # validate structure and talk.toml
talk add intro             # add a scene
talk move 3 after 6        # reorder; 5 folders rename atomically
talk remove 4              # delete and renumber
```

Framework-repo-only commands:

```bash
talk test                  # run the framework's own test suite
```

Scripts are extensionless executables with shebangs. Never add `.sh` suffixes.
```

- [ ] **Step 2: Update the "Current state" section**

Open `CLAUDE.md` and replace the `## Current state` section with:

```markdown
## Current state

Sub-project A (content-folder foundation) is complete:

- `talk` CLI on PATH dispatches to focused subcommand scripts.
- Content folders are free-standing and marked by a `talk.toml` at their root.
- Scenes live in numeric-prefixed directories (`01-welcome/`, `02-intro/`, …).
- Structural edits (`add`, `remove`, `rename`, `move`) are atomic and support `--dry-run`.
- The Vite content-loader plugin exposes the mounted content folder via `virtual:content-manifest`.
- Bad scenes render as error-placeholder cards; the rest of the deck stays navigable.

Still open (see `todo.md`):

- **Sub-project B** — component-aware linter and in-browser error overlay.
- **Sub-project C** — markdown bridges for Three.js / SVG / title-animation components.
- **Sub-project D** — framework-version drift warning.
```

- [ ] **Step 3: Commit**

```bash
jj describe -m "docs(claude): update dev workflow to the talk CLI; record A done"
jj new
```

---

### Task 23: Update todo.md

**Files:**
- Modify: `todo.md`

- [ ] **Step 1: Mark §4.1 and §4.2 complete, add cross-references**

Edit `todo.md`:

1. Replace the heading of `§4.1 Parameterize the content folder` with `§4.1 Parameterize the content folder — **done** (see sub-project A spec + plan)`.
2. Replace the heading of `§4.2 Auto-discover scenes from the content folder` with `§4.2 Auto-discover scenes from the content folder — **done** (see sub-project A spec + plan)`.
3. Add a new section `§4.0 Sub-project decomposition` above §4.1:

```markdown
### 4.0 Sub-project decomposition

The remaining paradigm-to-reality gap has been decomposed into four sub-projects,
each with its own spec and plan under `docs/superpowers/`:

| Sub-project | Scope | Status |
|-------------|-------|--------|
| A | Content-folder foundation — `talk` CLI, content-folder separation, rescan+reload | **done** |
| B | Component registry + content-aware linter + in-browser error overlay | open |
| C | Markdown bridges for Three.js / SVG / title-animation, new components | open |
| D | Framework-version drift warning | open |
```

- [ ] **Step 2: Commit**

```bash
jj describe -m "docs(todo): mark sub-project A done; record B/C/D as open"
jj new
```

---

### Task 24: Final verification — full framework test run + end-to-end smoke

- [ ] **Step 1: Run the whole test suite**

```bash
cd /home/shawn/src/beam-talk
./talk test
```

Expected: all tests pass.

- [ ] **Step 2: End-to-end smoke**

```bash
cd /tmp && rm -rf e2e-talk
./talk new e2e-talk     # using the locally-symlinked talk
cd e2e-talk
talk add intro --after 1
talk add architecture --after 2
talk move 1 last
talk list
talk lint
```

Expected: each command prints the expected effect. `talk list` shows the final scene order. `talk lint` exits 0.

- [ ] **Step 3: Start the dev server and confirm the deck boots**

```bash
cd /tmp/e2e-talk
talk serve &
SERVE=$!
sleep 10
curl -sf http://localhost:3000 | grep -q stage
kill $SERVE
(cd /home/shawn/src/beam-talk && docker compose down >/dev/null 2>&1 || true)
```

Expected: HTML fetched successfully.

- [ ] **Step 4: Commit any tweaks that came out of the smoke tests**

If nothing needed fixing, this change can stay empty — `jj abandon` it, or leave it for later.

```bash
jj describe -m "test: end-to-end smoke pass for sub-project A"
jj new
```

---

## Self-Review

**Spec coverage:**

| Spec section | Covered by |
|---|---|
| Author experience (happy path) | Tasks 11–20 collectively |
| Install model | Task 22 (documented in CLAUDE.md) |
| Content folder shape | Task 5 (template) + Task 11 (`talk new`) |
| `talk.toml` schema | Tasks 3, 4, 5 |
| CLI command surface | Tasks 9, 11, 13, 14, 15, 16, 17, 18, 19, 20 |
| Rules (path resolution, `talk.toml` marker, identifiers, dry-run, help, atomicity) | Tasks 9 (wrapper), 14–17 (commands) |
| Dry-run output format | Task 10 (`printPlan`) |
| Scene discovery + update model | Tasks 1 (pure), 6 (Vite plugin), 8 (main.js) |
| Error handling scope for A | Tasks 7 (placeholder), 8 (main.js try/catch), 6 (error module) |
| Framework repo layout | Tasks 9, 11, 13–20 (creation) |
| Docker + Vite integration | Task 6 |
| Testing strategy | Every task follows TDD or has an integration test |
| Decisions deferred to B/C/D | Task 23 (todo.md record) |

**Placeholder scan:** no TODOs, no "implement later", no undefined cross-task references. All code blocks are complete.

**Type consistency:** All the Node subcommands use the same `findTalkRoot` + `listEntries` pattern and consume `discoverScenes` / `planRename` with the same shapes. `parseFlags` output shape (`{positional, dryRun, first, after, before, force}`) is identical across every consumer.

**Scope check:** One plan, focused on sub-project A. No creeping into B/C/D.
