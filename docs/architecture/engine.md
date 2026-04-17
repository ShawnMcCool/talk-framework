# Engine layer

**Path:** `src/engine/`

## Purpose

Drive the deck. The engine owns the navigation cursor (scene / slide / step),
translates keyboard input into position changes, and calls the current
scene's contract methods at the right moments. It knows nothing about
rendering.

## Public API

`createEngine({ stage, sceneDefs })` returns:

- `start()` / `stop()` — attach or detach keyboard listener, mount/unmount
  the active scene.
- `goToScene(index)` / `goToSlide(slideIndex, stepIndex)` — jump.
- `getPosition()` → `{ sceneIndex, slideIndex, stepIndex }`.
- `getDeck()` — normalized deck shape used by the debug overlay.
- `getSceneDefs()` — the scene modules the engine was built with.

The scene contract it invokes is `SceneModule` in `src/types.js`:
`init`, `destroy`, `resolveToSlide`, `animateToSlide`.

## Invariants

- **Determinism.** `resolveToSlide(n)` must produce the same visible state
  regardless of how you got there. The engine calls it after scene changes
  and during rapid navigation.
- **Exactly one `done()` per animate.** The engine sets `animating = true`
  before calling `animateToSlide`; the done callback flips it back. If a
  scene never calls `done()`, further navigation silently falls back to
  instant `resolveToSlide`.
- **Scene change = full teardown.** Moving between scenes always calls the
  old scene's `destroy()` then the new scene's `init()`. No cross-scene
  object reuse.

## Rapid-skip behavior

`isRapidInput(timestamps)` returns true when the last three keystrokes were
each ≤200 ms apart. When true, or when `animating` is already true, the
engine uses `resolveToSlide` (instant) instead of `animateToSlide`. This is
why your scenes' `resolveStep` paths must be correct — they're not just for
initial mount; they handle press-and-hold arrow key situations too.

## Common pitfalls

- **Forgetting `done()` in `animateToSlide`.** After the first missed done,
  the next navigation will animate (because `animating` is already set
  false by being never set true after the cancellation path). But if
  `animating` is stuck true from a prior scene, inputs quietly switch to
  instant mode.
- **Doing work in `init` that depends on slide index.** `init` runs once per
  scene entry; the engine then calls `resolveToSlide(0, 0)` immediately.
  Put position-dependent state in `resolveStep`, not `setup`.
