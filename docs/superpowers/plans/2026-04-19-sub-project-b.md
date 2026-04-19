# Sub-project B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-04-19-sub-project-b-design.md`

**Goal:** Promote every framework-level component into a uniform registry under `src/components/<name>/`, rewrite `talk lint` as content-aware validation via that registry, ship a dev-mode edge banner on last-good render, and add `box-diagram` as the canonical non-built-in markdown-block component.

**Architecture:** Each rendered element (heading, bullet-list, quote, code-fence, paragraph, spacer, box-diagram, content-slide, section-slide, three-scene, svg-scene, title-animation) becomes a component with a uniform descriptor: `{ name, kind, matcher, parse?, validate?, render? }`. A central registry (`src/authoring/component-registry.js`) bootstraps via static imports. The CLI linter and the runtime renderer both dispatch through it. In dev, failed compilations keep the last-good per-scene render mounted and a slim red edge banner surfaces live diagnostics; expand state persists, banner dismisses itself when diagnostics clear.

**Tech Stack:** Node 20 built-in test runner (`node --test`), Vite 6, Three.js, jsdom (new — for banner/registry unit tests with DOM), bash, Docker Compose. No new runtime deps besides `jsdom` as a devDependency.

**Version-control note:** This repo uses **jujutsu (jj)**, not git. Every "commit" step uses:

```bash
jj describe -m "<message>"   # set description on the current change (@)
jj new                       # seal it and start a fresh empty change
```

Never run `git commit`.

**Test command:** `talk test` from the repo root. It runs the full `node --test` suite in Docker. Target: preserve the 184-test baseline from sub-project A, add net-new coverage for each new file.

---

## File structure overview

### New files

**Registry:**
- `src/authoring/component-registry.js` — Map + lookup helpers + bootstrap imports
- `src/authoring/component-registry.test.js` — descriptor shape checks

**Built-in `markdown-block` components** (one folder each):
- `src/components/heading/{component.js, render.js}`
- `src/components/paragraph/{component.js, render.js}`
- `src/components/bullet-list/{component.js, render.js}`
- `src/components/quote/{component.js, render.js}`
- `src/components/code-fence/{component.js, render.js}`
- `src/components/spacer/{component.js, render.js}`

**`box-diagram` component** (custom `markdown-block`):
- `src/components/box-diagram/component.js`
- `src/components/box-diagram/parse.lib.js` + `.test.js`
- `src/components/box-diagram/validate.lib.js` + `.test.js`
- `src/components/box-diagram/render.js`

**Scene-type + js-factory components** (relocated):
- `src/components/content-slide/*`   ← from `src/content-slides/*`
- `src/components/section-slide/*`   ← from `src/section-slides/*`
- `src/components/three-scene/*`     ← from `src/three-scenes/*`
- `src/components/svg-scene/*`       ← from `src/svg-scenes/*`
- `src/components/title-animation/*` ← from `src/title-animations/*`

**Dev-mode runtime:**
- `src/authoring/last-good-cache.js` — per-scene DOM retention
- `src/authoring/error-banner.js` + `error-banner.test.js` — banner component (jsdom)
- `src/authoring/hmr-diagnostics.js` — Vite plugin → browser diagnostic channel

**Linter:**
- `src/authoring/diagnostic-printer.lib.js` + `.test.js` — CLI formatting of diagnostic records

**Test fixtures:**
- `test/fixtures/b-linter/ok/*` — a known-clean content folder
- `test/fixtures/b-linter/bad-box-diagram/*` — intentional errors in a box-diagram
- `test/fixtures/b-linter/bad-frontmatter/*` — intentional errors in frontmatter

### Modified files

- `src/authoring/markdown-scene.lib.js` — block splitter keeps only boundary detection; per-block shaping moves into component parsers
- `src/authoring/markdown-scene.js` — resolve scene-type via registry
- `src/main.js` — update imports for relocated components
- `bin/talk-lint.js` — rewritten around the registry
- `src/authoring/content-loader-plugin.js` — emit diagnostics into HMR channel
- `src/authoring/scene-placeholder.js` — retained; used only for first-render-fails case
- `package.json` — add `jsdom` devDependency
- `CLAUDE.md` — component catalogue + registry paragraph
- `docs/architecture/authoring.md` — registry section
- `todo.md` — mark B done

### Removed directories (end of plan, after all imports are updated)

- `src/content-slides/`
- `src/section-slides/`
- `src/three-scenes/`
- `src/svg-scenes/`
- `src/title-animations/`

---

## Phase 1 — Registry foundation

### Task 1: Create the registry module

**Files:**
- Create: `src/authoring/component-registry.js`
- Create: `src/authoring/component-registry.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/authoring/component-registry.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry, validateDescriptor } from './component-registry.js';

test('registry stores and retrieves by name', () => {
  const desc = { name: 'heading', kind: 'markdown-block', matcher: { blockType: 'heading' } };
  const reg = createRegistry();
  reg.register(desc);
  assert.equal(reg.getByName('heading'), desc);
});

test('registry looks up markdown-block by infoString', () => {
  const desc = { name: 'box-diagram', kind: 'markdown-block', matcher: { infoString: 'box-diagram' } };
  const reg = createRegistry();
  reg.register(desc);
  assert.equal(reg.getByInfoString('box-diagram'), desc);
});

test('registry looks up markdown-block by blockType', () => {
  const desc = { name: 'heading', kind: 'markdown-block', matcher: { blockType: 'heading' } };
  const reg = createRegistry();
  reg.register(desc);
  assert.equal(reg.getByBlockType('heading'), desc);
});

test('registry looks up scene-type by frontmatterType', () => {
  const desc = { name: 'content-slide', kind: 'scene-type', matcher: { frontmatterType: 'content' } };
  const reg = createRegistry();
  reg.register(desc);
  assert.equal(reg.getByFrontmatterType('content'), desc);
});

test('registry rejects duplicate registration by name', () => {
  const desc = { name: 'x', kind: 'markdown-block', matcher: { blockType: 'x' } };
  const reg = createRegistry();
  reg.register(desc);
  assert.throws(() => reg.register(desc), /already registered/);
});

test('validateDescriptor rejects missing name', () => {
  const errs = validateDescriptor({ kind: 'markdown-block', matcher: { blockType: 'x' } });
  assert.ok(errs.some(e => /name/.test(e)));
});

test('validateDescriptor rejects unknown kind', () => {
  const errs = validateDescriptor({ name: 'x', kind: 'bogus', matcher: {} });
  assert.ok(errs.some(e => /kind/.test(e)));
});

test('validateDescriptor accepts a valid descriptor', () => {
  const errs = validateDescriptor({ name: 'x', kind: 'markdown-block', matcher: { blockType: 'x' } });
  assert.deepEqual(errs, []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `talk test`
Expected: failures in `component-registry.test.js` — module not found.

- [ ] **Step 3: Write the registry module**

```js
// src/authoring/component-registry.js

const VALID_KINDS = new Set(['scene-type', 'markdown-block', 'js-factory']);

/**
 * Validate a component descriptor's shape. Returns an array of error strings;
 * empty means valid.
 *
 * @param {*} desc
 * @returns {string[]}
 */
export function validateDescriptor(desc) {
  const errs = [];
  if (!desc || typeof desc !== 'object') {
    return ['descriptor must be an object'];
  }
  if (typeof desc.name !== 'string' || !desc.name) {
    errs.push('descriptor.name must be a non-empty string');
  }
  if (!VALID_KINDS.has(desc.kind)) {
    errs.push(`descriptor.kind must be one of: ${[...VALID_KINDS].join(', ')}`);
  }
  if (!desc.matcher || typeof desc.matcher !== 'object') {
    errs.push('descriptor.matcher must be an object');
  }
  return errs;
}

/**
 * Create an empty registry. The central bootstrap module (this file's default
 * export below) calls `register()` once per component.
 */
export function createRegistry() {
  const byName = new Map();
  const byInfoString = new Map();
  const byBlockType = new Map();
  const byFrontmatterType = new Map();
  const byFactoryExport = new Map();

  return {
    register(desc) {
      const errs = validateDescriptor(desc);
      if (errs.length) throw new Error(`invalid descriptor: ${errs.join('; ')}`);
      if (byName.has(desc.name)) {
        throw new Error(`component '${desc.name}' already registered`);
      }
      byName.set(desc.name, desc);
      const m = desc.matcher;
      if (m.infoString) byInfoString.set(m.infoString, desc);
      if (m.blockType) byBlockType.set(m.blockType, desc);
      if (m.frontmatterType) byFrontmatterType.set(m.frontmatterType, desc);
      if (m.factoryExport) byFactoryExport.set(m.factoryExport, desc);
    },
    getByName(name) { return byName.get(name); },
    getByInfoString(s) { return byInfoString.get(s); },
    getByBlockType(t) { return byBlockType.get(t); },
    getByFrontmatterType(t) { return byFrontmatterType.get(t); },
    getByFactoryExport(e) { return byFactoryExport.get(e); },
    all() { return [...byName.values()]; },
  };
}

/**
 * The bootstrap registry. Components are registered at module load by importing
 * each component.js and calling `register`. Intentionally populated at the
 * bottom of this file so the imports are the single inventory.
 */
