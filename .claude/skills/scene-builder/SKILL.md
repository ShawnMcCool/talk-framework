---
name: scene-builder
description: Use when creating, editing, scaffolding, or registering a presentation scene in talk — triggers on "new scene", "add scene", "create scene", "build slide", "edit scene", "scene.md", "scene.js", "createThreeScene", "createSvgScene", "createContentSlide", "createSectionSlide", "createTitleScene", "compileMarkdownScene", "cornerLoop", "trackedPlayTimeline", "register scene", "SCENE_SOURCES", or working in src/scenes/.
---

# Scene Builder

Rigid reference for creating and editing presentation scenes in talk. Use the sections below as a checklist.

## Architecture recap

Scenes live in `src/scenes/{nn}-{name}/` and must satisfy the **scene contract** (see `CLAUDE.md`):

```js
export const scene = {
  title, slides: [{ stepCount }],
  init(stage), destroy(),
  resolveToSlide(ctx, slideIdx, stepIdx),
  animateToSlide(ctx, slideIdx, stepIdx, done),
}
```

Every scene is registered in `src/main.js`'s `SCENE_SOURCES` array. Order in that array = deck order. Directory `nn` prefix is cosmetic only.

**Determinism invariant:** `resolveToSlide(n, k)` must produce identical visual state whether reached by direct jump or by animation. Never store cumulative state; always rebuild from inputs.

## 1. Pick a factory

Default to markdown. Escalate only when you have a real need.

| Format | When | File | Factory |
|--------|------|------|---------|
| **Markdown content** (default) | Headings, bullets, quotes, code, columns — any text-heavy slide | `scene.md` with `type: content` | `createContentSlide` (via compiler) |
| **Markdown section card** | Section title / transition between acts | `scene.md` with `type: section` | `createSectionSlide` (via compiler) |
| **SVG scene** | Animated vector diagrams (graphs, timelines, flows) that aren't 3D | `scene.js` | `createSvgScene` |
| **Three.js scene** | 3D visuals, depth, physics, shaders | `scene.js` | `createThreeScene` |
| **Title animation** | Reusable title reveal effects (drop, typewriter, extrude…) | `scene.js` + animation module | `createTitleScene` |

**Hard rule:** Do not hand-roll a custom scene module when a factory fits. Hand-rolled scenes duplicate animation cancellation and RAF management — both footguns. If no factory fits, flag it in `friction-notes.md` and ask before implementing.

## 2. Scene directory

Path: `src/scenes/{nn}-{name}/scene.md` **or** `scene.js` (not both).

- `{nn}` — two-digit slot (cosmetic; order is controlled by `SCENE_SOURCES`)
- `{name}` — kebab-case descriptive name

Scenes needing pure logic get a sibling `scene.lib.js` + `scene.lib.test.js` (see §6).

## 3a. Markdown scenes (`scene.md`)

### Frontmatter (full reference)

```yaml
---
title: Why the BEAM?       # required
type: content              # "content" (default) or "section"
accent: "#aaccff"          # primary accent color (both types)
bg: "#1a1a2e"              # outer background (both types)
bgDark: "#141428"          # radial center for section; gradient for content
text: "#e8e8f8"            # title/body text color

# section only:
subtitle: "Unpopular opinions"
fontSize: "7rem"           # section title size
letterStagger: 50          # ms between letter-in animations

# content only:
colors:                    # per-scene palette override
  accent: "#ff0"
  bgDark: "#0a0a1a"
---
```

### Block syntax

`---` on its own line separates slides. **Each top-level block is one reveal step** (step N shows blocks 0..N).

| Block | Syntax |
|-------|--------|
| Heading | `#`, `##`, `###` |
| Bullet list | `-` or `*` lines |
| Paragraph | plain text |
| Muted paragraph | `!muted trailing text` |
| Quote | `> quoted`, trailing `— name` or `-- name` captured as attribution |
| Code fence | ```` ```php ```` … ```` ``` ```` |
| Columns | `:columns:` directive (see below) |
| Spacer | `:spacer:` or `:spacer lg:` |

### Columns block

```markdown
:columns:
## Left heading
- left bullet

|||

## Right heading
- right bullet
:/columns:
```

### Raw HTML passthrough

Any HTML is passed through verbatim. Use this for icons, badges, inline SVG, or layout effects the block syntax doesn't cover.

### Color token interpolation

`{{tokenName}}` is replaced with `colors[tokenName]` at compile time. Valid tokens: see §7.

### Registration

