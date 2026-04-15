# Task Completion Checklist for Scene Development

## After Creating/Modifying a Scene

### Code Quality
- [ ] Scene follows `Scene Contract` (exports all required methods)
- [ ] `resolveToSlide()` produces deterministic visual state
- [ ] `animateToSlide()` calls `done()` when animation completes
- [ ] `destroy()` cleans up: animations, renderer, DOM, THREE.js objects
- [ ] `currentAnimation` is properly cancelled before starting new animations
- [ ] All `renderer.markDirty()` calls present after state changes
- [ ] All colors imported from `src/shared/colors.js` (no hardcoded hex)
- [ ] Three.js geometries and materials properly disposed in `destroy()`

### Animation Correctness
- [ ] All tweens have `property`, `from`, `to`, `delay`, `duration`
- [ ] Tween property names are unique when using `.flatMap()` for staggering
- [ ] Animation cancellation with `.resolve()` snaps to final state
- [ ] Done callback invoked after each animation completes

### Scene Registration
- [ ] Scene imported in `src/main.js`
- [ ] Scene added to `buildSceneDefs()` return array in correct order
- [ ] Scene number matches filename (e.g., `07-beam-vm` is 7th scene)

### Testing
- [ ] Run `./test` and verify no failures
- [ ] Manually test scene in dev server: `./dev` then navigate with arrow keys
- [ ] Test rapid navigation (spam arrow keys) - should snap to final state
- [ ] Test jumping directly to scene from command palette (Escape key)
- [ ] Test both `resolveToSlide` (jump) and `animateToSlide` (step) paths

### Documentation
- [ ] Scene title is descriptive
- [ ] Slide step counts are accurate
- [ ] Scene layout is visually balanced (uses orthographic camera properly)

### Performance
- [ ] No memory leaks (test by navigating away and back)
- [ ] Animation frame rate smooth (check with browser dev tools)
- [ ] Three.js objects properly created and destroyed

### File Organization
- [ ] Scene in `src/scenes/{nn}-{name}/scene.js` directory
- [ ] Filename matches scene export name pattern
- [ ] Scene exports follow naming: `beamVmScene`, `processMessagingScene`, etc.
