# BEAM 3D Scenes — Design Spec

Seven Three.js scenes reinterpreting the PDF presentation's animated sequences. Each scene is a creative 3D visualization of a BEAM/Erlang concept, not a reproduction of the original flat diagrams.

## Context

The beam-talk project is a custom presentation engine (Three.js + Vite) for a 45-minute talk on BEAM architecture. The existing codebase has two demo scenes. This work replaces them with 7 production scenes that visually explain BEAM concepts through smooth, illustrative 3D animations. This is also a proof of concept for the engine's ability to express technical ideas through 3D animation.

## Scene Contract

Each scene exports an object with:
- `title` — display name
- `slides` — array of `{ stepCount }` 
- `init(stage)` — creates renderer + objects, returns context
- `destroy()` — cancels animations, disposes renderer + objects
- `resolveToSlide(ctx, slideIndex, stepIndex)` — instant jump to state
- `animateToSlide(ctx, slideIndex, stepIndex, done)` — animated transition, call `done()` when complete

**Determinism:** `resolveToSlide(n)` must produce identical output whether reached by animating or jumping directly.

## Infrastructure

### Files to modify
- `src/main.js` — replace demo scene imports with 7 new scene imports
- `src/shared/colors.js` — add any new palette colors needed (e.g. `green`, `purple`)

### Files to create
- `src/scenes/07-beam-vm/scene.js`
- `src/scenes/08-process-messaging/scene.js`
- `src/scenes/09-mailbox-execution/scene.js`
- `src/scenes/10-execution-model/scene.js`
- `src/scenes/11-links/scene.js`
- `src/scenes/12-monitors/scene.js`
- `src/scenes/13-supervisors/scene.js`

### Existing infrastructure to reuse
- `createThreeRenderer()` from `src/rendering/three-scene.js` — provides scene, camera, renderer, `markDirty()`
- `playTimeline()` from `src/animation/timeline.js` — tween-based animation with `resolve()` cancellation
- `colors` from `src/shared/colors.js` — palette constants

### Continuous animation pattern

For scenes with ongoing motion (particles drifting, gears rotating), use a scene-level animation loop:

```js
let loopId = null;
function startLoop() {
  function tick() {
    // update positions, rotations
    renderer.markDirty();
    loopId = requestAnimationFrame(tick);
  }
  loopId = requestAnimationFrame(tick);
}
function stopLoop() {
  if (loopId) cancelAnimationFrame(loopId);
  loopId = null;
}
```

Start in `init()`, stop in `destroy()`. This works alongside the renderer's own rAF loop — the scene updates objects and marks dirty, the renderer draws when dirty.

### Camera

The existing orthographic camera has frustum height 10 (y: -5 to 5). X range depends on aspect ratio (~8.9 at 16:9). All object positions should stay within roughly ±4 on both axes. For scenes needing perspective depth (particles, 3D rotation), consider switching to a perspective camera within the scene.

## Scene Designs

### Scene 07: The BEAM VM

**Concept:** A transparent containment box filled with drifting luminous process spheres, with layered infrastructure shelves below.

**Slides:** 1 slide, 4 steps

| Step | State |
|------|-------|
| 0 | Empty translucent box (wireframe or glass material) fades in center |
| 1 | ~12 small glowing spheres spawn inside, drifting with gentle Brownian motion |
| 2 | Three horizontal translucent shelves materialize below: Scheduler (warm), Thread (beam), Core (accent) — with text labels |
| 3 | Faint vertical light columns connect groups of spheres through the shelf layers |

**Objects:**
- Box: `THREE.BoxGeometry` wireframe or `MeshPhysicalMaterial` with transparency
- Spheres: `THREE.SphereGeometry(0.15)` with `MeshPhongMaterial` emissive glow, `colors.accentWarm`
- Shelves: `THREE.PlaneGeometry` with transparent materials, colored per layer
- Light columns: `THREE.CylinderGeometry` very thin, low opacity

**Animation:** Continuous drift loop moves spheres with noise-based offsets (wrap at box boundaries). Slide transitions use `playTimeline()` for fade-in opacity tweens.

---

### Scene 08: Process Messaging

**Concept:** Two glowing process cubes with PID labels. Particles arc from sender to receiver's translucent mailbox cylinder.

