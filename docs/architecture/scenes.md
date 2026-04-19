# Scenes layer

**Path:** content folders are free-standing — any directory containing a
`talk.toml`, anywhere on disk. The framework never ships scene content.

## Purpose

A scene is one module (one directory) inside a content folder. Each scene is
either:

- **Markdown-authored** — `scene.md` compiled via `compileMarkdownScene`.
- **Hand-rolled** — `scene.js` exporting a module that satisfies
  `SceneModule` (usually built via `createContentSlide`,
  `createSectionSlide`, `createTitleScene`, `create3DScene`, or
  `createSvgScene`).

Pick one, not both — structural lint flags the ambiguity.

## Naming

- Directory: `NN-slug`, where `NN` is a two-digit order prefix and `slug` is
  kebab-case. The prefix drives deck order at runtime.
- Exported scene (when `.js`): `camelCaseScene`, e.g. `hotTakesScene`. The
  runtime picks the scene via the module's `default` export, falling back
  to the first export whose shape looks like a scene.

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

## Registration

Scenes are discovered automatically. The Vite `content-loader-plugin`
(`src/authoring/content-loader-plugin.js`) walks the mounted content folder
at build time, discovers every `NN-slug/` directory containing a `scene.md`
or `scene.js`, and exposes the resulting manifest via the
`virtual:content-manifest` module. `src/main.js` imports that virtual module
and compiles each source on load.

No hand-maintained registry. Authors add or remove scenes by editing the
filesystem (or via `talk add` / `talk remove` / `talk move`); the manifest
rebuilds on the next dev-server request.

## Common pitfalls

- **Both `scene.md` and `scene.js`.** Flagged as a structural issue by
  `talk lint` and by the content-loader at startup. Pick one.
- **Prefix collisions.** Two `03-…` folders produce a deterministic-but-
  arbitrary ordering. `talk lint` reports this as a warning.
- **Non-scene subdirectories in the content folder.** Ignored — only
  directories matching `NN-slug/` with a `scene.md` or `scene.js` are
  picked up.