```js
import srcMd from './scenes/nn-name/scene.md?raw';
const myScene = compileMarkdownScene(srcMd);
// add to SCENE_SOURCES
```

## 3b. SVG scenes (`scene.js` via `createSvgScene`)

For animated vector diagrams. The factory wraps the `html-scene` renderer, mounts an `<svg>` root and optional HTML overlay, and injects tracked `playTimeline` + `setTimeout` (auto-cancel on next step).

```js
import { createSvgScene } from '../../components/svg-scene/scene-factory.js';
import { colors } from '../../shared/colors.js';

export const myScene = createSvgScene({
  title: 'My SVG Scene',
  slides: [{ stepCount: 1 }, { stepCount: 1 }],

  setup({ svg, html }) {
    // Build initial SVG/HTML DOM. Return a handle.
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '20');
    svg.appendChild(circle);
    return { circle };
  },

  // ABSOLUTE state for given slide/step.
  resolveStep(objects, { slideIndex, stepIndex }) {
    objects.circle.setAttribute('fill', slideIndex === 0 ? colors.bg : colors.accent);
    objects.circle.setAttribute('cx', slideIndex * 100);
  },

  // Animated transition. Always call done().
  animateStep(objects, { slideIndex, stepIndex, playTimeline, setTimeout, done }) {
    playTimeline(
      [{ property: 'cx', from: 0, to: slideIndex * 100, delay: 0, duration: 400 }],
      (v) => objects.circle.setAttribute('cx', v.cx),
      done,
    );
  },

  onDestroy(objects) { /* cleanup, if needed */ },
});
```

## 3c. Three.js scenes (`scene.js` via `createThreeScene`)

For 3D content. The factory owns renderer creation/destruction, resize handling, animation cancellation, and the on-demand render loop.

```js
import { createThreeScene } from '../../components/three-scene/scene-factory.js';
import { colors } from '../../shared/colors.js';
import * as THREE from 'three';

export const myScene = createThreeScene({
  title: 'My 3D Scene',
  slides: [{ stepCount: 3 }],
  background: colors.bg,

  setup({ scene, camera }) {
    const box = new THREE.Mesh(/* ... */);
    scene.add(box);
    return { box };
  },

  onTick(objects, { markDirty }) {
    objects.box.rotation.y += 0.005;
    markDirty();
  },

  resolveStep(objects, { slideIndex, stepIndex }) {
    objects.box.material.opacity = stepIndex >= 1 ? 1 : 0;
  },

  animateStep(objects, { stepIndex, playTimeline, setTimeout, markDirty, done }) {
    if (stepIndex === 1) {
      playTimeline(
        [{ property: 'op', from: 0, to: 1, delay: 0, duration: 400 }],
        (v) => { objects.box.material.opacity = v.op; markDirty(); },
        done,
      );
    } else {
      done();
    }
  },
});
```

**Always call `markDirty()` after mutating Three.js state.** The renderer is on-demand; without it, nothing redraws.

Reference: `src/scenes/07-beam-vm/scene.js`.

## 3d. Title animation scenes (`createTitleScene`)

For reusable title entrance animations. See `src/components/title-animation/` for the factory and `src/scenes/_attic/*/` for examples (drop, typewriter, extrude, zoom-punch, reverse-explode, spin-lock).

## 4. Determinism checklist

- [ ] `resolveStep` sets **all** relevant properties absolutely (position, scale, opacity, content)
- [ ] `resolveStep` never depends on previous state
- [ ] Direct jump to slide N / step K yields identical visual to animating through 0..N
- [ ] Steps within a slide are cumulative

## 5. Animation primitives

### `playTimeline(tweens, apply, done)`

From `src/animation/timeline.js`. Runs an array of linear tweens in parallel:

```js
playTimeline(
  [
    { property: 'x', from: 0, to: 100, delay: 0, duration: 300 },
    { property: 'op', from: 0, to: 1, delay: 100, duration: 200 },
  ],
  (values) => { /* apply values.x, values.op */ },
  () => { /* done */ },
);
```

Returns `{ resolve() }`. Calling `resolve()` cancels the RAF loop, snaps to final values, and calls `done()` exactly once.

### `createTrackedTimeline()`

From `src/animation/tracked-timeline.js`. Returns `{ playTimeline, setTimeout, cancelAll }`. Use this in hand-rolled scenes so cancellation is automatic on scene tear-down or step interruption.

```js
const tracker = createTrackedTimeline();
tracker.playTimeline(tweens, apply, done);   // auto-tracked
tracker.setTimeout(fn, 300);                  // auto-tracked
// On destroy / interrupt:
tracker.cancelAll();
```