**Slides:** 1 slide, 4 steps

| Step | State |
|------|-------|
| 0 | Two cubes appear at (-2, 0) and (2, 0) with floating PID text labels ("0.12", "0.57") |
| 1 | A glowing sphere launches from left cube, arcs upward along a bezier curve, arrives at right cube |
| 2 | Translucent cylinder (mailbox) materializes attached to right cube, message ring stacks inside |
| 3 | Two more particles arc over in sequence, stacking as rings in the cylinder |

**Objects:**
- Process cubes: `THREE.BoxGeometry(0.6)` with `MeshPhongMaterial`, colors: `beam` and `accentWarm`
- PID labels: HTML overlay div or `THREE.Sprite` with canvas texture
- Message particles: small `THREE.SphereGeometry(0.12)` with emissive material
- Mailbox: `THREE.CylinderGeometry` with transparent material
- Message rings: `THREE.TorusGeometry(0.25, 0.06)` stacked vertically inside cylinder

**Animation:** Particle arc uses `playTimeline()` with parametric bezier path (animate t from 0 to 1, compute x/y from cubic bezier). Ring stacking uses y-position tweens.

---

### Scene 09: Mailbox & Execution Loop

**Concept:** Two transparent columns side by side. Messages float from mailbox to execution chamber, descend through processing, dissolve.

**Slides:** 1 slide, 8 steps (the receive loop cycles through 3 messages)

| Step | State |
|------|-------|
| 0 | Two columns appear with labels "Mailbox" and "Execution". 3 message cubes stacked in mailbox |
| 1 | Top message lifts out of mailbox, arcs to execution column |
| 2 | Message descends through execution column, shrinks and fades at bottom (processed) |
| 3 | Next message lifts out and arcs over |
| 4 | Descends and dissolves |
| 5 | Last message lifts out and arcs over |
| 6 | Descends and dissolves |
| 7 | Both columns empty — execution column dims, gentle pulsing glow ("sleeping") |

**Objects:**
- Columns: `THREE.BoxGeometry` wireframe or transparent panels forming open-front containers
- Messages: `THREE.BoxGeometry(0.8, 0.25, 0.3)` with `accentWarm` material
- Labels: HTML overlay or sprite text

**Animation:** Each dequeue-process cycle is a `playTimeline()` sequence: lift (y tween up), arc (x+y bezier tween), descend (y tween down + scale/opacity tween). Sleep state uses continuous subtle opacity oscillation.

---

### Scene 10: Execution Model

**Concept:** Rotating gear assembly + orbiting state cube get encased in a process shell. On crash, gears redden and shell fractures.

**Slides:** 1 slide, 4 steps

| Step | State |
|------|-------|
| 0 | Two interlocking torus rings rotating smoothly (behavior/code metaphor) |
| 1 | A glowing cube appears, orbiting the gears (state) |
| 2 | A transparent shell (sphere or rounded box) closes around both. "State" label appears on top |
| 3 | Gears shudder (rapid small oscillations), turn red (`colors.failure`), shell cracks (dark lines appear on surface) |

**Objects:**
- Gears: 2-3 `THREE.TorusGeometry` with different radii, interlocked at angles, rotating on continuous loop
- State cube: `THREE.BoxGeometry(0.4)` with `accent` emissive material
- Shell: `THREE.SphereGeometry` or `THREE.IcosahedronGeometry` with `MeshPhysicalMaterial` transparency
- Crack lines: thin `THREE.LineSegments` geometry added to shell surface on crash
- Label: sprite or HTML overlay

**Animation:** Continuous rotation loop for gears and orbit. Shell formation uses scale tween (0 → 1). Crash uses color tween (white → red) plus rapid position jitter.

---

### Scene 11: Links

**Concept:** Two spheres connected by an energy tether. One fails, shockwave propagates along tether, both die.

**Slides:** 1 slide, 4 steps

| Step | State |
|------|-------|
| 0 | Two glowing spheres at (-2, 0) and (2, 0) |
| 1 | Energy tether connects them — a line with small particles flowing bidirectionally along it |
| 2 | Left sphere pulses red, then shatters (scale down + spawn outward-flying fragments) |
| 3 | Red pulse travels along tether to right sphere, which also shatters. Both become dim wireframe husks |