export const registry = createRegistry();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `talk test`
Expected: all 8 new tests pass. 184 baseline remains green.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(registry): component-registry module with lookup + descriptor validation"
jj new
```

---

## Phase 2 — Relocate existing components into `src/components/`

Each relocation is a self-contained change: move the directory, rename it to its new (singular) form, update every import across the codebase, run tests. No behavior changes.

> **Search-and-replace discipline:** after moving a directory, update imports by running a grep across `src/`, `bin/`, `templates/`, and `test/` for the old path, then fixing each occurrence. Use the Grep tool (not ad-hoc text tools).

### Task 2: Relocate content-slides → content-slide

**Files:**
- Move: `src/content-slides/scene-factory.js` → `src/components/content-slide/scene-factory.js`
- Move: `src/content-slides/index.js` → `src/components/content-slide/index.js`
- Update every import that references `src/content-slides/` or `../content-slides/`

- [ ] **Step 1: Create target directory and move files**

```bash
mkdir -p src/components/content-slide
jj mv src/content-slides/scene-factory.js src/components/content-slide/scene-factory.js
jj mv src/content-slides/index.js src/components/content-slide/index.js
rmdir src/content-slides
```

- [ ] **Step 2: Update imports of the moved files**

Run a grep for old path references across the repo:

```
Grep pattern="content-slides" path="/home/shawn/src/talk"
```

Update each hit. Typical substitutions:
- `from '../content-slides/index.js'` → `from '../components/content-slide/index.js'`
- `from '../content-slides/scene-factory.js'` → `from '../components/content-slide/scene-factory.js'`
- `from './content-slides/...'` similarly

Expected hit locations: `src/authoring/markdown-scene.js`, `src/main.js`, possibly `src/authoring/content-loader-plugin.js`. Also check `docs/architecture/` and `CLAUDE.md` for stale references (update those in this same commit).

- [ ] **Step 3: Run tests**

Run: `talk test`
Expected: all 184 existing tests pass. No new tests yet.

- [ ] **Step 4: Commit**

```bash
jj describe -m "refactor(components): relocate content-slides → components/content-slide"
jj new
```

### Task 3: Relocate section-slides → section-slide

**Files:**
- Move: `src/section-slides/scene-factory.js` → `src/components/section-slide/scene-factory.js`
- Move: `src/section-slides/index.js` → `src/components/section-slide/index.js`

- [ ] **Step 1: Move directory**

```bash
mkdir -p src/components/section-slide
jj mv src/section-slides/scene-factory.js src/components/section-slide/scene-factory.js
jj mv src/section-slides/index.js src/components/section-slide/index.js
rmdir src/section-slides
```

- [ ] **Step 2: Update imports**

```
Grep pattern="section-slides" path="/home/shawn/src/talk"
```

Replace `section-slides` → `components/section-slide` in each match. Expected: `src/authoring/markdown-scene.js`, `src/main.js`, docs.

- [ ] **Step 3: Run tests**

Run: `talk test`
Expected: 184 pass.

- [ ] **Step 4: Commit**

```bash
jj describe -m "refactor(components): relocate section-slides → components/section-slide"
jj new
```

### Task 4: Relocate three-scenes → three-scene

**Files:**
- Move: `src/three-scenes/scene-factory.js` → `src/components/three-scene/scene-factory.js`
- Move: `src/three-scenes/scene-helpers.js` → `src/components/three-scene/scene-helpers.js`

- [ ] **Step 1: Move directory**

```bash
mkdir -p src/components/three-scene
jj mv src/three-scenes/scene-factory.js src/components/three-scene/scene-factory.js
jj mv src/three-scenes/scene-helpers.js src/components/three-scene/scene-helpers.js
rmdir src/three-scenes
```

- [ ] **Step 2: Update imports**

```
Grep pattern="three-scenes" path="/home/shawn/src/talk"
```

Replace `three-scenes` → `components/three-scene` in each match.

- [ ] **Step 3: Run tests**

Run: `talk test`
Expected: 184 pass.

- [ ] **Step 4: Commit**

```bash
jj describe -m "refactor(components): relocate three-scenes → components/three-scene"
jj new
```

### Task 5: Relocate svg-scenes → svg-scene

**Files:**
- Move: `src/svg-scenes/scene-factory.js` → `src/components/svg-scene/scene-factory.js`

- [ ] **Step 1: Move directory**

```bash
mkdir -p src/components/svg-scene
jj mv src/svg-scenes/scene-factory.js src/components/svg-scene/scene-factory.js
rmdir src/svg-scenes
```

- [ ] **Step 2: Update imports**

```
Grep pattern="svg-scenes" path="/home/shawn/src/talk"
```

Replace `svg-scenes` → `components/svg-scene`.

- [ ] **Step 3: Run tests**

Run: `talk test`
Expected: 184 pass.

- [ ] **Step 4: Commit**

```bash
jj describe -m "refactor(components): relocate svg-scenes → components/svg-scene"
jj new
```

### Task 6: Relocate title-animations → title-animation

**Files:**
- Move the entire `src/title-animations/` directory to `src/components/title-animation/`. Preserves every file (`animations/`, `camera.js`, `effects.js`, `fonts/`, `index.js`, `intro.js`, `physics.lib.js`, `physics.lib.test.js`, `scene-factory.js`, `text.js`).

- [ ] **Step 1: Move directory**

```bash
mkdir -p src/components/title-animation
# Move every top-level entry including nested dirs:
jj mv src/title-animations/animations src/components/title-animation/animations
jj mv src/title-animations/fonts src/components/title-animation/fonts
jj mv src/title-animations/camera.js src/components/title-animation/camera.js
jj mv src/title-animations/effects.js src/components/title-animation/effects.js
jj mv src/title-animations/index.js src/components/title-animation/index.js
jj mv src/title-animations/intro.js src/components/title-animation/intro.js
jj mv src/title-animations/physics.lib.js src/components/title-animation/physics.lib.js
jj mv src/title-animations/physics.lib.test.js src/components/title-animation/physics.lib.test.js
jj mv src/title-animations/scene-factory.js src/components/title-animation/scene-factory.js
jj mv src/title-animations/text.js src/components/title-animation/text.js
rmdir src/title-animations
```

(If the directory contains additional files at the time of execution, use `ls src/title-animations` first and move each.)

- [ ] **Step 2: Update imports**

```
Grep pattern="title-animations" path="/home/shawn/src/talk"
```

Replace `title-animations` → `components/title-animation` in each match.

- [ ] **Step 3: Run tests**

Run: `talk test`
Expected: 184 pass (includes the existing physics.lib.test.js).

- [ ] **Step 4: Commit**

```bash
jj describe -m "refactor(components): relocate title-animations → components/title-animation"
jj new
```

---

## Phase 3 — Descriptors for relocated components

Each relocated component gets a `component.js` that exports a descriptor. Scene-types register by frontmatter `type:`; js-factories register by the factory export name.

### Task 7: content-slide descriptor (scene-type)

**Files:**
- Create: `src/components/content-slide/component.js`
- Modify: `src/authoring/component-registry.js` (register the new descriptor at bootstrap)

- [ ] **Step 1: Write the descriptor**

```js
// src/components/content-slide/component.js
import { createContentSlide } from './scene-factory.js';

/**
 * Content-slide scene type. The default for markdown scenes unless
 * `type:` in frontmatter says otherwise. Consumes a parsed scene
 * (title, slides, options) and returns a scene module.
 *
 * Validation is a no-op in B's scope — per-block diagnostics flow
 * from each block component. Composition happens at scene-type level.
 */
export const component = {
  name: 'content-slide',
  kind: 'scene-type',
  matcher: { frontmatterType: 'content' },
  render(parsedScene) {
    return createContentSlide(parsedScene.title, parsedScene.slides, parsedScene.options);
  },
};
```

- [ ] **Step 2: Register at bootstrap**

Append to the end of `src/authoring/component-registry.js`:

```js
import { component as contentSlide } from '../components/content-slide/component.js';
registry.register(contentSlide);
```

(Imports at the top of the file, `registry.register(...)` at the bottom — keep the registration block adjacent so "what's registered" is one visible list.)

- [ ] **Step 3: Write registry-bootstrap test**

Append to `src/authoring/component-registry.test.js`:

```js
import { registry } from './component-registry.js';

test('bootstrap: content-slide is registered', () => {
  const c = registry.getByName('content-slide');
  assert.ok(c);
  assert.equal(c.kind, 'scene-type');
  assert.equal(registry.getByFrontmatterType('content'), c);
});
```

- [ ] **Step 4: Run tests**

Run: `talk test`
Expected: 184 + 9 (registry) pass.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(components): content-slide descriptor + bootstrap registration"
jj new
```

### Task 8: section-slide descriptor (scene-type)

**Files:**
- Create: `src/components/section-slide/component.js`
- Modify: `src/authoring/component-registry.js`

- [ ] **Step 1: Write the descriptor**

```js
// src/components/section-slide/component.js
import { createSectionSlide } from './scene-factory.js';

export const component = {
  name: 'section-slide',
  kind: 'scene-type',
  matcher: { frontmatterType: 'section' },
  render(parsedScene) {
    return createSectionSlide(parsedScene.title, parsedScene.options);
  },
};
```

- [ ] **Step 2: Register at bootstrap**

Add to `src/authoring/component-registry.js`:

```js
import { component as sectionSlide } from '../components/section-slide/component.js';
registry.register(sectionSlide);
```

- [ ] **Step 3: Add registry-bootstrap test**

```js
test('bootstrap: section-slide is registered', () => {
  const c = registry.getByName('section-slide');
  assert.ok(c);
  assert.equal(c.kind, 'scene-type');
  assert.equal(registry.getByFrontmatterType('section'), c);
});
```

- [ ] **Step 4: Run tests**

Run: `talk test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(components): section-slide descriptor + bootstrap registration"
jj new
```

### Task 9: three-scene descriptor (js-factory)

**Files:**
- Create: `src/components/three-scene/component.js`
- Modify: `src/authoring/component-registry.js`

- [ ] **Step 1: Write the descriptor**

```js
// src/components/three-scene/component.js
const REQUIRED_EXPORTS = ['title', 'slides', 'init', 'destroy', 'resolveToSlide', 'animateToSlide'];

/**
 * Validate a scene module produced by createThreeScene(...). Structural only:
 * checks the module has the required shape. Not called at parse time —
 * called when a scene module is loaded at runtime or lint time.
 *
 * @param {object} sceneModule
 * @param {{ file: string }} context
 * @returns {Array<object>} diagnostics
 */
function validateThreeScene(sceneModule, context) {
  const diags = [];
  for (const key of REQUIRED_EXPORTS) {
    if (!(key in sceneModule)) {
      diags.push({
        severity: 'error',
        component: 'three-scene',
        file: context.file,
        line: 1,
        column: 1,
        message: `three-scene module missing required export '${key}'`,
      });
    }
  }
  if ('slides' in sceneModule && !Array.isArray(sceneModule.slides)) {
    diags.push({
      severity: 'error',
      component: 'three-scene',
      file: context.file,
      line: 1,
      column: 1,
      message: `three-scene module: 'slides' must be an array`,
    });
  }
  return diags;
}

export const component = {
  name: 'three-scene',
  kind: 'js-factory',
  matcher: { factoryExport: 'createThreeScene' },
  validate: validateThreeScene,
};
```

- [ ] **Step 2: Register at bootstrap**

```js
import { component as threeScene } from '../components/three-scene/component.js';
registry.register(threeScene);
```

- [ ] **Step 3: Add registry-bootstrap test**

```js
test('bootstrap: three-scene is registered', () => {
  const c = registry.getByName('three-scene');
  assert.ok(c);
  assert.equal(c.kind, 'js-factory');
});

test('three-scene validator flags missing exports', () => {
  const c = registry.getByName('three-scene');
  const diags = c.validate({}, { file: 'x.js' });
  assert.ok(diags.length >= 6);
  assert.ok(diags.every(d => d.severity === 'error'));
});

test('three-scene validator accepts a complete module', () => {
  const c = registry.getByName('three-scene');
  const diags = c.validate({
    title: 't', slides: [], init() {}, destroy() {}, resolveToSlide() {}, animateToSlide() {},
  }, { file: 'x.js' });
  assert.deepEqual(diags, []);
});
```

