# beam-talk

A reusable presentation framework. The framework lives in `src/`; presentations live in their own top-level content folders and are chosen at runtime. Three.js + vanilla JS + Vite.

## Development

All tooling runs inside Docker. Nothing installed on the host.

```bash
./dev <content-dir>     # Run dev server against a specific content folder
./lint <content-dir>    # Validate content parseability against the framework
./test                  # Run framework tests
```

Scripts are extensionless executables with shebangs. Never add `.sh` suffixes.

## Version control: jujutsu (jj)

**Always use `jj`, never `git`.** The repo is a colocated git+jj checkout, so the `.git` directory exists for tooling compatibility, but all version-control operations go through `jj`.

Common operations:

```bash
jj status                       # show working-copy changes
jj describe -m "message"        # set description on the current change
jj new                          # start a new empty change on top of @
jj bookmark set main -r @       # move the main bookmark to the current change
jj git push                     # sync bookmarks to origin (= git push)
jj git fetch                    # = git fetch
jj log                          # show recent history
```

Key mental-model differences from git:
- Every edit updates the current change (`@`) in-place. There is no staging.
- Branches are "bookmarks" and are explicit. A bookmark only moves when you move it.
- "Detached HEAD" doesn't exist as a concept — every change is a first-class commit reachable by its change ID.
- `jj git push` only pushes bookmarks that point at non-remote commits. To publish work, set a bookmark (usually `main`) on the change you want to publish, then push.

## Paradigm

This is the north star for the project — described as the target, not as what's implemented today. The gap between this section and reality is enumerated in **Current state** at the bottom.

### Framework vs content separation

Everything under `src/` is framework code. No presentation content lives in the framework. A presentation is a content folder — top-level, arbitrary name — that the framework runs against.

### Parameterized content folder

The content folder is chosen at run time, not hard-coded. The dev server and linter take the folder as an argument:

```bash
./dev content/beam-talk
./dev content/some-other-presentation
./lint content/beam-talk
```

Multiple presentations can coexist in the repo side-by-side. The framework has no knowledge of any specific presentation.

### Reusable components

The framework exposes a catalogue of reusable components. Authors compose presentations from these components, specified in a human-readable way — markdown frontmatter + block syntax wherever possible, with fall-through to JS factories for custom behavior.

### Component-aware linter

The framework supplies a linter that understands every component it exposes. For each component reference in content, the linter validates that the content is fully parseable by the framework's understanding of that component (e.g., if a `box-diagram` component exists, the linter identifies uses of it and validates each use is structurally complete and renderable). Failures produce actionable, path + line errors.

### Author workflow

1. Edit files in the content folder.
2. Run the linter to verify everything is parseable.
3. Run the dev server against the content folder; changes hot-reload in the browser.

## Framework architecture

Framework layers under `src/`. Content never lives here.

| Layer | Path | Purpose |
|-------|------|---------|
| Engine | `src/engine/` | Deck navigation, position tracking, rapid-skip detection |
| Rendering | `src/rendering/` | Three.js, HTML, SVG renderers (common lifecycle) |
| Animation | `src/animation/` | Tween/timeline system for slide transitions |
| Commands | `src/commands/` | Fuzzy-search command palette (Escape key) |
| Authoring | `src/authoring/` | Markdown scene compiler, scene validation, editor middleware |
| Content slides | `src/content-slides/` | `createContentSlide` — bullets/headings/quotes/code |
| Section slides | `src/section-slides/` | `createSectionSlide` — large section breaks |
| Title animations | `src/title-animations/` | `createTitleScene` + animation variants |
| Three scenes | `src/three-scenes/` | `createThreeScene` factory — boilerplate for 3D scenes |
| SVG scenes | `src/svg-scenes/` | `createSvgScene` factory — boilerplate for SVG scenes |

Shared utilities: `src/shared/colors.js` (palette constants + CSS vars).

## Content contract

A content folder contains scene modules — either markdown (`scene.md`) or JS (`scene.js`), one per scene directory:

```
<content-dir>/
  <nn>-<slug>/
    scene.md   # or scene.js — pick one, not both
  <nn>-<slug>/
    scene.js
```

The `nn-` prefix is a sorting hint. Every scene module satisfies the contract:

```javascript
export const myScene = {
  title: 'Scene Name',
  slides: [{ stepCount: N }, ...],
  init(stage) { /* setup renderer + objects, return context */ },
  destroy() { /* cleanup animations, renderer, DOM */ },
  resolveToSlide(ctx, slideIndex, stepIndex) { /* instant render */ },
  animateToSlide(ctx, slideIndex, stepIndex, done) { /* animated transition, call done() */ },
}
```

Markdown scenes satisfy this contract via `compileMarkdownScene`; JS scenes typically do so via one of the factories in the components catalogue.

**Determinism guarantee:** `resolveToSlide(n)` must produce identical visual state whether reached by animating through slides `0..n` or jumping directly. Slide states are absolute, not deltas.

