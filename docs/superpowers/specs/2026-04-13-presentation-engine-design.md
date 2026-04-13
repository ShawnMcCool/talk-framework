# Presentation Engine Design

## Overview

A custom HTML/JavaScript presentation engine for a 45-minute talk on choosing technology based on architecture (BEAM/Elixir focus). Built as a proper application with 3D-first visuals (Three.js), a command palette, containerized development, and TDD throughout. Audience: programmer students. Presented from speaker's own laptop at 1080p, scaling to 16:9 or 16:10.

The engine is clean-room built, adopting proven patterns from the `~/src/visualizer` project without forking it.

## Architecture

### Scene/Slide Model

**Scenes** are the primary isolation boundary. Each scene:

- Owns its rendering context (Three.js scene, SVG canvas, or HTML container)
- Initializes its own state from scratch with no dependency on prior scenes
- Contains an ordered sequence of slides that share the scene's context
- Can be jumped to directly via the command palette

**Slides** are states within a scene. Each slide:

- Declares a **target state**: the deterministic end-state of what the scene looks like at this slide
- Declares an **animation**: how to transition from the previous slide's state to this one
- Supports two modes:
  - **Animate**: play the transition at normal pace (what the audience sees)
  - **Resolve**: snap instantly to the target state (for rapid skipping or scene jumps)

**Determinism contract**: `scene.resolveToSlide(n)` produces identical visual state whether reached by animating through slides 0..n or jumping directly. Each slide's target state is absolute, not a delta. The animation is just the journey to that state.

### Navigation

- **Arrow keys / clicker**: advance one slide, animations play
- **Rapid skip** (held key or fast repeated presses): animations resolve instantly, state remains correct
- **Command palette jump**: jumps to a scene, resolves to its first slide (or a specific slide within it)
- **No cross-scene state leakage**: entering a scene always initializes fresh

### Four Layers

1. **Engine** (`src/engine/`): Manages the deck as an ordered sequence of scenes, each containing slides, each containing steps. Tracks position as `{sceneIndex, slideIndex, stepIndex}`. Exposes `next()`, `prev()`, `goToScene(n)`, `reset()`. Handles rapid-skip detection and input debouncing. `next()` advances to the next step; when steps are exhausted, advances to the next slide; when slides are exhausted, advances to the next scene. `prev()` reverses: if at step 0 of slide 0 of a scene, it transitions to the previous scene, initializes it, and resolves to its final slide and final step.

2. **Rendering** (`src/rendering/`): Three renderer types share a common lifecycle.
   - **Three.js scenes** (primary): WebGL renderer, orthographic camera, ambient + directional lighting. On-demand rendering (only when `needsRender` is flagged). Per-scene camera and object setup.
   - **SVG scenes**: Dynamic SVG with the same animate/resolve contract. For flat diagrams where 3D adds no value.
   - **HTML scenes**: Pure text slides with CSS transitions for animation. Simplest renderer.

3. **Command Palette** (`src/commands/`): Fuzzy-searchable overlay activated by keyboard shortcut. Modules register commands via `CommandPalette.register({id, title, match, action})`. The palette knows nothing about scenes or rendering — it's a decoupled registry. Supports a `dev: true` flag for development-only commands.

4. **Scenes** (`src/scenes/`): Presentation content. One directory per scene. Each scene module exports `{init, destroy, resolveToSlide, animateToSlide, slides, title}`. Each slide in `slides` declares its steps (an array of step definitions, each being click-driven or auto-play) and its target state.

### Animation System

A lightweight tween/timeline system for choreographing movements within slides. Each slide's animation is a sequence of tweens on scene objects. Resolve mode skips all tweens to their end values instantly.

Key rules:
- Animations never block controls (visualizer ADR 0037). If the user presses next during an animation, it resolves immediately and advances.
- rAF-debounced updates (visualizer ADR 0035). Rapid input coalesces into one update per frame.
- On-demand rendering (visualizer ADR 0033). The animation loop only calls `renderer.render()` when something changed.

### Slide Step Model

Steps within a slide handle the hybrid animation approach:
- **Click-driven steps**: text reveals, element appearances. Advance on user input.
- **Auto-play steps**: choreographed diagram animations that play out once triggered by a click-driven step.

The step sequence for a slide might be: [click: show title] -> [click: trigger process animation -> auto: messages fly -> auto: mailbox fills -> auto: settle].

## Command Palette

### Activation

Default shortcut: `Escape` key (clickers don't send Escape, and it's a natural "open/close overlay" convention). Overlay appears centered, dims the presentation behind it. Pressing Escape again closes it.

### Built-in Commands

- Go to scene (by number or fuzzy title match)
- Reset current scene
- Toggle debug overlay (scene/slide index, animation state, FPS)
- Toggle presenter grid (thumbnail overview of all scenes, development aid)

### Extensibility

Any module registers commands. New tools (timer, animation speed, future PDF export) register more commands. Development-only commands use `dev: true` flag.

## Display & Scaling

- Canvas sizes to viewport, maintains aspect ratio with letterboxing
- Targets 1080p baseline, scales to 16:9 and 16:10
- CSS custom property `--ui-scale` (visualizer ADR 0038) handles proportional sizing of HTML overlays on top of the canvas
- Three.js renderer uses antialiasing

## Color Palette

