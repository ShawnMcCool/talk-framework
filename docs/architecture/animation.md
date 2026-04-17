# Animation layer

**Path:** `src/animation/`

## Purpose

A minimal, pure tween/timeline primitive and a runner that drives it with
`requestAnimationFrame`. Linear interpolation only — easing, if wanted, is
done by composing multiple tween segments.

## Shapes

```js
// Tween: a single property animation with an absolute delay.
{ property: 'x', from: 0, to: 10, delay: 0, duration: 300 }

// Timeline: an array of tweens, run in parallel; duration is the max end.
createTimeline([tween1, tween2, ...])
```

See `TweenDef` and `TimelineHandle` in `src/types.js`.

## `playTimeline(tweens, apply, done)`

Starts a RAF loop. On each frame it computes every property's current value
(per tween delay + duration) and hands the resulting `{ property: value }`
object to your `apply` callback. When elapsed exceeds the timeline's
duration, calls `done` exactly once.

Returns `{ resolve() }`. Calling `resolve()`:

1. Cancels the RAF.
2. Snaps values to `duration` (the exact end state — this is what
   "end state" means when CLAUDE.md says cancellation snaps to end state).
3. Calls `done()`.

That's the cancellation contract. If the user mashes ArrowRight during an
animation, the engine calls `resolve()` on the current timeline, which
immediately applies the final values and fires `done`, freeing the engine
to start the next step.

## The `createThreeScene` wrapper

`playTimeline` alone has no tracking. The Three scene factory wraps it
(`trackedPlayTimeline`) so that each new `animateStep` cancels the previous
one automatically. The factory also wraps `setTimeout` the same way. Inside
`animateStep` you should always use the injected `playTimeline` and
`setTimeout`, never the globals — otherwise cancellation leaks and you'll
see stale animations on top of new ones.

## Invariants

- **`done` is called exactly once per animation.** Either naturally on
  completion, or via `resolve()`. Never both.
- **Linear tweens.** If you need easing, compose: `from → mid → to` with a
  delay on the second tween.
- **No implicit side effects.** The library never touches the DOM; it only
  produces values. Your `apply` callback writes them.

## Common pitfalls

- **Calling the global `setTimeout` from `animateStep`.** It won't be
  cancelled when navigation moves on. Use `ctx.setTimeout` instead.
- **Forgetting `markDirty()` inside `apply`.** Three.js won't re-render.
- **Long-running `onTick` work.** The tick loop runs every frame; heavy
  computation there will hitch the whole page.