## Components catalogue

The framework exposes these components. Authors should reach for the highest-level component that fits.

### Markdown-authored

Author these by dropping a `scene.md` in the content folder. See `docs/markdown-authoring.md` for the full block and frontmatter reference.

- **Content slide** (`src/content-slides/`) — headings, bullets, quotes, code fences, paragraphs, muted text, spacers. The default `type` in frontmatter.
- **Section slide** (`src/section-slides/`) — large titled section break. `type: section` in frontmatter.

Minimal example:

```markdown
---
title: Why it matters
type: content
accent: "#aaccff"
---

# Heading

- first bullet
- second bullet

---

### Another slide

> Make it work, make it beautiful, make it fast.
> — Joe Armstrong
```

`---` on its own line separates slides. `{{tokenName}}` is replaced with `colors[tokenName]` at compile time.

### JS-authored factories

For custom behavior, use a factory from the catalogue. The factory absorbs renderer / lifecycle / cancellation boilerplate.

- **Three.js scene** (`src/three-scenes/scene-factory.js`) — `createThreeScene({ title, slides, setup, onTick, resolveStep, animateStep })`
- **SVG scene** (`src/svg-scenes/scene-factory.js`) — `createSvgScene(...)`
- **Title animation** (`src/title-animations/`) — `createTitleScene` with animation variants (typewriter, drop, zoom-punch, spin-lock, extrude, reverse-explode)

Minimal Three.js example:

```javascript
import { createThreeScene } from '../../src/three-scenes/scene-factory.js';

export const myScene = createThreeScene({
  title: 'My 3D Scene',
  slides: [{ stepCount: 3 }],
  setup({ scene, camera }) { /* create objects, return handle */ },
  onTick(objects, { markDirty }) { /* optional per-frame update */ },
  resolveStep(objects, { slideIndex, stepIndex }) { /* absolute state */ },
  animateStep(objects, { stepIndex, playTimeline, setTimeout, markDirty, done }) {
    // Use injected playTimeline/setTimeout — cancellation is automatic.
    // Always call done() when the step finishes.
  },
});
```

## Linter

The linter is the framework's contract with content. It knows every component the framework exposes and validates that every use of those components is structurally complete and parseable.

Run with:

```bash
./lint <content-dir>
```

The linter reports path + line errors on failure, zero on success. The dev server also runs the linter at startup, so authors see failures immediately without running a separate command.

## Patterns

**Pure function separation:** Logic in `*.lib.js`, tests in `*.lib.test.js`, side effects in separate files. TDD red-green-refactor.

**On-demand rendering:** Three.js scenes use a `needsRender` flag. Always call `renderer.markDirty()` after changing object properties.

**Animation cancellation:** Store `currentAnimation = playTimeline(...)`. On interrupt: `currentAnimation.resolve()` snaps to end state, then call `done()`.

**Colors:** Import from `src/shared/colors.js`. Never hardcode hex values. Use `colors.bg`, `colors.accent`, etc.

## Authoring aids (dev mode)

- Press `Escape` for the command palette. `Jump to Slide...` accepts `scene.slide.step` (e.g. `9.2`).
- Press `o` to open the current scene's source file in `$EDITOR`. Falls back to copying the path to the clipboard.
- Press `d` / `n` to toggle the debug overlay / nav overlay.

## Current state

The sections above describe the target paradigm. These are the gaps between the paradigm and what is currently implemented. Closing them is tracked in `todo.md`.

- **Content folder is not yet parameterized.** Content lives at `src/scenes/` (only a `placeholder/` scene right now), and `./dev` does not accept a content-folder argument.
- **Registration is manual.** Scenes are imported and listed in a `SCENE_SOURCES` array in `src/main.js`. There is no auto-discovery of a content folder.
- **Markdown bridge is partial.** Markdown covers content slides and section slides only. Title animations, Three.js scenes, and SVG scenes still require JS entry points.
- **Linter is shape-only.** `src/authoring/scene-validation.lib.js` validates the scene contract (title, slides, stepCount, required methods). It has no component-aware parseability checks.
- **No `./lint` script.** `./dev-check` probes Vite's import graph but is not content-aware.
- **Framework-specific content is archived** in `archive/` (the prior BEAM/Elixir talk). The framework itself carries no talk-specific content.

## See also

- `src/types.js` — JSDoc typedefs for every scene / factory contract. Reference via `/** @type {import('.../types.js').SceneModule} */`.
- `docs/architecture/` — per-layer one-pagers: `engine.md`, `rendering.md`, `animation.md`, `authoring.md`, `scenes.md`. Cover the *why* and the invariants behind each layer.
- `docs/markdown-authoring.md` — complete frontmatter + block-syntax reference for markdown-authored scenes.
- `docs/examples/minimal-markdown.md` and `docs/examples/minimal-three.js` — smallest functional scenes.
- `todo.md` — the gap list between the paradigm and the current implementation.