A unified palette drawing from both:
- The presentation's dark slate-blue background tones
- The visualizer city view's accent colors (teal, orange, warm yellow)
- Process/failure colors from the original talk (orange for healthy, pink/red for failed, blue for BEAM)

Defined as CSS custom properties and JS constants that all scenes reference. Exact palette to be refined during implementation with visual iteration.

## Patterns Adopted from Visualizer

| Visualizer ADR | Adaptation |
|---|---|
| 0026 — Pure function separation | `*.lib.js` for logic, `*.lib.test.js` for tests, side effects in separate files |
| 0029 — Lifecycle contract | Scenes implement `{init, destroy, resolveToSlide, animateToSlide}` |
| 0030 — Declarative controls | Command palette uses declarative registration, decoupled from consumers |
| 0033 — On-demand rendering | Animation loop only renders when `needsRender` is flagged |
| 0035 — rAF-debounced updates | Rapid input coalesces into one update per frame |
| 0037 — Animations never block controls | User input always responsive, animations resolve immediately on advance |
| 0038 — Relative font sizing | UI scales via `--ui-scale` CSS custom property |

Additional patterns (not from specific ADRs):
- Three.js scene setup from city view (orthographic camera, ambient + directional lighting)
- Dual module system for Node.js test compatibility
- Canvas texture approach for in-scene text labels

Not adopted:
- Shell tab system (replaced by scene sequencing)
- `window.__DATA__` injection (scenes define own content)
- Browser history/pushState (command palette handles navigation)
- Self-contained single HTML output (proper dev server instead)

## Development Environment

### Containerized

All JS tooling runs inside Docker. Nothing installed on the host.

- `Dockerfile` + `docker-compose.yml` at project root
- Container runs Node LTS with project dependencies
- Source files bind-mounted from host; `node_modules` lives inside container volume
- Vite dev server configured with `host: '0.0.0.0'` for container accessibility
- HMR websocket configured for correct client-side host

### Convenience Scripts

Extensionless executables at project root:
- `./dev` — starts the containerized dev server
- `./test` — runs tests inside the container

### Dev Server

Vite with ES modules. HMR hooks into scene module replacement: on file change, the dev harness destroys the current scene and re-initializes it at the same slide position using `resolveToSlide(n)`. Determinism makes this work.

### Testing

Node.js built-in test runner. Pure functions in `*.lib.js` tested in `*.lib.test.js`. TDD red-green-refactor throughout. `./test` runs everything.

### Project Structure

```
beam-talk/
  src/
    engine/
      engine.js           — slide engine, navigation, input handling
      engine.lib.js        — pure engine logic (position tracking, rapid-skip detection)
      engine.lib.test.js
    commands/
      palette.js           — command palette DOM, overlay, input handling
      palette.lib.js       — fuzzy matching, command registry, filtering
      palette.lib.test.js
    rendering/
      three-scene.js       — Three.js base renderer (scene, camera, lighting, render loop)
      svg-scene.js         — SVG base renderer
      html-scene.js        — HTML/CSS base renderer
    animation/
      timeline.js          — tween/timeline system, side effects
      timeline.lib.js      — pure timeline computation, resolve logic
      timeline.lib.test.js
    scenes/
      01-title/
        scene.js
      02-mission/
        scene.js
      03-desired-properties/
        scene.js
      ...
    shared/
      colors.js            — palette constants (CSS custom properties + JS)
      typography.js         — font setup, text rendering helpers
  index.html
  Dockerfile
  docker-compose.yml
  package.json
  dev                       — convenience script: starts containerized dev server
  test                      — convenience script: runs containerized tests
  .gitignore
  docs/
    superpowers/specs/      — this file and future specs
  decisions/                — ADRs for this project
```

## Talk Content Structure

Based on the original presentation, the scenes map roughly to:

1. **Title** (HTML) — talk title, speaker name, event name. Configurable.
2. **Introduction** (HTML/Three.js) — "Hi, I'm Shawn"
3. **Mission** (HTML) — section header + content
4. **Desired Properties** (HTML) — bullet reveal: fast reaction times, failure isolation, reduce infra complexity, effective scaling
5. **Excluded Concerns** (HTML) — two-column reveal of excluded factors
6. **Erlang and Elixir** (Three.js/HTML) — building up the language/VM stack diagram
7. **The BEAM VM** (Three.js) — processes floating in 3D space, schedulers, OS threads, CPU cores
8. **Process Messaging** (Three.js) — two processes, PIDs, message passing animation, mailbox concept
9. **Mailbox & Execution** (Three.js) — mailbox queue filling, dequeue to execution, processing animation, sleep state
10. **Execution Model** (Three.js) — process trees, state management, GenServer concept with gears
11. **Managing Failure — Links** (Three.js) — bidirectional failure propagation
12. **Managing Failure — Monitors** (Three.js) — one-way observation, restart
13. **Managing Failure — Supervisors** (Three.js) — supervisor trees, restart strategies

Scene content and exact slide breakdowns will be developed iteratively. This list is a starting point, not a constraint.

## What This Spec Does Not Cover

- Exact visual design for individual scenes (developed iteratively during implementation)
- Specific color palette values (refined visually during implementation)
- Talk title and event name (not yet known, made configurable)
- PDF export (deferred, may be added later via command palette command)
