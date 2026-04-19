# Scenes layer

**Path:** `src/scenes/`

## Purpose

The deck's content. One subdirectory per scene, registered in order in
`src/main.js`. Each scene is either:

- **Markdown-authored** — `scene.md` compiled via `compileMarkdownScene`.
- **Hand-rolled** — `scene.js` exporting a module that satisfies
  `SceneModule` (usually built via `createContentSlide`,
  `createSectionSlide`, or `create3DScene`).

Pick one, not both.

## Naming

- Directory: `NN-slug`, where `NN` is a two-digit order prefix. The prefix
  is only a sort key humans read; the actual deck order comes from the
  `SCENE_SOURCES` array in `main.js`.
- Exported scene (when `.js`): `camelCaseScene`, e.g. `hotTakesScene`.

## Terminology

```
Scene      = one module (one directory)
 Slide     = one step in the scene's navigation (advance with ArrowRight
             once the final step of the previous slide is reached)
  Step     = one reveal within a slide (e.g. the next bullet appearing)
```

The command-palette `Jump to Slide` accepts `scene.slide.step` (all
1-indexed), so `9.2.1` jumps to scene 9, slide 2, step 1.

## The contract

Every scene exports the `SceneModule` shape — title, slides, init, destroy,
resolveToSlide, animateToSlide. See `src/types.js` for the exact signatures
and `engine.md` for how the engine calls them.

**Determinism guarantee:** `resolveToSlide(slideIndex, stepIndex)` must
produce the same visual state regardless of whether you got there by
animating through 0..n or jumping directly. Store absolute state, not
deltas.

## Registering a scene

Today this is manual:

1. Add the directory + file under `src/scenes/`.
2. In `src/main.js`, import the export (or the raw markdown with `?raw`
   and pass through `compileMarkdownScene`).
3. Add an entry to `SCENE_SOURCES` — order in this array is the talk's
   slide order. Each entry is `{ scene, path }` (the path is surfaced by
   the debug overlay and the `o` shortcut).

An auto-registration variant using `import.meta.glob` is a natural next
step; not implemented yet.

## Common pitfalls

- **Order drift.** The `NN-` directory prefix doesn't drive ordering —
  `SCENE_SOURCES` does. Keep them in sync by hand.
- **Both `scene.md` and `scene.js`.** Only one will be registered (whichever
  `main.js` imports). The other is dead code.
- **Forgetting to register.** Scene file exists, but doesn't appear in the
  deck. Validation runs only on registered scenes, so there's no warning.