Both factory scenes (`createSvgScene`, `createThreeScene`) use this internally — the injected `playTimeline`/`setTimeout` are already tracked.

### Cancellation invariants

- `done` is always called **exactly once**, whether the timeline completes naturally or is cancelled.
- Cancellation snaps to final values before calling `done`.
- Scenes must assume any in-flight animation may be cancelled at any time.

## 6. Pure function separation

Non-trivial scene logic (state machines, layout math, sequencing) belongs in `scene.lib.js`:

1. Extract to `src/scenes/{nn}-{name}/scene.lib.js` — no imports of DOM/Three/SVG.
2. Write tests in `scene.lib.test.js` — TDD red-green-refactor.
3. Import into `scene.js` for side effects.

This is mandated by project convention (CLAUDE.md).

## 7. Color tokens

From `src/shared/colors.js`. Never hardcode hex.

| Token | Hex | Use |
|-------|-----|-----|
| `bg` | `#1a1a2e` | Primary background |
| `bgDark` | `#141428` | Darker gradient stop |
| `bgDarker` | `#0f0f1e` | Deepest gradient stop |
| `text` | `#e8e8f8` | Body text |
| `textMuted` | `#99aacc` | Muted/secondary text |
| `accent` | `#aaccff` | Primary accent (cyan-blue) |
| `accentWarm` | `#ff9944` | Warm accent (orange) |
| `accentOrange` | `#ff8844` | Warm variant |
| `failure` | `#ff3366` | Error/danger |
| `beam` | `#44bbff` | BEAM-specific cyan |
| `green` | `#44dd88` | Success/positive |
| `purple` | `#aa77ff` | Accent purple |

Access: `import { colors } from 'src/shared/colors.js'`, then `colors.accent`. In markdown, use `{{accent}}` in raw HTML blocks.

## 8. Cross-scene overlays

### `cornerLoop` module (`src/shared/corner-loop.js`)

Singleton managing a fixed-position element that persists across scenes.

```js
import { cornerLoop } from '../../shared/corner-loop.js';

// In scene init():
cornerLoop.show({ at: 'corner', highlight: 'friction', withQuestion: false });

// Animated transitions:
cornerLoop.animateTo({ at: 'center', withQuestion: true }, 800, onDone);

// In scene destroy() — only if leaving the group that uses it:
cornerLoop.hide();
```

Scenes call `show()` in `init()` (idempotent — safe to call every time). Only `hide()` when leaving the act that owns the overlay. The DOM element lives in `index.html` at `#corner-loop-root`.

## 9. Register the scene

In `src/main.js`:

```js
import myScene from './scenes/nn-name/scene.js';           // JS scene
// or
import mySceneMd from './scenes/nn-name/scene.md?raw';     // markdown
const myScene = compileMarkdownScene(mySceneMd);

const SCENE_SOURCES = [
  // ...existing entries...
  { scene: myScene, path: 'src/scenes/nn-name/scene.{js|md}' },
];
```

**Order in `SCENE_SOURCES` = deck order.** Don't assume directory name prefix drives anything.

## 10. Verify

1. `./dev-check` — Vite compiles (zero errors, zero warnings about missing imports)
2. `./test` — all tests pass (including new `*.lib.test.js`)
3. `./dev` + navigate: arrow keys through every slide/step in the new scene
4. **Determinism:** `Escape` → `Jump to Slide N.M` — state matches what animation would produce
5. **Rapid skip:** hammer `→` to blow past the scene — animations cancel cleanly, no `done` called twice
6. **Round-trip:** navigate away and back — scene re-initializes cleanly
7. **Editor shortcut:** press `o` in dev mode to open the scene source

## Friction log

When something about the authoring flow is awkward, add an entry to `friction-notes.md` at the repo root. Include: file path, line numbers, observation, suggested fix. Don't lose the signal.

## Common pitfalls

- **Forgetting `markDirty()`** in Three.js scenes — the renderer is on-demand; nothing updates without it.
- **State leakage** — `resolveStep` relying on what `animateStep` left behind. Rebuild absolutely, every time.
- **Calling `done()` more than once** — the injected `playTimeline` calls `done` exactly once. If you also call `done()` manually after it, you double-fire. Let the timeline own `done`.
- **Hand-rolling Three.js instead of using `createThreeScene`** — you'll re-invent cancellation and RAF management. Use the factory.
- **Hardcoded hex colors** — always import from `src/shared/colors.js`.
- **Registration drift** — adding a scene directory without adding to `SCENE_SOURCES` = orphan. Always register.
