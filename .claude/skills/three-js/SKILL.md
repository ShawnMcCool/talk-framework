---
name: three-js
description: Use when working with Three.js code in beam-talk — creating 3D objects, materials, lighting, camera, animations, or debugging rendering issues. Triggers on Three.js, 3D, mesh, geometry, material, camera, lighting, tween, or renderer work in src/rendering/ or src/scenes/.
---

# Three.js in beam-talk

Reference for Three.js patterns specific to this project. All 3D scenes use a shared renderer setup with project-specific conventions.

## Renderer

`createThreeRenderer()` from `src/rendering/three-scene.js` provides:

- **WebGL renderer** with antialiasing, device pixel ratio
- **Orthographic camera** at z=10, 10-unit frustum height, aspect-scaled width
- **3-light rig**: ambient (0.6) + directional (0.8 at 5,10,7) + fill (0.3 at -3,5,-5)
- **On-demand rendering** via `needsRender` flag

```javascript
import { createThreeRenderer } from '../../rendering/three-scene.js';

const renderer = createThreeRenderer();
const threeCtx = renderer.init(stage);
// threeCtx = { scene, camera, renderer, container }
```

## Coordinate System

Orthographic projection. Units are abstract, not pixels.

- Visible height: ~10 units (frustum height)
- Visible width: varies with viewport aspect ratio (~17.8 units at 16:9)
- Origin (0,0) is center of screen
- x: left (-) to right (+)
- y: down (-) to up (+)
- z: into screen (-) to toward camera (+), camera at z=10

## On-Demand Rendering

The render loop runs every frame but only renders when `needsRender` is true.

**Rule: Always call `renderer.markDirty()` after changing any object property.**

```javascript
box.position.x = 2;
box.visible = true;
renderer.markDirty();  // Without this, changes won't appear
```

## Creating Objects

Use `MeshPhongMaterial` for lighting-responsive objects:

```javascript
import * as THREE from 'three';
import { colors } from '../../shared/colors.js';

const geo = new THREE.BoxGeometry(1, 1, 1);
const mat = new THREE.MeshPhongMaterial({ color: colors.accent });
const mesh = new THREE.Mesh(geo, mat);
threeCtx.scene.add(mesh);
```

For transparent materials:
```javascript
const mat = new THREE.MeshPhongMaterial({
  color: colors.beam,
  transparent: true,
  opacity: 0.5,
});
```

## Background

```javascript
threeCtx.scene.background = new THREE.Color(colors.bg);
```

Always use `colors.bg` from shared palette, not hardcoded values.

## Animation

Timeline tweens for choreographed movement:

```javascript
import { playTimeline } from '../../animation/timeline.js';

const animation = playTimeline(
  [
    { property: 'x', from: -2, to: 2, delay: 0, duration: 600 },
    { property: 'y', from: 0, to: 3, delay: 200, duration: 400 },
  ],
  (vals) => {
    mesh.position.x = vals.x;
    mesh.position.y = vals.y;
    renderer.markDirty();
  },
  () => { /* done callback */ },
);

// Cancel mid-flight (snaps to end state):
animation.resolve();
```

**Tween definition:**

| Field | Type | Description |
|-------|------|-------------|
| `property` | string | Key name in the values object passed to apply function |
| `from` | number | Start value |
| `to` | number | End value |
| `delay` | number | ms before tween starts |
| `duration` | number | ms for the tween |

Tweens are linear interpolation. No easing functions yet.

## Cleanup

Scenes must clean up in `destroy()`:

```javascript
destroy() {
  if (currentAnimation) {
    currentAnimation.resolve();  // Snap to end, call done
    currentAnimation = null;
  }
  if (renderer) renderer.destroy();  // Removes canvas, cancels rAF
  renderer = null;
  threeCtx = null;
}
```

For complex scenes, also dispose geometries and materials:
```javascript
geometry.dispose();
material.dispose();
```

## Common Patterns

**Visibility toggling** (for step reveals):
```javascript
mesh.visible = stepIndex >= 1;
renderer.markDirty();
```

**Color changes:**
```javascript
mesh.material.color.set(colors.failure);
renderer.markDirty();
```

**Groups** (for moving multiple objects together):
```javascript
const group = new THREE.Group();
group.add(mesh1);
group.add(mesh2);
threeCtx.scene.add(group);
group.position.x = 3;  // Moves both meshes
```

## Text in 3D Scenes

Not yet implemented. When needed, use canvas textures:

```javascript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.font = '48px sans-serif';
ctx.fillStyle = colors.text;
ctx.fillText('Hello', 0, 48);

const texture = new THREE.CanvasTexture(canvas);
const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
const plane = new THREE.PlaneGeometry(4, 1);
const label = new THREE.Mesh(plane, mat);
threeCtx.scene.add(label);
```

Note: `MeshBasicMaterial` for text planes (not affected by lighting).