**Objects:**
- Process spheres: `THREE.SphereGeometry(0.4)` with `accentWarm` emissive material
- Tether: `THREE.Line` or `THREE.TubeGeometry` with emissive material
- Tether particles: small spheres animated along the line path
- Fragments: small `THREE.BoxGeometry` pieces with outward velocity
- Husks: same sphere geometry but wireframe material with `failure` color, low opacity

**Animation:** Continuous particle flow along tether. Shatter uses `playTimeline()` to animate fragment positions outward. Shockwave is a sphere geometry that scales/translates from left to right along the tether path.

---

### Scene 12: Monitors

**Concept:** Observer sphere above workers, connected by sensor beams. Worker fails, notification rises to observer. Observer survives.

**Slides:** 1 slide, 4 steps

| Step | State |
|------|-------|
| 0 | Observer sphere (pink/`failure` color) elevated at (0, 2). Three worker spheres at (-2, -1), (0, -1), (2, -1) in `accentWarm` |
| 1 | Thin semi-transparent cone beams connect observer down to each worker (monitoring) |
| 2 | Left worker dims, shrinks, turns wireframe (dies). Its beam flashes red |
| 3 | A glowing ring rises along the beam from dead worker up to observer. Observer flashes to acknowledge. Observer stays healthy |

**Objects:**
- Observer: `THREE.SphereGeometry(0.35)` with pinkish material (lighter than `failure` — use `#ff7799` or similar to distinguish from dead workers)
- Workers: `THREE.SphereGeometry(0.3)` with `accentWarm` material
- Sensor beams: `THREE.ConeGeometry` thin, pointing downward from observer, transparent
- Notification ring: `THREE.TorusGeometry(0.2, 0.04)` that travels up the beam path
- Dead worker: same geometry, wireframe material

**Animation:** Beam connection uses scale tweens. Worker death uses scale + opacity tween. Ring ascent uses y-position tween. Observer flash uses emissive intensity pulse via `playTimeline()`.

---

### Scene 13: Supervisors

**Concept:** Supervisor shield above workers. One crashes, all dissolve (one_for_all), then particles coalesce back into healthy workers.

**Slides:** 1 slide, 5 steps

| Step | State |
|------|-------|
| 0 | Supervisor (hexagonal plate, `failure` color) at (0, 2.5). Three workers below with support beams |
| 1 | Middle worker cracks — turns red, fragments fly outward |
| 2 | Supervisor shield flashes. All remaining workers dissolve into scattered particles |
| 3 | Particles begin coalescing — moving inward toward worker positions, reassembling |
| 4 | Three fresh healthy workers fully formed. Support beams reconnect. System restored |

**Objects:**
- Supervisor: `THREE.CylinderGeometry(0.6, 0.6, 0.1, 6)` (hexagonal) with `failure` material
- Workers: `THREE.SphereGeometry(0.3)` with `accentWarm`
- Support beams: `THREE.CylinderGeometry(0.02)` connecting supervisor to workers
- Fragments/particles: small spheres with random velocities, used for both shatter and coalesce

**Animation:** Shatter is fragments flying outward. Dissolve is existing workers breaking into particles. Coalesce reverses: particles start scattered, tween inward to target positions, then snap to solid sphere. `playTimeline()` for the position tweens, continuous loop for particle motion during transition.

---

## Colors Addition

Add to `src/shared/colors.js`:
```js
green: '#44dd88',
purple: '#aa77ff',
```

These extend the palette for potential future scene use (monitors, execution model) without breaking existing references.

## Registration

In `src/main.js`, replace:
```js
import { demoHtmlScene } from './scenes/demo-html/scene.js';
import { demoThreeScene } from './scenes/demo-three/scene.js';
```
with imports for all 7 scenes, and update `buildSceneDefs()` to return them in order.

## Verification

1. Run `./dev` to start the container dev server
2. Open http://localhost:3000
3. Navigate through all scenes with arrow keys
4. For each scene, verify:
   - All steps animate smoothly forward
   - Rapid-clicking skips to final state (resolveToSlide works)
   - Jumping directly to any step (via command palette) produces correct state
   - Scene transitions (entering/leaving) don't leak objects or animations
5. Check browser console for Three.js warnings or errors
6. Test `./test` to ensure existing tests pass (engine, timeline tests)
