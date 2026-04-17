// Minimal Three.js scene — one rotating cube, one slide, two steps.
//
// To try it: copy this file to src/scenes/XX-minimal-three/scene.js, then
// register it in src/main.js:
//
//   import { minimalThreeScene } from './scenes/XX-minimal-three/scene.js';
//   ...
//   { scene: minimalThreeScene, path: 'src/scenes/XX-minimal-three/scene.js' },
//
// This example exists as a reference; it is NOT registered in the deck.

import * as THREE from 'three';
import { createThreeScene } from '../../src/three-scenes/scene-factory.js';
import { colors } from '../../src/shared/colors.js';

/** @type {import('../../src/types.js').SceneModule} */
export const minimalThreeScene = createThreeScene({
  title: 'Minimal Three',
  slides: [{ stepCount: 2 }],

  setup({ scene }) {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ color: colors.beam });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    return { cube };
  },

  // Optional — called every frame. Remove if you don't need idle motion.
  onTick({ cube }) {
    cube.rotation.y += 0.005;
  },

  // Absolute state for (slide, step) — must be deterministic.
  resolveStep({ cube }, { stepIndex }) {
    cube.scale.setScalar(stepIndex === 0 ? 1 : 1.5);
  },

  // Animated transition. Always use the injected playTimeline + done.
  animateStep({ cube }, { stepIndex, playTimeline, markDirty, done }) {
    const from = cube.scale.x;
    const to = stepIndex === 0 ? 1 : 1.5;
    playTimeline(
      [{ property: 's', from, to, delay: 0, duration: 400 }],
      ({ s }) => { cube.scale.setScalar(s); markDirty(); },
      done,
    );
  },
});
