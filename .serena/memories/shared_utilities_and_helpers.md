# Shared Utilities and Scene Helpers

## Colors (src/shared/colors.js)

### Palette Constants
```javascript
colors = {
  bg: '#1a1a2e',              // Deep navy background
  bgDark: '#141428',          // Darker navy
  bgDarker: '#0f0f1e',        // Darkest navy
  text: '#e8e8f8',            // Light text
  textMuted: '#99aacc',       // Muted text
  accent: '#aaccff',          // Cool blue accent
  accentWarm: '#ff9944',      // Warm orange accent
  accentOrange: '#ff8844',    // Slightly different orange
  failure: '#ff3366',         // Red failure color
  beam: '#44bbff',            // Cyan beam color
  green: '#44dd88',           // Green accent
  purple: '#aa77ff',          // Purple accent
}
```

### HSL Building Hues (for creating new colors)
All at S:0.55, L:0.48
- Blue: hsl(216, 55%, 48%)
- Teal: hsl(162, 55%, 48%)
- Amber: hsl(36, 55%, 48%)
- Purple: hsl(288, 55%, 48%)
- Red: hsl(0, 55%, 48%)
- Green: hsl(108, 55%, 48%)

### applyColorVars(el)
Applies all color palette as CSS custom properties on element.
```javascript
applyColorVars(document.documentElement);
// Sets --color-bg, --color-accent, etc.
```

## Scene Helpers (src/scenes/scene-helpers.js)

### createTextSprite(text, options)
Creates a Three.js Sprite with canvas-rendered text that always faces camera.

```javascript
const label = createTextSprite('0.12', {
  fontSize: 32,
  color: colors.beam,
  bgColor: null,        // Optional rounded rectangle background
  padding: 12           // Pixels around text
});
label.position.set(x, y, z);
scene.add(label);
```

**Returns**: `THREE.Sprite` with material opacity property.

### glowMaterial(color, options)
Creates a MeshPhongMaterial with emissive glow.

```javascript
const mat = glowMaterial(colors.accentWarm, {
  emissiveIntensity: 0.5,
  opacity: 1.0,
  transparent: false
});
const mesh = new THREE.Mesh(geo, mat);
```

### wireframeMaterial(color, options)
Creates a wireframe BasicMaterial.

```javascript
const mat = wireframeMaterial(colors.accent, { opacity: 0.4 });
```

### easeInOut(t)
Cubic ease-in-out easing function for smooth animations.
```javascript
// t ranges from 0 to 1
const eased = easeInOut(0.5);
```

### disposeGroup(group)
Cleans up all geometries and materials in a THREE.Object3D tree.

```javascript
disposeGroup(myGroup);  // Prevents memory leaks
```

## Common Material Patterns

### Transparent Materials
```javascript
new THREE.MeshPhongMaterial({
  color: colors.accent,
  transparent: true,
  opacity: 0  // Start invisible
})
```

### Glow/Emissive
```javascript
glowMaterial(colors.accentWarm, {
  emissiveIntensity: 0.8
})
```

### Lines/Wireframe
```javascript
new THREE.LineBasicMaterial({
  color: colors.accent,
  transparent: true,
  opacity: 0.5
})
```