- [ ] **Step 4: Run tests**

Run: `talk test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(components): three-scene descriptor + structural validator"
jj new
```

### Task 10: svg-scene descriptor (js-factory)

**Files:**
- Create: `src/components/svg-scene/component.js`
- Modify: `src/authoring/component-registry.js`

- [ ] **Step 1: Write the descriptor**

```js
// src/components/svg-scene/component.js
const REQUIRED_EXPORTS = ['title', 'slides', 'init', 'destroy', 'resolveToSlide', 'animateToSlide'];

function validateSvgScene(sceneModule, context) {
  const diags = [];
  for (const key of REQUIRED_EXPORTS) {
    if (!(key in sceneModule)) {
      diags.push({
        severity: 'error',
        component: 'svg-scene',
        file: context.file,
        line: 1,
        column: 1,
        message: `svg-scene module missing required export '${key}'`,
      });
    }
  }
  return diags;
}

export const component = {
  name: 'svg-scene',
  kind: 'js-factory',
  matcher: { factoryExport: 'createSvgScene' },
  validate: validateSvgScene,
};
```

- [ ] **Step 2: Register at bootstrap**

```js
import { component as svgScene } from '../components/svg-scene/component.js';
registry.register(svgScene);
```

- [ ] **Step 3: Add test**

```js
test('bootstrap: svg-scene is registered', () => {
  const c = registry.getByName('svg-scene');
  assert.ok(c);
  assert.equal(c.kind, 'js-factory');
});
```

- [ ] **Step 4: Run tests**

Run: `talk test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(components): svg-scene descriptor + structural validator"
jj new
```

### Task 11: title-animation descriptor (js-factory)

**Files:**
- Create: `src/components/title-animation/component.js`
- Modify: `src/authoring/component-registry.js`

- [ ] **Step 1: Write the descriptor**

```js
// src/components/title-animation/component.js
const REQUIRED_EXPORTS = ['title', 'slides', 'init', 'destroy', 'resolveToSlide', 'animateToSlide'];

function validateTitleAnimation(sceneModule, context) {
  const diags = [];
  for (const key of REQUIRED_EXPORTS) {
    if (!(key in sceneModule)) {
      diags.push({
        severity: 'error',
        component: 'title-animation',
        file: context.file,
        line: 1,
        column: 1,
        message: `title-animation module missing required export '${key}'`,
      });
    }
  }
  return diags;
}

export const component = {
  name: 'title-animation',
  kind: 'js-factory',
  matcher: { factoryExport: 'createTitleScene' },
  validate: validateTitleAnimation,
};
```

- [ ] **Step 2: Register at bootstrap**

```js
import { component as titleAnimation } from '../components/title-animation/component.js';
registry.register(titleAnimation);
```

- [ ] **Step 3: Add test**

```js
test('bootstrap: title-animation is registered', () => {
  const c = registry.getByName('title-animation');
  assert.ok(c);
  assert.equal(c.kind, 'js-factory');
});
```

- [ ] **Step 4: Run tests**

Run: `talk test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(components): title-animation descriptor + structural validator"
jj new
```

---

## Phase 4 — Built-in markdown-block components

