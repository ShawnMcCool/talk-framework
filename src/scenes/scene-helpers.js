import * as THREE from 'three';

/**
 * Create a text sprite that always faces camera.
 * Returns a THREE.Sprite with a canvas-rendered label.
 */
export function createTextSprite(text, {
  fontSize = 48,
  color = '#e8e8f8',
  bgColor = null,
  padding = 12,
} = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${fontSize}px sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;

  canvas.width = textWidth + padding * 2;
  canvas.height = fontSize + padding * 2;

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
    ctx.fill();
  }

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);

  const aspect = canvas.width / canvas.height;
  sprite.scale.set(aspect * 0.6, 0.6, 1);

  return sprite;
}

/**
 * Easing: cubic ease-in-out.
 */
export function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Create a simple glow material (emissive MeshPhongMaterial).
 */
export function glowMaterial(color, { emissiveIntensity = 0.4, opacity = 1.0, transparent = false } = {}) {
  return new THREE.MeshPhongMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    opacity,
    transparent,
  });
}

/**
 * Create a wireframe material.
 */
export function wireframeMaterial(color, { opacity = 0.4 } = {}) {
  return new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity,
  });
}

/**
 * Dispose all children of a THREE.Object3D (geometries + materials).
 */
export function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (obj.material.map) obj.material.map.dispose();
      obj.material.dispose();
    }
  });
}
