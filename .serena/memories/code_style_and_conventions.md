# Code Style and Conventions

## General Principles
- **Language**: JavaScript (ES6 modules)
- **Pure functions**: Logic in `*.lib.js` files
- **Tests**: Corresponding `*.lib.test.js` files using Node's built-in test runner
- **Side effects**: Separate files for DOM/rendering/animation logic
- **No global state** (within module scope): Use module variables, not globals

## Naming Conventions
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `SPHERE_COUNT`, `BOX_SIZE`)
- **Variables/Functions**: `camelCase` (e.g., `currentAnimation`, `createTextSprite`)
- **Scene exports**: `myNameScene` (e.g., `beamVmScene`)
- **Scene directories**: `{nn}-{kebab-name}` (e.g., `07-beam-vm`)

## Three.js Patterns
- Import with `import * as THREE from 'three'`
- Always call `renderer.markDirty()` after changing object properties
- Use `new THREE.Vector3()` for position/direction values
- Prefer `transparent: true` + `opacity` over visibility for smooth transitions
- Use `scene.add()` and `scene.remove()` for object lifecycle

## Animation Patterns
- Store animation handle: `currentAnimation = playTimeline(...)`
- Always cancel before starting new animation: `if (currentAnimation) currentAnimation.resolve()`
- Call `renderer.markDirty()` in `applyFn` callback
- Tweak property names to be descriptive: `{ property: 'shelf0', ...}` not `{ property: 'val0', ...}`

## Tween Properties
- `property`: String key for output object (use unique names when staggering)
- `from` / `to`: Numeric values to interpolate
- `delay`: Milliseconds before tween starts
- `duration`: Milliseconds for interpolation (not including delay)

## Color Usage
```javascript
// ✓ Correct
import { colors } from '../../shared/colors.js';
new THREE.MeshPhongMaterial({ color: colors.accent })

// ✗ Wrong
new THREE.MeshPhongMaterial({ color: '#aaccff' })
```

## Module Structure
```javascript
// Imports at top
import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';

// Module-level state (not global)
let renderer = null;
let currentAnimation = null;

// Helper functions
function createObjects() { }
function updateState() { }

// Slide data
const slideData = [ /* ... */ ];

// Export scene object
export const myScene = { /* ... */ };
```

## Comments
- Minimal comments (code should be self-documenting)
- Explain *why*, not *what* when necessary
- Use short comments for non-obvious logic

## Scene File Pattern
Every scene must:
1. Define `slideData` array with `stepCount`, `resolve()`, `animate()` methods
2. Export object with: `title`, `slides`, `init()`, `destroy()`, `resolveToSlide()`, `animateToSlide()`
3. Handle animation cancellation in `destroy()` and before starting new animations
4. Use `renderer.markDirty()` to flag render updates
5. Clean up Three.js objects: geometries, materials, DOM elements
