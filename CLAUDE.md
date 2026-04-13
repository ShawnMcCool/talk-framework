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

Directories: `src/scenes/{nn}-{name}/scene.js` (e.g., `01-title`, `07-beam-vm`).

## Planned Scenes

1. Title (HTML) | 2. Introduction | 3. Mission | 4. Desired Properties | 5. Excluded Concerns | 6. Erlang and Elixir | 7. The BEAM VM (Three.js) | 8. Process Messaging (Three.js) | 9. Mailbox & Execution (Three.js) | 10. Execution Model (Three.js) | 11. Links (Three.js) | 12. Monitors (Three.js) | 13. Supervisors (Three.js)