Each built-in extracts its render logic from `src/components/content-slide/scene-factory.js`'s `renderBlock` switch statement, plus its parse logic from the current `markdown-scene.lib.js` splitter. The splitter keeps producing tokens of the same shape; the components' `parse` is pass-through (just returns the splitter's payload) because the splitter already normalizes. Real work is in `render`.

> **Don't change `content-slide/scene-factory.js` in Phases 4's tasks** — it keeps working as-is (its `renderBlock` still handles every case). We'll pivot it in Phase 5 after all block components are in place.

### Task 12: heading component

**Files:**
- Create: `src/components/heading/component.js`
- Create: `src/components/heading/render.js`
- Modify: `src/authoring/component-registry.js`

- [ ] **Step 1: Write the render function**

```js
// src/components/heading/render.js

/**
 * Produce a DOM node for a heading block.
 *
 * @param {{ text: string, level: number, accent?: string }} data
 * @param {{ classPrefix: string }} renderContext  class prefix for scoped CSS
 * @returns {HTMLElement}
 */
export function renderHeading(data, renderContext) {
  const el = document.createElement('div');
  el.className = `${renderContext.classPrefix}-heading`;
  el.dataset.level = String(data.level || 1);
  el.textContent = data.text;
  if (data.accent) el.style.color = data.accent;
  return el;
}
```

- [ ] **Step 2: Write the descriptor**

```js
// src/components/heading/component.js
import { renderHeading } from './render.js';

export const component = {
  name: 'heading',
  kind: 'markdown-block',
  matcher: { blockType: 'heading' },
  parse(token) { return token; },
  render: renderHeading,
};
```

- [ ] **Step 3: Register at bootstrap**

Add to `src/authoring/component-registry.js`:

```js
import { component as heading } from '../components/heading/component.js';
registry.register(heading);
```

- [ ] **Step 4: Add registry test**

```js
test('bootstrap: heading is registered', () => {
  const c = registry.getByName('heading');
  assert.ok(c);
  assert.equal(c.kind, 'markdown-block');
  assert.equal(registry.getByBlockType('heading'), c);
});
```

- [ ] **Step 5: Run tests**

Run: `talk test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(components): heading markdown-block component + renderer"
jj new
```

### Task 13: paragraph component

**Files:**
- Create: `src/components/paragraph/component.js`
- Create: `src/components/paragraph/render.js`
- Modify: `src/authoring/component-registry.js`

- [ ] **Step 1: Write the render function**

```js
// src/components/paragraph/render.js

/**
 * Render a paragraph (or muted paragraph) block.
 *
 * @param {{ text: string, muted?: boolean }} data
 * @param {{ classPrefix: string }} renderContext
 * @returns {HTMLElement}
 */
export function renderParagraph(data, renderContext) {
  const el = document.createElement('p');
  el.className = `${renderContext.classPrefix}-text${data.muted ? ' muted' : ''}`;
  el.textContent = data.text;
  return el;
}
```

- [ ] **Step 2: Write the descriptor**

```js
// src/components/paragraph/component.js
import { renderParagraph } from './render.js';

export const component = {
  name: 'paragraph',
  kind: 'markdown-block',
  matcher: { blockType: 'text' },   // splitter still emits type:'text' today; preserves backward compat
  parse(token) { return token; },
  render: renderParagraph,
};
```

- [ ] **Step 3: Register at bootstrap**

```js
import { component as paragraph } from '../components/paragraph/component.js';
registry.register(paragraph);
```

- [ ] **Step 4: Add registry test**

```js
test('bootstrap: paragraph is registered', () => {
  const c = registry.getByName('paragraph');
  assert.ok(c);
  assert.equal(registry.getByBlockType('text'), c);
});
```

- [ ] **Step 5: Run tests**

Run: `talk test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(components): paragraph markdown-block component + renderer"
jj new
```

### Task 14: bullet-list component

**Files:**
- Create: `src/components/bullet-list/component.js`
- Create: `src/components/bullet-list/render.js`
- Modify: `src/authoring/component-registry.js`

- [ ] **Step 1: Write the render function**

```js
// src/components/bullet-list/render.js

/**
 * Render a bullet list.
 *
 * @param {{ items: string[], accent?: string }} data
 * @param {{ classPrefix: string }} renderContext
 * @returns {HTMLElement}
 */
export function renderBulletList(data, renderContext) {
  const ul = document.createElement('ul');
  ul.className = `${renderContext.classPrefix}-bullets`;
  for (const item of data.items) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  }
  return ul;
}
```

- [ ] **Step 2: Write the descriptor**

```js
// src/components/bullet-list/component.js
import { renderBulletList } from './render.js';

export const component = {
  name: 'bullet-list',
  kind: 'markdown-block',
  matcher: { blockType: 'bullets' },
  parse(token) { return token; },
  render: renderBulletList,
};
```

- [ ] **Step 3: Register at bootstrap**

```js
import { component as bulletList } from '../components/bullet-list/component.js';
registry.register(bulletList);
```

- [ ] **Step 4: Add registry test**

```js
test('bootstrap: bullet-list is registered', () => {
  const c = registry.getByName('bullet-list');
  assert.ok(c);
  assert.equal(registry.getByBlockType('bullets'), c);
});
```

- [ ] **Step 5: Run tests**

Run: `talk test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(components): bullet-list markdown-block component + renderer"
jj new
```

### Task 15: quote component

**Files:**
- Create: `src/components/quote/component.js`
- Create: `src/components/quote/render.js`
- Modify: `src/authoring/component-registry.js`

- [ ] **Step 1: Write the render function**

```js
// src/components/quote/render.js

/**
 * Render a blockquote with optional attribution.
 *
 * @param {{ text: string, attribution?: string }} data
 * @param {{ classPrefix: string }} renderContext
 * @returns {HTMLElement}
 */
export function renderQuote(data, renderContext) {
  const wrap = document.createElement('div');
  wrap.className = `${renderContext.classPrefix}-quote`;
  const p = document.createElement('p');
  p.textContent = data.text;
  wrap.appendChild(p);
  if (data.attribution) {
    const cite = document.createElement('cite');
    cite.textContent = `— ${data.attribution}`;
    wrap.appendChild(cite);
  }
  return wrap;
}
```

- [ ] **Step 2: Write the descriptor**

```js
// src/components/quote/component.js
import { renderQuote } from './render.js';

export const component = {
  name: 'quote',
  kind: 'markdown-block',
  matcher: { blockType: 'quote' },
  parse(token) { return token; },
  render: renderQuote,
};
```

- [ ] **Step 3: Register at bootstrap**

```js
import { component as quote } from '../components/quote/component.js';
registry.register(quote);
```

- [ ] **Step 4: Add registry test**

```js
test('bootstrap: quote is registered', () => {
  const c = registry.getByName('quote');
  assert.ok(c);
  assert.equal(registry.getByBlockType('quote'), c);
});
```

- [ ] **Step 5: Run tests**

Run: `talk test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(components): quote markdown-block component + renderer"
jj new
```

### Task 16: code-fence component

**Files:**
- Create: `src/components/code-fence/component.js`
- Create: `src/components/code-fence/render.js`
- Modify: `src/authoring/component-registry.js`

- [ ] **Step 1: Write the render function**

```js
// src/components/code-fence/render.js

/**
 * Render a generic code block (any info-string that isn't claimed by a more
 * specific markdown-block component).
 *
 * @param {{ code: string, language?: string }} data
 * @param {{ classPrefix: string }} renderContext
 * @returns {HTMLElement}
 */
export function renderCodeFence(data, renderContext) {
  const wrap = document.createElement('div');
  wrap.className = `${renderContext.classPrefix}-code`;
  const pre = document.createElement('pre');
  pre.textContent = data.code;
  if (data.language) pre.dataset.language = data.language;
  wrap.appendChild(pre);
  return wrap;
}
```

- [ ] **Step 2: Write the descriptor**

```js
// src/components/code-fence/component.js
import { renderCodeFence } from './render.js';

export const component = {
  name: 'code-fence',
  kind: 'markdown-block',
  matcher: { blockType: 'code' },
  parse(token) { return token; },
  render: renderCodeFence,
};
```

- [ ] **Step 3: Register at bootstrap**

```js
import { component as codeFence } from '../components/code-fence/component.js';
registry.register(codeFence);
```

- [ ] **Step 4: Add registry test**

```js
test('bootstrap: code-fence is registered', () => {
  const c = registry.getByName('code-fence');
  assert.ok(c);
  assert.equal(registry.getByBlockType('code'), c);
});
```

- [ ] **Step 5: Run tests**

Run: `talk test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(components): code-fence markdown-block component + renderer"
jj new
```

### Task 17: spacer component

**Files:**
- Create: `src/components/spacer/component.js`
- Create: `src/components/spacer/render.js`
- Modify: `src/authoring/component-registry.js`

- [ ] **Step 1: Write the render function**

```js
// src/components/spacer/render.js

/**
 * Render a vertical spacer. `size` is an opaque string token (`md`, `lg`).
 *
 * @param {{ size?: string }} data
 * @param {{ classPrefix: string }} renderContext
 * @returns {HTMLElement}
 */
export function renderSpacer(data, renderContext) {
  const el = document.createElement('div');
  el.className = `${renderContext.classPrefix}-spacer`;
  el.dataset.size = data.size || 'md';
  return el;
}
```

- [ ] **Step 2: Write the descriptor**

```js
// src/components/spacer/component.js
import { renderSpacer } from './render.js';

export const component = {
  name: 'spacer',
  kind: 'markdown-block',
  matcher: { blockType: 'spacer' },
  parse(token) { return token; },
  render: renderSpacer,
};
```

- [ ] **Step 3: Register at bootstrap**

```js
import { component as spacer } from '../components/spacer/component.js';
registry.register(spacer);
```

- [ ] **Step 4: Add registry test**

```js
test('bootstrap: spacer is registered', () => {
  const c = registry.getByName('spacer');
  assert.ok(c);
  assert.equal(registry.getByBlockType('spacer'), c);
});
```

- [ ] **Step 5: Run tests**

Run: `talk test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(components): spacer markdown-block component + renderer"
jj new
```

---

## Phase 5 — Pivot content-slide to use the registry

With all built-in components registered, refactor `content-slide/scene-factory.js` to iterate slide blocks via the registry instead of its hand-rolled `renderBlock` switch. Fenced-code blocks with recognized info-strings dispatch to custom components (box-diagram will slot in here in Phase 6 without further content-slide changes).

### Task 18: Refactor content-slide `renderBlock` to dispatch via registry

**Files:**
- Modify: `src/components/content-slide/scene-factory.js`

- [ ] **Step 1: Read the existing scene-factory**

```
Read file_path="/home/shawn/src/talk/src/components/content-slide/scene-factory.js"
```

Familiarize yourself with the `renderBlock(block)` function and the surrounding lifecycle (`init`, `renderSlide`, `injectStyles`, etc.).

- [ ] **Step 2: Replace the switch with registry dispatch**

In `src/components/content-slide/scene-factory.js`:

1. At the top, add:

```js
import { registry } from '../../authoring/component-registry.js';
```

2. Replace the entire `renderBlock(block)` function with:

```js
function renderBlock(block) {
  // 1. Columns are a content-slide-native compositional primitive (not a
  //    registered component). Handle inline.
  if (block.type === 'columns') {
    const wrap = document.createElement('div');
    wrap.className = `${id}-columns`;
    const left = document.createElement('div');
    const right = document.createElement('div');
    for (const b of (block.left || [])) left.appendChild(renderBlock(b));
    for (const b of (block.right || [])) right.appendChild(renderBlock(b));
    wrap.appendChild(left);
    wrap.appendChild(right);
    return wrap;
  }

  // 2. Fenced code with a recognized info-string → custom markdown-block.
  if (block.type === 'code' && block.language) {
    const custom = registry.getByInfoString(block.language);
    if (custom && custom.render) {
      const parsed = custom.parse ? custom.parse(block.code, { file: null, blockStartLine: 0 }) : block.code;
      return custom.render(parsed, { classPrefix: id, colors: c });
    }
  }

  // 3. Built-in block type → registered markdown-block.
  const builtin = registry.getByBlockType(block.type);
  if (builtin && builtin.render) {
    const parsed = builtin.parse ? builtin.parse(block) : block;
    return builtin.render(parsed, { classPrefix: id, colors: c });
  }

  // 4. Unknown: empty div (keeps the deck renderable; linter will flag).
  return document.createElement('div');
}
```

3. In `renderSlide`, replace the HTML-string concatenation path with DOM construction:

```js
function renderSlide(slideBlocks, stepIndex, animated) {
  const wrap = document.createElement('div');
  wrap.className = `${id}-wrap`;

  slideBlocks.forEach((block, i) => {
    const slot = document.createElement('div');
    const visible = i <= stepIndex;
    slot.className = animated
      ? `${id}-block${visible ? ' visible' : ''}`
      : `${id}-block${visible ? ' instant' : ''}`;
    if (animated && visible) slot.style.transitionDelay = `${i * 80}ms`;
    slot.appendChild(renderBlock(block));
    wrap.appendChild(slot);
  });

  contentEl.innerHTML = '';
  contentEl.appendChild(wrap);
}
```

- [ ] **Step 3: Run tests**

Run: `talk test`
Expected: 184 existing pass. The sample-talk fixture still renders equivalently — any visual regression test / end-to-end nav test passes.

- [ ] **Step 4: Smoke test in the browser**

Run: `talk serve` against `fixtures/sample-talk/` in a separate terminal. Open `http://localhost:3000`. Navigate through every slide. Confirm:
- Headings render at correct sizes.
- Bullets render with their leading dots.
- Quotes render with the accent border.
- Code blocks render in monospace.
- Spacers produce the expected gap.

Fix any regressions inline before committing.

- [ ] **Step 5: Commit**

```bash
jj describe -m "refactor(content-slide): dispatch block rendering through registry"
jj new
```

---

## Phase 6 — box-diagram component (TDD)

### Task 19: box-diagram parser — node declarations

**Files:**
- Create: `src/components/box-diagram/parse.lib.js`
- Create: `src/components/box-diagram/parse.lib.test.js`

- [ ] **Step 1: Write failing tests for node parsing**

```js
// src/components/box-diagram/parse.lib.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBoxDiagram } from './parse.lib.js';

function ctx() { return { file: 's.md', blockStartLine: 1 }; }

test('parses a single box with bare id', () => {
  const r = parseBoxDiagram('box client', ctx());
  assert.deepEqual(r.nodes, [{ id: 'client', label: 'client', role: 'external', subtitle: null, line: 1 }]);
  assert.deepEqual(r.arrows, []);
  assert.equal(r.section, null);
  assert.deepEqual(r.errors, []);
});

test('parses bareword + quoted display label override', () => {
  const r = parseBoxDiagram('box api "My Blah API"', ctx());
  assert.equal(r.nodes[0].id, 'api');
  assert.equal(r.nodes[0].label, 'My Blah API');
});

test('parses role attribute', () => {
  const r = parseBoxDiagram('box api role=accent', ctx());
  assert.equal(r.nodes[0].role, 'accent');
});

test('parses subtitle attribute', () => {
  const r = parseBoxDiagram('box client subtitle="browser / app"', ctx());
  assert.equal(r.nodes[0].subtitle, 'browser / app');
});

test('parses label + role + subtitle in one declaration', () => {
  const r = parseBoxDiagram('box api "My Blah API" role=accent subtitle="rest"', ctx());
  assert.equal(r.nodes[0].id, 'api');
  assert.equal(r.nodes[0].label, 'My Blah API');
  assert.equal(r.nodes[0].role, 'accent');
  assert.equal(r.nodes[0].subtitle, 'rest');
});

test('rejects unknown role value', () => {
  const r = parseBoxDiagram('box api role=bogus', ctx());
  assert.ok(r.errors.some(e => /role/.test(e.message)));
});

test('records correct line numbers for nodes', () => {
  const src = 'box a\nbox b\nbox c';
  const r = parseBoxDiagram(src, ctx());
  assert.deepEqual(r.nodes.map(n => n.line), [1, 2, 3]);
});

test('blank lines and indentation are tolerated', () => {
  const r = parseBoxDiagram('\n\nbox   a\n\n   box b  \n', ctx());
  assert.equal(r.nodes.length, 2);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `talk test`
Expected: tests fail — `parseBoxDiagram` not defined.

- [ ] **Step 3: Implement node parsing**

```js
// src/components/box-diagram/parse.lib.js

const ROLES = new Set(['external', 'accent', 'warm']);

/**
 * Parse a box-diagram block body into { section, nodes, arrows, errors }.
 * Does not cross-validate references — that's validate.lib.js's job.
 * Line numbers are relative to the start of the block body (1-indexed).
 *
 * @param {string} source
 * @param {{ file: string, blockStartLine: number }} context
 */
export function parseBoxDiagram(source, context) {
  const lines = source.split('\n');
  const nodes = [];
  const arrows = [];
  const errors = [];
  let section = null;

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const lineNo = idx + 1;
    if (!line) return;

    // section: "TITLE"
    const sectionMatch = line.match(/^section\s*:\s*(.*)$/);
    if (sectionMatch) {
      section = stripQuotes(sectionMatch[1].trim());
      return;
    }

    // box declaration
    if (line.startsWith('box ') || line === 'box') {
      const node = parseBoxDecl(line, lineNo, errors);
      if (node) nodes.push(node);
      return;
    }

    // arrow (flow line): id -- label --> id
    if (line.includes('-->')) {
      const arrow = parseArrow(line, lineNo, errors);
      if (arrow) arrows.push(arrow);
      return;
    }

    errors.push({
      line: lineNo,
      column: 1,
      message: `unrecognized box-diagram line: ${JSON.stringify(line)}`,
    });
  });

  return { section, nodes, arrows, errors };
}

