# Rendering layer

**Path:** `src/rendering/`

## Purpose

Thin renderers that mount into the stage `<div>` and hand back a surface
(Three.js scene+camera, or an HTML container). Each renderer implements
`init(stage)` and `destroy()`. Scene factories wrap these.

## What's here

| File | Surface | Used by |
| --- | --- | --- |
| `three-scene.js` | `THREE.WebGLRenderer` + orthographic camera + on-demand render loop | `src/three-scenes/scene-factory.js` |
| `html-scene.js` | A positioned `<div>` you append to | `src/components/content-slide/`, `src/section-slides/` |

An SVG renderer is planned but not yet present; CLAUDE.md mentions it as the
third intended surface.

## Three renderer specifics

Returned by `init(stage)`:
- `scene`, `camera` (orthographic, frustum height 10, aspect from container)
- `renderer` (the raw `THREE.WebGLRenderer`)
- `container` (the `<div>` it created under the stage)

Also exposed on the handle: `getScene`, `getCamera`, `setCamera` (swap for a
perspective camera if needed), and `markDirty`.

## On-demand rendering

The Three renderer's internal RAF loop only calls `renderer.render()` when
`needsRender === true`. Anything that changes object transforms, materials,
or camera state must call `markDirty()` afterwards. The factory's
`playTimeline` apply callbacks should call `markDirty()` themselves;
when you directly mutate objects in `resolveStep` / `animateStep`, remember
to call the `markDirty` injected in the step context.

Resize handling is built in — the renderer listens for `window.resize` and
recomputes frustum + marks dirty.

## Invariants

- **One renderer per scene mount.** Factories create a renderer in `init`
  and destroy it in `destroy`. Never reuse.
- **No draw calls outside the loop.** Call `markDirty()` and let the loop
  render on the next frame. Direct `renderer.render()` calls bypass the
  needsRender flag.

## Common pitfalls

- **Forgetting `markDirty()` after a mutation.** The scene looks frozen
  because the loop has nothing to do. First place to check when a scene
  doesn't update.
- **Sizing before `init(stage)`.** The renderer reads container size at
  init; it is not valid before `init` returns.
