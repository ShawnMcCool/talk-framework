# Three.js Rendering Setup

## ThreeRenderer Lifecycle (src/rendering/three-scene.js)

### Initialization
- Creates WebGL renderer with antialiasing enabled
- Sets pixel ratio based on device (`devicePixelRatio`)
- Creates a **Three.js OrthographicCamera** (not perspective)
  - Frustum height: 10 units
  - Auto-adjusts aspect ratio based on container
  - Position: (0, 0, 10), looking at origin
- Creates Three.js Scene
- Adds three light sources:
  1. **AmbientLight** (0xffffff, intensity 0.6) - global illumination
  2. **DirectionalLight** (0xffffff, intensity 0.8) at (5, 10, 7) - main shadow caster
  3. **DirectionalLight** (0xffffff, intensity 0.3) at (-3, 5, -5) - fill light

### On-Demand Rendering
- Uses `needsRender` flag: `renderer.markDirty()` to trigger next frame
- Runs in `requestAnimationFrame` loop but only renders when `needsRender=true`
- Automatically handles window resize events

### API
```javascript
const renderer = createThreeRenderer();
const ctx = renderer.init(stage);  // Returns { scene, camera, renderer, container }

renderer.markDirty();              // Flag that next frame needs render
renderer.getScene();               // Access Three.js scene
renderer.getCamera();              // Access orthographic camera
renderer.destroy();                // Cleanup: cancel RAF, remove event listeners, dispose GL
```

### Camera Details
- **Type**: OrthographicCamera (not perspective)
- **Default frustum height**: 10 units
- **Maintains aspect ratio**: Camera bounds scale with container size
- **Positioning**: Position at Z=10, looking at origin (0,0,0)
- Automatically recalculated on window resize

## HTML Renderer (src/rendering/html-scene.js)
Simple wrapper that creates a full-screen div container. Used for non-3D slides.

```javascript
const renderer = createHtmlRenderer();
const container = renderer.init(stage);
renderer.getContainer();           // Get the div
renderer.destroy();                // Remove from DOM
```