function parseBoxDecl(line, lineNo, errors) {
  // Strip 'box ' prefix.
  const rest = line.slice(3).trimStart();
  if (!rest) {
    errors.push({ line: lineNo, column: 1, message: 'box declaration missing id' });
    return null;
  }

  // Tokenize: id, optional "display", then key=value pairs (value may be quoted).
  const tokens = tokenize(rest);
  if (tokens.length === 0 || tokens[0].kind !== 'bareword') {
    errors.push({ line: lineNo, column: 1, message: 'box declaration: first token must be a bareword id' });
    return null;
  }

  const id = tokens[0].value;
  let label = id;
  let role = 'external';
  let subtitle = null;

  let i = 1;
  if (i < tokens.length && tokens[i].kind === 'quoted') {
    label = tokens[i].value;
    i++;
  }

  for (; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind !== 'pair') {
      errors.push({ line: lineNo, column: 1, message: `box declaration: expected key=value, got ${JSON.stringify(t.value)}` });
      continue;
    }
    if (t.key === 'role') {
      if (!ROLES.has(t.value)) {
        errors.push({ line: lineNo, column: 1, message: `box declaration: unknown role '${t.value}' (expected: external, accent, warm)` });
      } else {
        role = t.value;
      }
    } else if (t.key === 'subtitle') {
      subtitle = t.value;
    } else {
      errors.push({ line: lineNo, column: 1, message: `box declaration: unknown attribute '${t.key}'` });
    }
  }

  return { id, label, role, subtitle, line: lineNo };
}

function parseArrow(line, lineNo, errors) {
  // Expected shape: <src> -- <label> --> <dst>
  const m = line.match(/^(\S+)\s*--\s*(.*?)\s*-->\s*(\S+)$/);
  if (!m) {
    errors.push({ line: lineNo, column: 1, message: 'arrow syntax: expected `<src> -- <label> --> <dst>`' });
    return null;
  }
  return { from: m[1], to: m[3], label: m[2], line: lineNo };
}

/**
 * Tokenize a box-declaration tail into:
 *   { kind: 'bareword', value }    (no spaces, not quoted, not a pair)
 *   { kind: 'quoted',   value }    (double-quoted literal)
 *   { kind: 'pair',     key, value } (key=value or key="value")
 */
function tokenize(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === ' ' || s[i] === '\t') { i++; continue; }

    // Quoted bareword.
    if (s[i] === '"') {
      const end = findQuoteEnd(s, i);
      if (end < 0) break;
      out.push({ kind: 'quoted', value: s.slice(i + 1, end) });
      i = end + 1;
      continue;
    }

    // Read until whitespace or '='.
    const start = i;
    while (i < s.length && s[i] !== ' ' && s[i] !== '\t' && s[i] !== '=') i++;
    const head = s.slice(start, i);

    if (s[i] === '=') {
      i++;
      // Value may be quoted or bare.
      if (s[i] === '"') {
        const end = findQuoteEnd(s, i);
        if (end < 0) break;
        out.push({ kind: 'pair', key: head, value: s.slice(i + 1, end) });
        i = end + 1;
      } else {
        const vStart = i;
        while (i < s.length && s[i] !== ' ' && s[i] !== '\t') i++;
        out.push({ kind: 'pair', key: head, value: s.slice(vStart, i) });
      }
    } else {
      out.push({ kind: 'bareword', value: head });
    }
  }
  return out;
}

function findQuoteEnd(s, openIdx) {
  for (let j = openIdx + 1; j < s.length; j++) {
    if (s[j] === '"') return j;
  }
  return -1;
}

function stripQuotes(s) {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  return s;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `talk test`
Expected: all 8 node-parsing tests pass. Baseline tests still green.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(box-diagram): parse.lib.js — node declarations"
jj new
```

### Task 20: box-diagram parser — arrow + section + full-block tests

**Files:**
- Modify: `src/components/box-diagram/parse.lib.test.js`
- Modify: `src/components/box-diagram/parse.lib.js` (if tests expose gaps)

- [ ] **Step 1: Write more tests — arrows, sections, full blocks**

Append to `src/components/box-diagram/parse.lib.test.js`:

```js
test('parses a simple flow line', () => {
  const r = parseBoxDiagram('box client\nbox api\nclient -- POST --> api', ctx());
  assert.deepEqual(r.arrows, [{ from: 'client', to: 'api', label: 'POST', line: 3 }]);
});

test('arrow label preserves spaces and slashes', () => {
  const r = parseBoxDiagram('box a\nbox b\na -- POST /purchase --> b', ctx());
  assert.equal(r.arrows[0].label, 'POST /purchase');
});

test('rejects arrow without terminator', () => {
  const r = parseBoxDiagram('box a\nbox b\na -- bad -> b', ctx());
  assert.ok(r.errors.length > 0);
});

test('parses section header', () => {
  const r = parseBoxDiagram('section: THE SYSTEM\nbox a', ctx());
  assert.equal(r.section, 'THE SYSTEM');
});

test('parses quoted section header', () => {
  const r = parseBoxDiagram('section: "THE SYSTEM"\nbox a', ctx());
  assert.equal(r.section, 'THE SYSTEM');
});

test('parses a full spec example', () => {
  const src = [
    'section: THE SYSTEM',
    'box client                              subtitle="browser / app"',
    'box api         "My Blah API"           role=accent',
    'box database                            role=warm',
    '',
    'client -- POST /purchase --> api',
    'api    -- SQL             --> database',
  ].join('\n');
  const r = parseBoxDiagram(src, ctx());
  assert.equal(r.section, 'THE SYSTEM');
  assert.equal(r.nodes.length, 3);
  assert.equal(r.nodes[0].subtitle, 'browser / app');
  assert.equal(r.nodes[1].label, 'My Blah API');
  assert.equal(r.nodes[1].role, 'accent');
  assert.equal(r.nodes[2].role, 'warm');
  assert.equal(r.arrows.length, 2);
  assert.equal(r.arrows[0].label, 'POST /purchase');
  assert.deepEqual(r.errors, []);
});

test('reports an error for gibberish lines', () => {
  const r = parseBoxDiagram('this is not valid', ctx());
  assert.ok(r.errors.length > 0);
});

test('fan-out: multiple arrows from same source', () => {
  const src = [
    'box a',
    'box b',
    'box c',
    'a -- x --> b',
    'a -- y --> c',
  ].join('\n');
  const r = parseBoxDiagram(src, ctx());
  assert.equal(r.arrows.length, 2);
});
```

- [ ] **Step 2: Run tests**

Run: `talk test`
Expected: all pass (parser from Task 19 already handles these).

- [ ] **Step 3: Commit**

```bash
jj describe -m "test(box-diagram): arrow + section + full-spec coverage"
jj new
```

### Task 21: box-diagram validator

**Files:**
- Create: `src/components/box-diagram/validate.lib.js`
- Create: `src/components/box-diagram/validate.lib.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/components/box-diagram/validate.lib.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBoxDiagram } from './validate.lib.js';

function ctx() { return { file: '05-sketch/scene.md', blockStartLine: 10 }; }

test('reports no diagnostics for a valid diagram', () => {
  const data = {
    section: null,
    nodes: [{ id: 'a', line: 1 }, { id: 'b', line: 2 }],
    arrows: [{ from: 'a', to: 'b', label: 'x', line: 3 }],
    errors: [],
  };
  assert.deepEqual(validateBoxDiagram(data, ctx()), []);
});

test('flags arrow with undeclared source', () => {
  const data = {
    section: null,
    nodes: [{ id: 'b', line: 1 }],
    arrows: [{ from: 'a', to: 'b', label: 'x', line: 2 }],
    errors: [],
  };
  const diags = validateBoxDiagram(data, ctx());
  assert.equal(diags.length, 1);
  assert.equal(diags[0].severity, 'error');
  assert.equal(diags[0].component, 'box-diagram');
  assert.match(diags[0].message, /undeclared node 'a'/);
  assert.equal(diags[0].line, 11); // blockStartLine (10) + arrow.line (2) - 1
});

test('suggests "did you mean" when undeclared id is close to a declared one', () => {
  const data = {
    section: null,
    nodes: [{ id: 'api', line: 1 }],
    arrows: [{ from: 'apii', to: 'api', label: 'x', line: 2 }],
    errors: [],
  };
  const diags = validateBoxDiagram(data, ctx());
  assert.ok(diags[0].hint);
  assert.match(diags[0].hint, /did you mean 'api'/);
});

test('flags duplicate node declarations', () => {
  const data = {
    section: null,
    nodes: [{ id: 'a', line: 1 }, { id: 'a', line: 2 }],
    arrows: [],
    errors: [],
  };
  const diags = validateBoxDiagram(data, ctx());
  assert.ok(diags.some(d => /duplicate node 'a'/.test(d.message)));
});

test('surfaces parser errors as diagnostics', () => {
  const data = {
    section: null,
    nodes: [],
    arrows: [],
    errors: [{ line: 1, column: 1, message: 'arrow syntax: ...' }],
  };
  const diags = validateBoxDiagram(data, ctx());
  assert.equal(diags.length, 1);
  assert.equal(diags[0].severity, 'error');
  assert.equal(diags[0].line, 10); // blockStartLine (10) + 1 - 1 = 10
});

