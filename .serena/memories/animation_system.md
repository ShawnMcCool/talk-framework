# Animation System

## Timeline/Tween Architecture

### playTimeline(tweenDefs, applyFn, doneFn)
High-level animation function that plays a timeline of tweens.

```javascript
const anim = playTimeline(
  [
    { property: 'x', from: 0, to: 10, delay: 0, duration: 500 },
    { property: 'opacity', from: 1, to: 0, delay: 200, duration: 400 }
  ],
  (values) => {
    // Called each frame with interpolated values
    // values = { x: ..., opacity: ... }
    mesh.position.x = values.x;
    mesh.material.opacity = values.opacity;
    renderer.markDirty();
  },
  () => {
    // Called when animation completes
    currentAnimation = null;
    done();
  }
);

// Snap to end state immediately if interrupted
if (needsCancel) {
  anim.resolve();  // Skips to final frame and calls doneFn()
}
```

## Tween Definition
```javascript
{
  property: 'propertyName',  // Name for output values object
  from: startValue,          // Starting value
  to: endValue,              // Ending value
  delay: 0,                  // ms before tween starts
  duration: 500              // Duration of tween (not including delay)
}
```

## Pure Tween Functions (timeline.lib.js)
- `lerp(from, to, t)`: Linear interpolation
- `tweenValueAt(tween, elapsed)`: Get value at elapsed time for single tween
- `createTimeline(tweens)`: Create timeline from array of tweens
- `timelineDuration(timeline)`: Total duration including delays
- `timelineValuesAt(timeline, elapsed)`: Get all values at elapsed time

## Animation Pattern in Scenes

1. Store `currentAnimation` module variable
2. On `animateToSlide()`: Create animation with `playTimeline()`
3. In `resolveToSlide()`: Cancel any running animation with `.resolve()`
4. In `destroy()`: Cancel animation if still running

```javascript
let currentAnimation = null;

animateToSlide(ctx, slideIndex, stepIndex, done) {
  if (currentAnimation) currentAnimation.resolve();
  currentAnimation = playTimeline(
    tweenDefs,
    applyFn,
    () => { currentAnimation = null; done(); }
  );
}
```
