---
name: scene-builder
description: Use when creating, adding, or scaffolding a new presentation scene — triggers on "new scene", "add scene", "create scene", "build slide", or working in src/scenes/
---

# Scene Builder

Rigid skill for creating presentation scenes in beam-talk. Follow this checklist exactly.

## 1. Decide Scene Format

| Format | When | File |
|--------|------|------|
| **Markdown** (default) | Content-heavy slides: headings, bullets, quotes, code, text | `scene.md` |
| **Section slide** | Title-card transitions between sections | `scene.md` with `type: section` |
| **Three.js** | 3D visuals, animated diagrams, process simulations | `scene.js` via `createThreeScene` |
| **Custom HTML** | Rare — bespoke DOM layouts | `scene.js` via `createHtmlRenderer` |

Default to markdown unless you genuinely need custom code.

## 2. Create Scene File

Path: `src/scenes/{nn}-{name}/scene.md` (or `scene.js` for code scenes — pick one, not both)

- `{nn}` = two-digit scene number matching planned order
- `{name}` = kebab-case descriptive name

## 3a. Markdown Scene (`scene.md`)

```markdown
---
title: Why the BEAM?
type: content
---

# Slide one heading

- first bullet
- second bullet
- uses <strong style="color:{{beam}}">palette colors</strong> via {{token}} syntax

---

### The Philosophy

:spacer:

> Make it work, make it beautiful, make it fast.
> — Joe Armstrong

:spacer:

!muted A quieter trailing paragraph.
```

Syntax:
- `---` on its own line separates slides
- Each top-level block = one reveal step
- Blocks: `# / ## / ###` headings, `- / *` bullets, `> quote` (trailing `— attribution` captured), ```` ``` ```` code fences, `:spacer:` / `:spacer lg:`, `!muted text`, plain paragraphs
- Raw HTML passes through
- `{{colorName}}` is replaced with `colors[colorName]` from `src/shared/colors.js`

For section slides:
```markdown
---
title: Hot Takes
type: section
subtitle: Unpopular opinions
accent: "#ff6b35"
---
```
(No body needed.)

## 3b. Three.js Scene (`scene.js` via `createThreeScene`)

Use the factory — it absorbs renderer setup, animation cancellation, and lifecycle:

```javascript
import { createThreeScene } from '../../three-scenes/scene-factory.js';
import { colors } from '../../shared/colors.js';
import * as THREE from 'three';

export const myScene = createThreeScene({
  title: 'Scene Title',
  slides: [{ stepCount: 3 }],
  background: colors.bg,

  setup({ scene, camera }) {
    // Create meshes; return them as a handle.
    const box = new THREE.Mesh(/* ... */);
    scene.add(box);
    return { box };
  },

  // Optional per-frame update (drift, rotation, etc.)
  onTick(objects, { markDirty }) {
    objects.box.rotation.y += 0.005;
  },

  // ABSOLUTE state for a given slide/step.
  resolveStep(objects, { slideIndex, stepIndex }) {
    objects.box.material.opacity = stepIndex >= 1 ? 1 : 0;
  },

  // Animated transition. ALWAYS call done() when finished.
  // playTimeline and setTimeout are auto-cancelled on next step.
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

Reference: `src/scenes/07-beam-vm/scene.js`.

## 4. Determinism Checklist

- [ ] `resolveStep` sets ALL object properties to absolute values (positions, visibility, opacity)
- [ ] `resolveStep` does NOT depend on previous slide state
- [ ] Jumping directly to step N produces identical state to animating through 0..N
- [ ] Steps within a slide are cumulative

## 5. Register the Scene

In `src/main.js`:

**Markdown:**
```javascript
import mySceneMd from './scenes/nn-name/scene.md?raw';
// ...
const mySceneModule = compileMarkdownScene(mySceneMd);
```
Add it to `SCENE_SOURCES` with its source path.

**JS:**
```javascript
import { myScene } from './scenes/nn-name/scene.js';
```
Add it to `SCENE_SOURCES` with its source path.

## 6. Pure Function Separation (for non-trivial logic)

If the scene has meaningful logic (state machines, layout calc):
1. Extract to `src/scenes/{nn}-{name}/scene.lib.js`
2. Write tests in `src/scenes/{nn}-{name}/scene.lib.test.js`
3. Import into `scene.js`

## 7. Verify

1. `./test` — all tests pass
2. `./dev-check` — no Vite errors
3. Navigate to the scene via command palette, click through all steps
4. Jump directly via `Jump to Slide N.M` — state is correct
5. Rapid-click through slides — animations cancel cleanly
6. Navigate away and back — scene reinitializes cleanly
7. Press `o` in dev mode — opens the scene source in `$EDITOR`