test('flags empty diagram as warning', () => {
  const data = { section: null, nodes: [], arrows: [], errors: [] };
  const diags = validateBoxDiagram(data, ctx());
  assert.ok(diags.some(d => d.severity === 'warn' && /empty/.test(d.message)));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `talk test`
Expected: fail — `validateBoxDiagram` not defined.

- [ ] **Step 3: Implement validator**

```js
// src/components/box-diagram/validate.lib.js

/**
 * Validate parsed box-diagram data. Returns an array of diagnostic records.
 *
 * @param {{ section: string|null, nodes: Array, arrows: Array, errors: Array }} data
 * @param {{ file: string, blockStartLine: number }} context
 */
export function validateBoxDiagram(data, context) {
  const diags = [];
  const absLine = (rel) => context.blockStartLine + rel - 1;

  // 1. Surface parser errors as diagnostics.
  for (const err of data.errors) {
    diags.push({
      severity: 'error',
      component: 'box-diagram',
      file: context.file,
      line: absLine(err.line),
      column: err.column || 1,
      message: err.message,
    });
  }

  // 2. Empty diagram.
  if (data.nodes.length === 0 && data.arrows.length === 0 && data.errors.length === 0) {
    diags.push({
      severity: 'warn',
      component: 'box-diagram',
      file: context.file,
      line: context.blockStartLine,
      column: 1,
      message: 'empty box-diagram block',
    });
  }

  // 3. Duplicate node ids.
  const seen = new Map();
  for (const node of data.nodes) {
    if (seen.has(node.id)) {
      diags.push({
        severity: 'error',
        component: 'box-diagram',
        file: context.file,
        line: absLine(node.line),
        column: 1,
        message: `duplicate node '${node.id}' (first declared at line ${absLine(seen.get(node.id))})`,
      });
    } else {
      seen.set(node.id, node.line);
    }
  }

  // 4. Undeclared references in arrows.
  const declaredIds = new Set(data.nodes.map(n => n.id));
  for (const arrow of data.arrows) {
    for (const endpoint of ['from', 'to']) {
      const id = arrow[endpoint];
      if (!declaredIds.has(id)) {
        const diag = {
          severity: 'error',
          component: 'box-diagram',
          file: context.file,
          line: absLine(arrow.line),
          column: 1,
          message: `arrow references undeclared node '${id}'`,
        };
        const suggestion = suggest(id, declaredIds);
        if (suggestion) diag.hint = `did you mean '${suggestion}'?`;
        diags.push(diag);
      }
    }
  }

  return diags;
}

/**
 * Suggest the closest declared id by Levenshtein distance. Only returns a
 * suggestion when distance is 1 or 2 and at least half the length of the
 * input (avoids misleading hints on short typos).
 */
function suggest(input, candidates) {
  let best = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = levenshtein(input, c);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (bestD <= 2 && bestD <= Math.max(1, Math.floor(input.length / 2))) return best;
  return null;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `talk test`
Expected: all validator tests pass. Baseline still green.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(box-diagram): validate.lib.js — references, duplicates, empty blocks"
jj new
```

### Task 22: box-diagram renderer

**Files:**
- Create: `src/components/box-diagram/render.js`

- [ ] **Step 1: Write the renderer**

```js
// src/components/box-diagram/render.js
import { colors as defaultColors } from '../../shared/colors.js';

const ROLE_COLORS = {
  external: 'border',  // neutral
  accent:   'accent',  // cyan
  warm:     'accentWarm', // amber
};

/**
 * Render a parsed box-diagram into a DOM node.
 *
 * @param {{ section: string|null, nodes: Array, arrows: Array }} data
 * @param {{ classPrefix: string, colors?: object }} renderContext
 * @returns {HTMLElement}
 */
export function renderBoxDiagram(data, renderContext) {
  const c = { ...defaultColors, ...(renderContext.colors || {}) };
  const wrap = document.createElement('div');
  wrap.className = `${renderContext.classPrefix}-boxdiagram`;
  wrap.style.cssText = `
    display: flex; flex-direction: column; align-items: center;
    gap: 1rem; margin: 1.5rem 0;
    font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
  `;

  if (data.section) {
    const header = document.createElement('div');
    header.textContent = data.section;
    header.style.cssText = `
      font-size: 0.95rem; letter-spacing: 0.18em; text-transform: uppercase;
      color: ${c.textMuted || '#c8d4ee'}; margin-bottom: 0.4rem;
    `;
    wrap.appendChild(header);
  }

  const row = buildRow(data, c);
  wrap.appendChild(row);

  return wrap;
}

function buildRow(data, c) {
  const row = document.createElement('div');
  row.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 1.5rem;';

  // Chain: for a simple linear diagram, render nodes in declared order with
  // arrows between consecutive pairs that match a declared arrow. Otherwise
  // render all nodes in declared order and put arrows beneath as a fallback
  // list. (Linear chaining is enough for v1's boxes+arrows scope.)
  const nodeById = new Map(data.nodes.map(n => [n.id, n]));
  const used = new Set();
  const pairs = []; // [{ from, to, arrow }]
  for (const a of data.arrows) pairs.push(a);

  // Render each declared node, inserting an arrow between consecutive nodes
  // whenever an arrow's from/to matches.
  data.nodes.forEach((node, i) => {
    row.appendChild(buildBox(node, c));
    used.add(node.id);
    const next = data.nodes[i + 1];
    if (next) {
      const arrow = data.arrows.find(a => a.from === node.id && a.to === next.id);
      if (arrow) row.appendChild(buildArrow(arrow, c));
    }
  });

  return row;
}

function buildBox(node, c) {
  const accent =
    node.role === 'accent' ? (c.accent || '#6cb4d9') :
    node.role === 'warm'   ? (c.accentWarm || '#e4b36a') :
                             (c.border || '#888');

  const box = document.createElement('div');
  box.style.cssText = `
    border: 3px solid ${accent}; border-radius: 14px; padding: 1.4rem 2.2rem;
    min-width: 9rem; display: flex; flex-direction: column; align-items: center;
    background: ${c.bgDark || '#0a0a10'};
  `;

  const label = document.createElement('div');
  label.textContent = node.label;
  label.style.cssText = `font-size: 1.4rem; font-weight: 600; color: ${c.text || '#fff'};`;
  box.appendChild(label);

  if (node.subtitle) {
    const sub = document.createElement('div');
    sub.textContent = node.subtitle;
    sub.style.cssText = `font-size: 0.95rem; color: ${c.textMuted || '#c8d4ee'}; margin-top: 0.3rem;`;
    box.appendChild(sub);
  }

  return box;
}

function buildArrow(arrow, c) {
  const col = document.createElement('div');
  col.style.cssText = 'display: flex; flex-direction: column; align-items: center; min-width: 7rem;';

  const lbl = document.createElement('div');
  lbl.textContent = arrow.label;
  lbl.style.cssText = `font-size: 0.95rem; color: ${c.textMuted || '#c8d4ee'}; margin-bottom: 0.25rem;`;
  col.appendChild(lbl);

  const line = document.createElement('div');
  line.style.cssText = `
    width: 100%; height: 2px; background: ${c.border || '#888'}; position: relative;
  `;
  const head = document.createElement('span');
  head.style.cssText = `
    position: absolute; right: -2px; top: -5px;
    border-left: 10px solid ${c.border || '#888'};
    border-top: 6px solid transparent; border-bottom: 6px solid transparent;
  `;
  line.appendChild(head);
  col.appendChild(line);

  return col;
}
```

- [ ] **Step 2: Smoke-check by reading**

No unit test here — this is a pure DOM builder tested via the runtime integration in Phase 8. The validator + parser carry the behavioral guarantees; `render.js` is cosmetic glue.

- [ ] **Step 3: Commit**

```bash
jj describe -m "feat(box-diagram): render.js — DOM builder for boxes + arrows"
jj new
```

### Task 23: Register box-diagram

**Files:**
- Create: `src/components/box-diagram/component.js`
- Modify: `src/authoring/component-registry.js`

- [ ] **Step 1: Write the descriptor**

```js
// src/components/box-diagram/component.js
import { parseBoxDiagram } from './parse.lib.js';
import { validateBoxDiagram } from './validate.lib.js';
import { renderBoxDiagram } from './render.js';

export const component = {
  name: 'box-diagram',
  kind: 'markdown-block',
  matcher: { infoString: 'box-diagram' },
  parse(source, context) { return parseBoxDiagram(source, context); },
  validate(data, context) { return validateBoxDiagram(data, context); },
  render(data, renderContext) { return renderBoxDiagram(data, renderContext); },
};
```

- [ ] **Step 2: Register at bootstrap**

Add to `src/authoring/component-registry.js`:

```js
import { component as boxDiagram } from '../components/box-diagram/component.js';
registry.register(boxDiagram);
```

- [ ] **Step 3: Add registry test**

```js
test('bootstrap: box-diagram is registered', () => {
  const c = registry.getByName('box-diagram');
  assert.ok(c);
  assert.equal(c.kind, 'markdown-block');
  assert.equal(registry.getByInfoString('box-diagram'), c);
});
```

- [ ] **Step 4: Smoke-test in the browser**

Add a temporary block to any scene in `fixtures/sample-talk/` to confirm end-to-end rendering:

```markdown
```box-diagram
section: SMOKE TEST
box client
box api role=accent
box db  role=warm

client -- POST --> api
api    -- SQL  --> db
```

Run `talk serve fixtures/sample-talk/`, navigate to the edited scene, confirm the diagram renders. Revert the sample before committing.

- [ ] **Step 5: Run tests**

Run: `talk test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(box-diagram): register component; end-to-end smoke"
jj new
```

---

## Phase 7 — Content-aware linter

### Task 24: Diagnostic printer

**Files:**
- Create: `src/authoring/diagnostic-printer.lib.js`
- Create: `src/authoring/diagnostic-printer.lib.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/authoring/diagnostic-printer.lib.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDiagnostics } from './diagnostic-printer.lib.js';

test('formats a single error with file:line:col', () => {
  const diags = [{
    severity: 'error', component: 'box-diagram',
    file: '05-sketch/scene.md', line: 17, column: 3,
    message: "arrow references undeclared node 'apii'",
  }];
  const out = formatDiagnostics(diags);
  assert.match(out, /error\s+05-sketch\/scene\.md:17:3\s+box-diagram\s+arrow references undeclared node 'apii'/);
});

test('formats hint on its own line indented under the diagnostic', () => {
  const diags = [{
    severity: 'error', component: 'box-diagram',
    file: 'a.md', line: 1, column: 1,
    message: 'x', hint: "did you mean 'y'?",
  }];
  const out = formatDiagnostics(diags);
  assert.match(out, /hint\s+did you mean 'y'\?/);
});

test('formats multiple diagnostics with aligned columns', () => {
  const diags = [
    { severity: 'error', component: 'box-diagram', file: 'a.md', line: 1, column: 1, message: 'x' },
    { severity: 'warn',  component: 'box-diagram', file: 'bb.md', line: 20, column: 1, message: 'y' },
  ];
  const out = formatDiagnostics(diags);
  const lines = out.trim().split('\n');
  assert.equal(lines.length, 2);
});

test('returns empty string for no diagnostics', () => {
  assert.equal(formatDiagnostics([]), '');
});
```

- [ ] **Step 2: Run to verify failing**

Run: `talk test`
Expected: module-not-found failures.

- [ ] **Step 3: Implement**

```js
// src/authoring/diagnostic-printer.lib.js

/**
 * Format diagnostics into a multi-line fixed-column string suitable for
 * terminal output. File paths are emitted as-is; callers should make them
 * content-root-relative before passing in.
 *
 * @param {Array<object>} diags
 * @returns {string}
 */
export function formatDiagnostics(diags) {
  if (!diags.length) return '';

  const lines = [];
  const sevWidth = Math.max(5, ...diags.map(d => d.severity.length));
  const locWidth = Math.max(...diags.map(d => formatLoc(d).length));
  const compWidth = Math.max(...diags.map(d => d.component.length));

  for (const d of diags) {
    lines.push(
      pad(d.severity, sevWidth) + '  ' +
      pad(formatLoc(d), locWidth) + '  ' +
      pad(d.component, compWidth) + '  ' +
      d.message
    );
    if (d.hint) {
      lines.push(pad('hint', sevWidth) + '  ' + pad('', locWidth) + '  ' + pad('', compWidth) + '  ' + d.hint);
    }
  }

  return lines.join('\n') + '\n';
}

function formatLoc(d) {
  return `${d.file}:${d.line}:${d.column}`;
}

function pad(s, w) {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}
```

- [ ] **Step 4: Run tests**

Run: `talk test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(lint): diagnostic-printer — fixed-width columns + hint lines"
jj new
```

### Task 25: Rewrite bin/talk-lint.js around registry

**Files:**
- Modify: `bin/talk-lint.js`

- [ ] **Step 1: Read current linter**

```
Read file_path="/home/shawn/src/talk/bin/talk-lint.js"
```

Confirm it only does: talk.toml validation + `discoverScenes` structural checks. We're adding content-aware linting on top.

- [ ] **Step 2: Replace with registry-driven implementation**

Overwrite `bin/talk-lint.js`:

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { discoverScenes } from '../src/authoring/scene-discovery.lib.js';
import { parseToml } from '../src/authoring/toml.lib.js';
import { validateTalkConfig } from '../src/authoring/talk-config.lib.js';
import { parseMarkdownScene } from '../src/authoring/markdown-scene.lib.js';
import { registry } from '../src/authoring/component-registry.js';
import { formatDiagnostics } from '../src/authoring/diagnostic-printer.lib.js';

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

  const sceneType = registry.getByFrontmatterType(parsed.type) || registry.getByName('content-slide');

  // Per-block validation: walk each slide's blocks, dispatch to registered components.
  for (const slide of parsed.slides) {
    for (const block of slide) {
      // Custom markdown-block via fenced code info-string.
      if (block.type === 'code' && block.language) {
        const custom = registry.getByInfoString(block.language);
        if (custom && custom.validate) {
          const data = custom.parse ? custom.parse(block.code, {
            file: `${scene.folder}/scene.md`,
            blockStartLine: block.line || 1,
          }) : block.code;
          const diags = custom.validate(data, {
            file: `${scene.folder}/scene.md`,
            blockStartLine: block.line || 1,
          });
          for (const d of diags) {
            allDiags.push(d);
            if (d.severity === 'error') errorCount++; else warnCount++;
          }
        }
        continue;
      }

      // Built-in markdown-block — typically trivially-valid; call validate if present.
      const builtin = registry.getByBlockType(block.type);
      if (builtin && builtin.validate) {
        const diags = builtin.validate(block, { file: `${scene.folder}/scene.md`, blockStartLine: 1 });
        for (const d of diags) {
          allDiags.push(d);
          if (d.severity === 'error') errorCount++; else warnCount++;
        }
      }
    }
  }
}

// 4. Emit.
process.stdout.write(formatDiagnostics(allDiags));
if (errorCount > 0) {
  console.error(`lint: ${errorCount} error(s), ${warnCount} warning(s)`);
  process.exit(1);
}
console.log(`lint: ok (${warnCount} warning(s))`);
```

- [ ] **Step 3: Thread `block.line` through the splitter**

`parseSlideBlocks` currently doesn't record each block's line number. Update `src/authoring/markdown-scene.lib.js`: within `parseSlideBlocks(lines)`, track a 1-indexed running line counter and attach `line` to each block record before pushing. Specifically, for the fenced-code branch, record `line` as the line of the opening ` ``` ` fence *plus one* (so content-line 1 is the first line inside the fence). For headings/bullets/quotes/paragraphs/spacers, record the line of the first line of the block.

- [ ] **Step 4: Update markdown-scene.lib.js tests**

Add a test to `src/authoring/markdown-scene.lib.test.js` confirming the `line` field is present on each block. Run: `talk test` — fix until green.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(lint): rewrite talk-lint around registry; thread block line numbers"
jj new
```

### Task 26: Linter fixture tests

**Files:**
- Create: `test/fixtures/b-linter/ok/talk.toml`
- Create: `test/fixtures/b-linter/ok/01-intro/scene.md`
- Create: `test/fixtures/b-linter/bad-box-diagram/talk.toml`
- Create: `test/fixtures/b-linter/bad-box-diagram/01-intro/scene.md`
- Create: `test/talk-lint.integration.test.js`

- [ ] **Step 1: Create "ok" fixture**

`test/fixtures/b-linter/ok/talk.toml`:

```toml
name = "b-linter-ok"
framework_version = "0.1.0"
```

`test/fixtures/b-linter/ok/01-intro/scene.md`:

````markdown
---
title: A clean scene
---

# Hello

```box-diagram
box a
box b
a -- x --> b
```
````

- [ ] **Step 2: Create "bad-box-diagram" fixture**

`test/fixtures/b-linter/bad-box-diagram/talk.toml`:

```toml
name = "b-linter-bad"
framework_version = "0.1.0"
```

`test/fixtures/b-linter/bad-box-diagram/01-intro/scene.md`:

````markdown
---
title: Busted
---

# Hello

```box-diagram
box api
apii -- POST --> api
```
````

- [ ] **Step 3: Write integration test**

```js
// test/talk-lint.integration.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lintBin = path.join(__dirname, '..', 'bin', 'talk-lint.js');

function runLint(cwd) {
  return spawnSync('node', [lintBin], { cwd, encoding: 'utf8' });
}

test('clean fixture lints ok', () => {
  const dir = path.join(__dirname, 'fixtures', 'b-linter', 'ok');
  const r = runLint(dir);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /lint: ok/);
});

test('bad-box-diagram fixture reports undeclared-node error', () => {
  const dir = path.join(__dirname, 'fixtures', 'b-linter', 'bad-box-diagram');
  const r = runLint(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /undeclared node 'apii'/);
  assert.match(r.stdout, /did you mean 'api'/);
});
```

- [ ] **Step 4: Run tests**

Run: `talk test`
Expected: both integration tests pass.

- [ ] **Step 5: Commit**

```bash
jj describe -m "test(lint): fixture-based integration coverage for registry-driven lint"
jj new
```

---

## Phase 8 — Dev-mode edge banner on last-good render

### Task 27: last-good per-scene cache

**Files:**
- Create: `src/authoring/last-good-cache.js`
- Create: `src/authoring/last-good-cache.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/authoring/last-good-cache.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLastGoodCache } from './last-good-cache.js';

test('cache retrieves a stored entry by sceneId', () => {
  const cache = createLastGoodCache();
  const entry = { dom: {}, ctx: {} };
  cache.set('scene-1', entry);
  assert.equal(cache.get('scene-1'), entry);
});

test('cache returns undefined for unknown sceneId', () => {
  const cache = createLastGoodCache();
  assert.equal(cache.get('missing'), undefined);
});

test('cache overwrites a stored entry', () => {
  const cache = createLastGoodCache();
  cache.set('s', { v: 1 });
  cache.set('s', { v: 2 });
  assert.deepEqual(cache.get('s'), { v: 2 });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `talk test`
Expected: failing — module not found.

- [ ] **Step 3: Implement**

```js
// src/authoring/last-good-cache.js

/**
 * Per-scene DOM retention cache. Keyed by an opaque scene id (typically the
 * scene folder name). Each entry stores whatever the caller needs to re-mount
 * the previous successful render.
 */
export function createLastGoodCache() {
  const map = new Map();
  return {
    set(id, entry) { map.set(id, entry); },
    get(id) { return map.get(id); },
    has(id) { return map.has(id); },
    clear(id) { if (id) map.delete(id); else map.clear(); },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `talk test`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(runtime): last-good-cache — per-scene DOM retention"
jj new
```

### Task 28: Edge banner component

**Files:**
- Create: `src/authoring/error-banner.js`
- Create: `src/authoring/error-banner.test.js`
- Modify: `package.json` (add `jsdom` as devDependency)

- [ ] **Step 1: Add jsdom devDependency**

Modify `package.json`. Under `devDependencies`, add:

```json
"jsdom": "^24.1.0"
```

Rebuild/reinstall in Docker so the test container has `jsdom`. If `talk test` automatically installs deps on container start, nothing further needed — confirm on the next run.

- [ ] **Step 2: Write failing tests**

```js
// src/authoring/error-banner.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountErrorBanner } from './error-banner.js';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  return dom;
}

test('banner mounts hidden with no diagnostics', () => {
  setupDom();
  const banner = mountErrorBanner(document.body);
  banner.update([]);
  const el = document.querySelector('.talk-error-banner');
  assert.ok(el);
  assert.equal(el.dataset.state, 'hidden');
});

test('banner becomes visible with diagnostics', () => {
  setupDom();
  const banner = mountErrorBanner(document.body);
  banner.update([{ severity: 'error', component: 'x', file: 'a.md', line: 1, column: 1, message: 'm' }]);
  const el = document.querySelector('.talk-error-banner');
  assert.equal(el.dataset.state, 'collapsed');
  assert.match(el.textContent, /1 error/);
});

test('clicking banner expands it and preserves state across updates', () => {
  setupDom();
  const banner = mountErrorBanner(document.body);
  banner.update([{ severity: 'error', component: 'x', file: 'a.md', line: 1, column: 1, message: 'first' }]);
  const el = document.querySelector('.talk-error-banner');
  el.click();
  assert.equal(el.dataset.state, 'expanded');

  banner.update([{ severity: 'error', component: 'x', file: 'a.md', line: 2, column: 1, message: 'second' }]);
  assert.equal(el.dataset.state, 'expanded', 'expand state should persist through updates');
  assert.match(el.textContent, /second/);
});

test('banner dismisses when diagnostics clear', async () => {
  setupDom();
  const banner = mountErrorBanner(document.body);
  banner.update([{ severity: 'error', component: 'x', file: 'a.md', line: 1, column: 1, message: 'm' }]);
  banner.update([]);
  const el = document.querySelector('.talk-error-banner');
  // After clear, banner is in 'clearing' state briefly, then 'hidden'.
  assert.ok(['clearing', 'hidden'].includes(el.dataset.state));
});
```

- [ ] **Step 3: Run to verify failing**

Run: `talk test`
Expected: fail — `mountErrorBanner` not defined.

- [ ] **Step 4: Implement**

```js
// src/authoring/error-banner.js

/**
 * Mount a dev-mode error banner on the given root element. Returns a
 * controller object the HMR diagnostics channel calls to push the current
 * diagnostic set.
 */
export function mountErrorBanner(root) {
  const el = document.createElement('div');
  el.className = 'talk-error-banner';
  el.dataset.state = 'hidden';
  el.style.cssText = `
    position: fixed; left: 0; right: 0; bottom: 0;
    background: rgba(180,40,40,0.92); color: #fff;
    font: 12px monospace; padding: 0.5rem 0.8rem;
    display: none; z-index: 9999; cursor: pointer;
  `;

  const summary = document.createElement('div');
  summary.className = 'talk-error-banner__summary';
  el.appendChild(summary);

  const details = document.createElement('div');
  details.className = 'talk-error-banner__details';
  details.style.cssText = 'display: none; margin-top: 0.4rem; max-height: 40vh; overflow-y: auto;';
  el.appendChild(details);

  el.addEventListener('click', () => toggleExpanded(el, details));
  root.appendChild(el);

  let currentDiags = [];

  function render() {
    const errs = currentDiags.filter(d => d.severity === 'error').length;
    const warns = currentDiags.filter(d => d.severity === 'warn').length;

    if (currentDiags.length === 0) {
      el.dataset.state = 'clearing';
      summary.textContent = 'all good';
      details.innerHTML = '';
      setTimeout(() => {
        if (currentDiags.length === 0) {
          el.dataset.state = 'hidden';
          el.style.display = 'none';
        }
      }, 1000);
      return;
    }

    if (el.dataset.state === 'hidden' || el.dataset.state === 'clearing') {
      el.dataset.state = 'collapsed';
      el.style.display = 'block';
    }

    const first = currentDiags[0];
    summary.textContent = `⚠  ${errs} error${errs === 1 ? '' : 's'}, ${warns} warning${warns === 1 ? '' : 's'} — ${first.file}:${first.line}:${first.column}  (click to expand)`;

    details.innerHTML = '';
    for (const d of currentDiags) {
      const row = document.createElement('div');
      row.textContent = `${d.severity}  ${d.file}:${d.line}:${d.column}  ${d.component}  ${d.message}`;
      details.appendChild(row);
      if (d.hint) {
        const hintRow = document.createElement('div');
        hintRow.textContent = `        ${d.hint}`;
        hintRow.style.opacity = '0.85';
        details.appendChild(hintRow);
      }
    }
  }

  return {
    update(diags) {
      currentDiags = diags || [];
      render();
    },
  };
}

function toggleExpanded(el, details) {
  if (el.dataset.state === 'collapsed') {
    el.dataset.state = 'expanded';
    details.style.display = 'block';
  } else if (el.dataset.state === 'expanded') {
    el.dataset.state = 'collapsed';
    details.style.display = 'none';
  }
}
```

- [ ] **Step 5: Run tests**

Run: `talk test`
Expected: all 4 banner tests pass. Baseline still green.

- [ ] **Step 6: Commit**

```bash
jj describe -m "feat(runtime): error-banner — dev-mode diagnostic surface w/ persistent expand"
jj new
```

### Task 29: HMR diagnostics channel

**Files:**
- Create: `src/authoring/hmr-diagnostics.js`
- Modify: `src/authoring/content-loader-plugin.js`

- [ ] **Step 1: Read the existing Vite plugin**

```
Read file_path="/home/shawn/src/talk/src/authoring/content-loader-plugin.js"
```

Identify where it currently re-emits changes. We'll add a custom HMR event emission whenever a scene fails to compile or produces diagnostics.

- [ ] **Step 2: Create browser-side subscriber**

```js
// src/authoring/hmr-diagnostics.js

/**
 * Subscribe to `talk:diagnostics` HMR events from the Vite plugin. The
 * payload is `{ sceneId, diagnostics }` where `diagnostics` is an array of
 * records in the shape documented in `docs/superpowers/specs/2026-04-19-sub-project-b-design.md`.
 *
 * This module is only imported from the dev entrypoint; production builds
 * can tree-shake it out.
 */
export function subscribeDiagnostics(hot, handler) {
  if (!hot) return () => {};
  const cb = (payload) => handler(payload);
  hot.on('talk:diagnostics', cb);
  return () => hot.off('talk:diagnostics', cb);
}
```

- [ ] **Step 3: Extend the Vite plugin to emit diagnostics**

In `src/authoring/content-loader-plugin.js`:

1. Import registry + markdown parser:

```js
import { parseMarkdownScene } from './markdown-scene.lib.js';
import { registry } from './component-registry.js';
```

2. Add a helper that produces diagnostics for a given scene file. Emit `talk:diagnostics` via `server.hot.send({ type: 'custom', event: 'talk:diagnostics', data: { sceneId, diagnostics } })` after each successful or failed compile.

3. On the `handleHotUpdate` hook (or `configureServer`'s file-watcher), for each markdown scene that changes:
   - Parse it.
   - Walk slides/blocks.
   - For each custom markdown-block, call `component.parse` then `component.validate`; collect diagnostics.
   - Emit the payload.

(Exact function signatures depend on the plugin's current structure; keep behavior non-breaking — never throw out of `handleHotUpdate`.)

- [ ] **Step 4: Smoke test**

Run `talk serve fixtures/sample-talk/`. Open DevTools → Network → WS frames. Edit a scene to introduce a box-diagram error; confirm `talk:diagnostics` frames fire.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(runtime): hmr-diagnostics channel + Vite plugin emit"
jj new
```

### Task 30: Runtime banner integration + first-render-fails fallback

**Files:**
- Modify: `src/main.js`
- Modify: `src/authoring/content-loader-plugin.js` (or wherever scene init happens — identify in Step 1)

- [ ] **Step 1: Locate scene init site**

```
Grep pattern="scene-placeholder" path="/home/shawn/src/talk/src"
```

Find where `createErrorPlaceholderScene` is currently invoked on scene-load failure. That's the integration point.

- [ ] **Step 2: Wire the banner + last-good cache**

In `src/main.js`:

1. Import the banner and cache:

```js
import { mountErrorBanner } from './authoring/error-banner.js';
import { createLastGoodCache } from './authoring/last-good-cache.js';
import { subscribeDiagnostics } from './authoring/hmr-diagnostics.js';

const lastGood = createLastGoodCache();
const banner = (import.meta.env?.DEV) ? mountErrorBanner(document.body) : null;
if (banner && import.meta.hot) {
  subscribeDiagnostics(import.meta.hot, ({ sceneId, diagnostics }) => banner.update(diagnostics));
}
```

2. In the scene-loading path:
   - On successful render: store `{ dom: container.cloneNode(true), ctx }` in `lastGood` keyed by `scene.folder`.
   - On failure: if `lastGood.has(scene.folder)`, re-mount that DOM and DO NOT swap to the error-placeholder. If not, fall back to `createErrorPlaceholderScene` (first-render-fails path).

- [ ] **Step 3: Smoke test the full loop**

Run `talk serve fixtures/sample-talk/`. Add a box-diagram with an intentional error (e.g. `apii` typo). Confirm:
- Banner appears at the bottom of the viewport.
- Last-good render of the scene stays visible.
- Click banner: expands to show the full diagnostic with hint.
- Fix the error: banner flashes "all good", then fades out; scene re-renders.
- Open a *fresh* scene with a pre-existing error (no last-good): full-screen placeholder shows (fallback).

- [ ] **Step 4: Commit**

```bash
jj describe -m "feat(runtime): banner + last-good baseline; first-render-fails falls back to placeholder"
jj new
```

---

## Phase 9 — Docs and wrap-up

### Task 31: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the Components catalogue section**

Replace the current "Components catalogue" section with content reflecting the new `src/components/<name>/` organization. Include:

- A paragraph explaining the registry (`src/authoring/component-registry.js`) as single source of truth.
- An updated table mapping component name → folder → kind (scene-type / markdown-block / js-factory).
- Add `box-diagram` to the markdown-authored list.
- Update the minimal markdown example to use a box-diagram fenced block.

- [ ] **Step 2: Update "Current state" section**

Move the Sub-project B bullet from "Still open" to "Complete". Add sub-bullets:

- Component registry at `src/authoring/component-registry.js`; every rendered element registers a descriptor in `src/components/<name>/component.js`.
- `talk lint` is content-aware: parses each scene via the registry and validates every block.
- Dev mode surfaces errors as an edge banner on the last-good render; full-screen placeholder is only the first-render fallback.
- `box-diagram` is the canonical non-built-in component.

- [ ] **Step 3: Run tests and visually eyeball the doc**

Run: `talk test`
Expected: still green. Then `git diff CLAUDE.md` (or `jj diff`) and confirm the doc is coherent.

- [ ] **Step 4: Commit**

```bash
jj describe -m "docs(claude): describe registry, content-aware lint, edge banner, box-diagram"
jj new
```

### Task 32: Update docs/architecture/authoring.md

**Files:**
- Modify: `docs/architecture/authoring.md`

- [ ] **Step 1: Add a "Component registry" section**

Add a section explaining:
- The descriptor shape.
- The three kinds (`scene-type`, `markdown-block`, `js-factory`).
- How the linter + runtime dispatch through it.
- How to add a new component (create folder, write descriptor, add import to `component-registry.js`).

- [ ] **Step 2: Add a "box-diagram" subsection to the markdown-authoring reference**

Update `docs/markdown-authoring.md` (or `docs/architecture/scenes.md`, whichever is canonical) with the box-diagram syntax from the spec's "box-diagram authoring syntax (v1)" section. Include the full spec scene example.

- [ ] **Step 3: Run tests**

Run: `talk test`
Expected: green.

- [ ] **Step 4: Commit**

```bash
jj describe -m "docs(arch): registry architecture + box-diagram authoring reference"
jj new
```

### Task 33: Update todo.md

**Files:**
- Modify: `todo.md`

- [ ] **Step 1: Move B to done**

Replace the "Sub-project B" section under "Open sub-projects" with a short "Done" entry. Promote the subsections that note "Defer to C" (entity cards, cardinality, chapter chrome, `[palette]` wire-up) into C's scope block — these now belong there explicitly.

- [ ] **Step 2: Verify**

```
Read file_path="/home/shawn/src/talk/todo.md"
```

Confirm B is listed as done and C's scope is expanded accordingly.

- [ ] **Step 3: Commit**

```bash
jj describe -m "docs(todo): mark sub-project B done; expand C scope with deferred items"
jj new
```

---

## Final verification

After Task 33:

- [ ] **Run the full suite:** `talk test`. All tests pass. Count is 184 baseline + net-new from this sub-project.
- [ ] **Author smoke test:** `talk serve fixtures/sample-talk/`. Navigate every slide. Visual parity with pre-refactor.
- [ ] **Content-aware lint smoke:** `talk lint` inside a fixture with intentional errors. Confirm diagnostics include file/line/col, component, message, and hint where applicable.
- [ ] **Edge banner smoke:** run dev server, introduce a half-typed box-diagram error mid-edit. Confirm banner appears, last-good render stays visible, expand persists across edits, banner dismisses on clear.
- [ ] **Removed dirs:** `src/content-slides/`, `src/section-slides/`, `src/three-scenes/`, `src/svg-scenes/`, `src/title-animations/` no longer exist. Only `src/components/<name>/` entries.

All five green → sub-project B is shipped.
