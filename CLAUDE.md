# talk

A reusable presentation framework. The framework lives in `src/`; presentations live in their own top-level content folders and are chosen at runtime. Three.js + vanilla JS + Vite.

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

The content folder is chosen at run time, not hard-coded. Every `talk` command operates on the content folder identified by the nearest `talk.toml` (walking up from the current directory), and content folders live anywhere on disk:

```bash
talk serve ~/src/my-elixir-talk
talk lint  ~/src/my-elixir-talk
```

Multiple presentations can coexist side-by-side; the framework has no knowledge of any specific presentation.

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
| Content slides | `src/components/content-slide/` | `createContentSlide` — bullets/headings/quotes/code |
| Section slides | `src/components/section-slide/` | `createSectionSlide` — large section breaks |
| Title animations | `src/components/title-animation/` | `createTitleScene` + animation variants |
| Three scenes | `src/components/3d-scene/` | `create3DScene` factory — boilerplate for 3D scenes |
| SVG scenes | `src/components/svg-scene/` | `createSvgScene` factory — boilerplate for SVG scenes |

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

`src/authoring/component-registry.js` is the single source of truth. Every component — scene-type, markdown-block, or js-factory — registers a descriptor in its own `src/components/<name>/component.js` at module load time. Authors don't consult the registry directly; the linter and content-slide dispatcher query it at runtime to parse and validate content.

| Name | Folder | Kind |
|------|--------|------|
| content-slide | `src/components/content-slide/` | scene-type |
| section-slide | `src/components/section-slide/` | scene-type |
| heading | `src/components/heading/` | markdown-block |
| paragraph | `src/components/paragraph/` | markdown-block |
| bullet-list | `src/components/bullet-list/` | markdown-block |
| quote | `src/components/quote/` | markdown-block |
| code-fence | `src/components/code-fence/` | markdown-block |
| spacer | `src/components/spacer/` | markdown-block |
| box-diagram | `src/components/box-diagram/` | markdown-block |
| 3d-scene | `src/components/3d-scene/` | js-factory |
| svg-scene | `src/components/svg-scene/` | js-factory |
| title-animation | `src/components/title-animation/` | js-factory |

### Markdown-authored

Author these by dropping a `scene.md` in the content folder. See `docs/markdown-authoring.md` for the full block and frontmatter reference.

The two scene types are selected via `type:` in frontmatter: **content-slide** (the default) accepts body blocks; **section-slide** renders a large titled section break (`type: section`).

Body blocks — heading, paragraph, bullet-list, quote, code-fence, spacer, and box-diagram — are authored inline in the scene body using standard markdown syntax or fenced-code DSL.

Minimal example:

````markdown
---
title: Why it matters
type: content
---

# Heading

- first bullet
- second bullet

```box-diagram
section: THE SYSTEM
box client
box api role=accent
client -- POST --> api
```
````

`---` on its own line separates slides. `{{tokenName}}` is replaced with `colors[tokenName]` at compile time.

### JS-authored factories

For custom behavior, use a factory from the catalogue. The factory absorbs renderer / lifecycle / cancellation boilerplate.

- **Three.js scene** (`src/components/3d-scene/scene-factory.js`) — `create3DScene({ title, slides, setup, onTick, resolveStep, animateStep })`
- **SVG scene** (`src/components/svg-scene/scene-factory.js`) — `createSvgScene(...)`
- **Title animation** (`src/components/title-animation/`) — `createTitleScene` with animation variants (typewriter, drop, zoom-punch, spin-lock, extrude, reverse-explode)

Minimal Three.js example:

```javascript
import { create3DScene } from '../../src/components/3d-scene/scene-factory.js';

export const myScene = create3DScene({
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

Sub-project A (content-folder foundation) is complete:

- `talk` CLI on PATH dispatches to focused subcommand scripts.
- Content folders are free-standing and marked by a `talk.toml` at their root.
- Scenes live in numeric-prefixed directories (`01-welcome/`, `02-intro/`, …).
- Structural edits (`add`, `remove`, `rename`, `move`) are atomic and support `--dry-run`.
- The Vite content-loader plugin exposes the mounted content folder via `virtual:content-manifest`.
- Bad scenes render as error-placeholder cards; the rest of the deck stays navigable.

Sub-project B (component-aware linter + dev error overlay) is complete:

- Component registry at `src/authoring/component-registry.js`; every rendered element registers a descriptor in `src/components/<name>/component.js`.
- `talk lint` is content-aware: parses each scene via the registry and validates every block.
- Dev mode surfaces errors as an edge banner on the last-good render; the full-screen placeholder is only the first-render fallback.
- `box-diagram` is the canonical non-built-in component — fenced-code DSL with parser, validator, and renderer.

Still open (see `todo.md`):

- **Sub-project C** — markdown bridges for Three.js / SVG / title-animation components.
- **Sub-project D** — framework-version drift warning.

## See also

- `src/types.js` — JSDoc typedefs for every scene / factory contract. Reference via `/** @type {import('.../types.js').SceneModule} */`.
- `docs/architecture/` — per-layer one-pagers: `engine.md`, `rendering.md`, `animation.md`, `authoring.md`, `scenes.md`. Cover the *why* and the invariants behind each layer.
- `docs/markdown-authoring.md` — complete frontmatter + block-syntax reference for markdown-authored scenes.
- `docs/examples/minimal-markdown.md` and `docs/examples/minimal-three.js` — smallest functional scenes.
- `todo.md` — the gap list between the paradigm and the current implementation.
