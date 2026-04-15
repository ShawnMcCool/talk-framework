# Beam-Talk Project Overview

## Purpose
Custom presentation engine for a 45-minute technical talk on BEAM/Elixir architecture. Built with Three.js + vanilla JS + Vite.

## Tech Stack
- **Runtime**: Node.js (containerized with Docker)
- **Framework**: Vite 6.0.0
- **3D Graphics**: Three.js 0.170.0
- **Testing**: Node test runner (built-in)
- **Containerization**: Docker (all tooling runs inside Docker)

## Project Structure (Four-Layer Architecture)

```
src/
├── engine/          # Deck navigation, position tracking, rapid-skip detection
├── rendering/       # Three.js, HTML, SVG renderers (common lifecycle)
├── animation/       # Tween/timeline system for slide transitions
├── commands/        # Fuzzy-search command palette (Escape key)
├── scenes/          # Presentation content (one directory per scene)
├── shared/          # Shared utilities (colors.js)
├── debug/           # Debug overlay
└── main.js          # App entry point
```

## Key Files
- **src/main.js**: Entry point, registers all scenes
- **src/rendering/three-scene.js**: Three.js renderer lifecycle management
- **src/rendering/html-scene.js**: HTML renderer for simple content
- **src/animation/timeline.js**: Animation playback engine
- **src/animation/timeline.lib.js**: Pure tween interpolation logic
- **src/scenes/scene-helpers.js**: Reusable 3D utilities (text sprites, materials, easing)
- **src/shared/colors.js**: Global color palette
- **src/engine/engine.js**: Deck navigation and scene lifecycle

## Scene Contract
Every scene must export an object with:
```javascript
export const myScene = {
  title: 'Scene Name',
  slides: [{ stepCount: N }, ...],
  init(stage) { /* setup renderer + objects, return context */ },
  destroy() { /* cleanup animations, renderer, DOM */ },
  resolveToSlide(ctx, slideIndex, stepIndex) { /* instant render */ },
  animateToSlide(ctx, slideIndex, stepIndex, done) { /* animated transition */ },
}
```

## Key Design Principles
1. **Determinism**: `resolveToSlide(n)` must produce identical visual state whether reached by animating or jumping directly
2. **On-demand rendering**: Use `renderer.markDirty()` flag to mark scenes needing re-render
3. **Animation cancellation**: Store `currentAnimation` and call `.resolve()` to snap to end state
4. **Color constants**: Always import from `src/shared/colors.js`, never hardcode hex
5. **Pure functions**: Logic in `*.lib.js`, tests in `*.lib.test.js`, side effects separate (TDD)
