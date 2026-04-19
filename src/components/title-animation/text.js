import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontData from './fonts/helvetiker_bold.typeface.json';

const loader = new FontLoader();
const font = loader.parse(fontData);

export function createTextMesh(text, {
  size = 1.2,
  depth = 0.4,
  color = 0xaaccff,
  emissiveIntensity = 0.15,
  bevelEnabled = true,
  bevelThickness = 0.03,
  bevelSize = 0.02,
} = {}) {
  const geometry = new TextGeometry(text, {
    font,
    size,
    depth,
    curveSegments: 6,
    bevelEnabled,
    bevelThickness,
    bevelSize,
    bevelSegments: 3,
  });

  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  geometry.translate(
    -(bb.max.x + bb.min.x) / 2,
    -bb.min.y,
    -(bb.max.z + bb.min.z) / 2,
  );

  const material = new THREE.MeshPhongMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    specular: 0x444444,
    shininess: 30,
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Create individual letter meshes positioned to form a word.
 * Returns { group, letters, totalWidth, totalHeight } where
 * group is a THREE.Group centered on the word's bounding box,
 * and letters is an array of { mesh, restX, restY } objects.
 */
export function createLetterMeshes(text, {
  size = 1.2,
  depth = 0.4,
  color = 0xaaccff,
  emissiveIntensity = 0.15,
  bevelEnabled = true,
  bevelThickness = 0.03,
  bevelSize = 0.02,
  letterSpacing = 0.08,
} = {}) {
  const material = new THREE.MeshPhongMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    specular: 0x444444,
    shininess: 30,
  });

  const letters = [];
  let cursorX = 0;

  for (const char of text) {
    if (char === ' ') {
      cursorX += size * 0.4;
      continue;
    }

    const geometry = new TextGeometry(char, {
      font,
      size,
      depth,
      curveSegments: 6,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelSegments: 3,
    });

    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const charWidth = bb.max.x - bb.min.x;
    const charHeight = bb.max.y - bb.min.y;

    // Bottom-align each letter so it stands on y=0
    geometry.translate(-bb.min.x, -bb.min.y, -(bb.max.z + bb.min.z) / 2);

    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.x = cursorX;
    letters.push({ mesh, restX: cursorX, restY: 0, width: charWidth, height: charHeight });
    cursorX += charWidth + letterSpacing;
  }

  const totalWidth = cursorX - letterSpacing;
  const totalHeight = letters.length > 0 ? Math.max(...letters.map(l => l.height)) : size;

  // Center the group
  const group = new THREE.Group();
  for (const l of letters) {
    l.restX -= totalWidth / 2;
    l.mesh.position.x = l.restX;
    group.add(l.mesh);
  }

  return { group, letters, totalWidth, totalHeight };
}

/**
 * Compute the bounding box of a text mesh or group after creation.
 */
export function getTextBounds(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  return {
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    depth: box.max.z - box.min.z,
  };
}
