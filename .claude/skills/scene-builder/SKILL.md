---
name: scene-builder
description: Use when creating, adding, or scaffolding a new presentation scene — triggers on "new scene", "add scene", "create scene", "build slide", or working in src/scenes/
---

# Scene Builder

Rigid skill for creating presentation scenes in beam-talk. Follow this checklist exactly.

## 1. Decide Renderer Type

| Type | When | Import |
|------|------|--------|
| **Three.js** | 3D visuals, animated diagrams, process simulations | `createThreeRenderer` from `../../rendering/three-scene.js` |
| **HTML** | Text-heavy slides, bullet reveals, section headers | `createHtmlRenderer` from `../../rendering/html-scene.js` |
| **SVG** | Flat diagrams where 3D adds no value | (not yet implemented) |

## 2. Create Scene File

Path: `src/scenes/{nn}-{name}/scene.js`

- `{nn}` = two-digit scene number matching planned order
- `{name}` = kebab-case descriptive name
- Example: `src/scenes/07-beam-vm/scene.js`

## 3. Implement the Scene Contract

Every scene MUST export this shape:

```javascript
import { colors } from '../../shared/colors.js';

// For Three.js scenes:
import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';

// For HTML scenes:
// import { createHtmlRenderer } from '../../rendering/html-scene.js';

let renderer = null;
let threeCtx = null;      // or container for HTML
let currentAnimation = null;

const slideData = [
  {
    stepCount: 1,           // number of steps (clicks) in this slide
    resolve(stepIndex) {
      // Set ABSOLUTE state for this slide at this step
      // No deltas — full state declaration
      renderer.markDirty();  // Three.js only
    },
    animate(stepIndex, done) {
      // Animate TO this slide's state, call done() when complete
      // For simple slides: this.resolve(stepIndex); done();
    },
  },
];

export const myScene = {
  title: 'Scene Title',
  slides: slideData.map((s) => ({ stepCount: s.stepCount })),

  init(stage) {
    renderer = createThreeRenderer();
    threeCtx = renderer.init(stage);
    // Create Three.js objects here, add to threeCtx.scene
    threeCtx.scene.background = new THREE.Color(colors.bg);
    return {};
  },

  destroy() {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
  },

  resolveToSlide(ctx, slideIndex, stepIndex) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].resolve(stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].animate(stepIndex, done);
  },
};
```

## 4. Determinism Checklist

Before considering the scene complete, verify:

- [ ] Each `resolve()` sets ALL object properties to absolute values (positions, visibility, colors)
- [ ] `resolve()` does NOT depend on previous slide state
- [ ] Calling `resolveToSlide(n)` on a fresh scene produces identical state to animating through 0..n
- [ ] Steps within a slide are cumulative: `resolve(stepIndex=1)` includes everything from `stepIndex=0`

## 5. Animation Pattern

For slides with animations, use the timeline system:

```javascript
animate(stepIndex, done) {
  // First resolve to pre-animation state (previous slide's end state)
  // Then animate to this slide's target state
  currentAnimation = playTimeline(
    [
      { property: 'boxX', from: -2, to: 2, delay: 0, duration: 600 },
      { property: 'boxOpacity', from: 0, to: 1, delay: 200, duration: 400 },
    ],
    (vals) => {
      box.position.x = vals.boxX;
      box.material.opacity = vals.boxOpacity;
      renderer.markDirty();
    },
    () => {
      currentAnimation = null;
      done();
    },
  );
},
```

Rules:
- Always store animation in `currentAnimation` for cancellation
- The `done` callback MUST be called when animation completes
- `resolve()` for the same slide must produce the same end state as the animation

## 6. Register the Scene

In `src/main.js`:

1. Import the scene: `import { myScene } from './scenes/nn-name/scene.js';`
2. Add to `buildSceneDefs()` array in the correct position

## 7. Test with Pure Function Separation

If the scene has non-trivial logic (state machines, layout calculations, data transforms):

1. Extract to `src/scenes/{nn}-{name}/scene.lib.js`
2. Write tests in `src/scenes/{nn}-{name}/scene.lib.test.js`
3. Import the pure functions into `scene.js`

Simple scenes with only direct property assignments don't need separate lib files.

## 8. Verify

1. Navigate to the scene via command palette (Escape → type scene title)
2. Click through all slides and steps — animations play correctly
3. Jump directly to the scene from another scene — resolveToSlide produces correct state
4. Rapid-click through slides — state remains consistent (no visual glitches)
5. Navigate away and back — scene reinitializes cleanly
