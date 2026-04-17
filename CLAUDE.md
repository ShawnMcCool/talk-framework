# beam-talk

Custom presentation engine for a 45-minute technical talk on BEAM/Elixir architecture. Three.js + vanilla JS + Vite.

## Development

All tooling runs inside Docker. Nothing installed on the host.

```bash
./dev    # Start containerized Vite dev server (http://localhost:3000)
./test   # Run tests inside container
```

Scripts are extensionless executables with shebangs. Never add `.sh` suffixes.

## Architecture

Four layers in `src/`:

| Layer | Path | Purpose |
|-------|------|---------|
| Engine | `src/engine/` | Deck navigation, position tracking, rapid-skip detection |
| Rendering | `src/rendering/` | Three.js, HTML, SVG renderers (common lifecycle) |
| Animation | `src/animation/` | Tween/timeline system for slide transitions |
| Commands | `src/commands/` | Fuzzy-search command palette (Escape key) |
| Authoring | `src/authoring/` | Markdown scene compiler, scene validation, editor middleware |
| Three-scenes | `src/three-scenes/` | `createThreeScene` factory — boilerplate for custom 3D scenes |
| Scenes | `src/scenes/` | Presentation content (one directory per scene) |

Shared utilities: `src/shared/colors.js` (palette constants + CSS vars).

## Scene Contract

Every scene module must export:

```javascript
export const myScene = {
  title: 'Scene Name',
  slides: [{ stepCount: N }, ...],
  init(stage) { /* setup renderer + objects, return context */ },
  destroy() { /* cleanup animations, renderer, DOM */ },
  resolveToSlide(ctx, slideIndex, stepIndex) { /* instant render */ },
  animateToSlide(ctx, slideIndex, stepIndex, done) { /* animated transition, call done() when complete */ },
}
```

**Determinism guarantee:** `resolveToSlide(n)` must produce identical visual state whether reached by animating through slides 0..n or jumping directly. Slide states are absolute, not deltas.

Register scenes in `src/main.js` `buildSceneDefs()`.

## Patterns

**Pure function separation:** Logic in `*.lib.js`, tests in `*.lib.test.js`, side effects in separate files. TDD red-green-refactor.

**On-demand rendering:** Three.js scenes use a `needsRender` flag. Always call `renderer.markDirty()` after changing object properties.

**Animation cancellation:** Store `currentAnimation = playTimeline(...)`. On interrupt: `currentAnimation.resolve()` snaps to end state, then call `done()`.

**Colors:** Import from `src/shared/colors.js`. Never hardcode hex values. Use `colors.bg`, `colors.accent`, etc.

## Scene Naming

Directories: `src/scenes/{nn}-{name}/` containing either `scene.md` (markdown-authored) or `scene.js` (custom code). Pick one, not both.

## Authoring Scenes

Most content is markdown. Use JS only when you need custom 3D or unusual behavior.

### Markdown scenes (`scene.md`)

```markdown
---
title: Why the BEAM?
type: content        # or "section"
accent: "#aaccff"    # optional, forwarded to factory
---

# Slide one heading

- first bullet
- second bullet

---

### The Philosophy

> Make it work, make it beautiful, make it fast.
> — Joe Armstrong
```

- `---` (on its own line) separates slides.
- Each top-level block = one reveal step (heading, bullet list, paragraph, quote, code fence).
- Supported block syntax: `#` / `##` / `###` headings, `-`/`*` bullets, `>` quotes (trailing `— attribution` line is captured), ```` ``` ```` fenced code, `:spacer:` or `:spacer lg:`, `!muted paragraph`.
- Raw HTML passes through. `{{tokenName}}` is replaced with `colors[tokenName]` at compile time — use `{{beam}}`, `{{accent}}`, etc.
- Register in `main.js` via `import mdSource from './scenes/.../scene.md?raw'` then `compileMarkdownScene(mdSource)`.

### Three.js scenes (`scene.js` + `createThreeScene`)

For custom 3D, use the factory to absorb renderer/lifecycle/cancellation boilerplate:

```javascript
import { createThreeScene } from '../../three-scenes/scene-factory.js';

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

The factory handles renderer creation/destruction, scene background, animation cancellation, and the tick loop. See `src/scenes/07-beam-vm/scene.js` for a reference implementation.

### Authoring aids (dev mode)

- Press `Escape` for the command palette: `Jump to Slide...` accepts `scene.slide.step` (e.g. `9.2`).
- Press `o` to open the current scene's source file in `$EDITOR`. Falls back to copying the path to the clipboard.
- `Toggle Debug Overlay` shows scene / slide / step counters and the current source path.

## Planned Scenes

1. Title (HTML) | 2. Introduction | 3. Mission | 4. Desired Properties | 5. Excluded Concerns | 6. Erlang and Elixir | 7. The BEAM VM (Three.js) | 8. Process Messaging (Three.js) | 9. Mailbox & Execution (Three.js) | 10. Execution Model (Three.js) | 11. Links (Three.js) | 12. Monitors (Three.js) | 13. Supervisors (Three.js)

## See also

- `src/types.js` — JSDoc typedefs for every scene / factory contract. Reference them via `/** @type {import('.../types.js').SceneModule} */`.
- `docs/architecture/` — per-layer one-pagers: `engine.md`, `rendering.md`, `animation.md`, `authoring.md`, `scenes.md`. Cover the *why* and the invariants behind each layer.
- `docs/markdown-authoring.md` — complete frontmatter + block-syntax reference for markdown-authored scenes.
- `docs/examples/minimal-markdown.md` and `docs/examples/minimal-three.js` — smallest functional scenes you can clone into `src/scenes/`.
