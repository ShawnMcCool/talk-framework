// Rotating cube — a minimal Three.js scene built with `createThreeScene`.
//
// Step 0: cube is still, facing the camera.
// Step 1: cube tilts onto a 45° corner.
// Step 2: cube grows and tilts back.
//
// `/@fs/` is Vite's dev-server escape hatch for importing files outside the
// content root. The framework sits at /app inside Docker; the cube scene is
// mounted at /content. This import pattern works during `talk serve` but not
// in a production bundle — which is fine, because content folders are a
// dev-time authoring surface.

import * as THREE from '/@fs/app/node_modules/three/build/three.module.js';
import { createThreeScene } from '/@fs/app/src/components/three-scene/scene-factory.js';
import { colors } from '/@fs/app/src/shared/colors.js';

export const rotatingCube = createThreeScene({
  title: 'Rotating cube',
  slides: [{ stepCount: 3 }],

  setup({ scene }) {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
      color: colors.accent,
      metalness: 0.1,
      roughness: 0.5,
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(3, 4, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404070, 0.6));

    return { cube };
  },

  // Absolute state for each step — must be deterministic.
  resolveStep({ cube }, { stepIndex }) {
    if (stepIndex === 0) {
      cube.rotation.set(0, 0, 0);
      cube.scale.setScalar(1);
    } else if (stepIndex === 1) {
      cube.rotation.set(Math.PI / 4, Math.PI / 4, 0);
      cube.scale.setScalar(1);
    } else {
      cube.rotation.set(0, Math.PI / 4, 0);
      cube.scale.setScalar(1.4);
    }
  },

  // Animated transition using the injected timeline (auto-cancelled on destroy).
  animateStep({ cube }, { stepIndex, playTimeline, markDirty, done }) {
    const targets = [
      { rx: 0, ry: 0, s: 1 },
      { rx: Math.PI / 4, ry: Math.PI / 4, s: 1 },
      { rx: 0, ry: Math.PI / 4, s: 1.4 },
    ];
    const to = targets[stepIndex];
    const from = {
      rx: cube.rotation.x,
      ry: cube.rotation.y,
      s: cube.scale.x,
    };
    playTimeline(
      [
        { property: 'rx', from: from.rx, to: to.rx, delay: 0, duration: 500 },
        { property: 'ry', from: from.ry, to: to.ry, delay: 0, duration: 500 },
        { property: 's',  from: from.s,  to: to.s,  delay: 0, duration: 500 },
      ],
      ({ rx, ry, s }) => {
        cube.rotation.x = rx;
        cube.rotation.y = ry;
        cube.scale.setScalar(s);
        markDirty();
      },
      done,
    );
  },
});
