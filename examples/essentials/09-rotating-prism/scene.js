// Rotating prism — a Three.js scene built with `create3DScene`.
//
// Three steps progress an icosahedron through positions: settled, tilted,
// then enlarged on a different axis. The factory injects a `playTimeline`
// helper that handles cancellation when the user skips ahead, so each step
// is just an absolute target.

import * as THREE from '/@fs/app/node_modules/three/build/three.module.js';
import { create3DScene } from '/@fs/app/src/components/3d-scene/scene-factory.js';
import { colors } from '/@fs/app/src/shared/colors.js';

export const rotatingPrism = create3DScene({
  title: '3D in a deck',
  slides: [{ stepCount: 3 }],

  setup({ scene }) {
    const geometry = new THREE.IcosahedronGeometry(2, 0);
    const material = new THREE.MeshStandardMaterial({
      color: colors.accent,
      metalness: 0.2,
      roughness: 0.4,
      flatShading: true,
    });
    const prism = new THREE.Mesh(geometry, material);
    scene.add(prism);

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({ color: colors.beam, transparent: true, opacity: 0.5 }),
    );
    prism.add(wire);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 4, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(colors.purple, 0.6);
    fill.position.set(-4, -2, 2);
    scene.add(fill);

    scene.add(new THREE.AmbientLight(0x404070, 0.6));

    return { prism };
  },

  resolveStep({ prism }, { stepIndex }) {
    if (stepIndex === 0) {
      prism.rotation.set(0, 0, 0);
      prism.scale.setScalar(1);
    } else if (stepIndex === 1) {
      prism.rotation.set(Math.PI / 5, Math.PI / 4, 0);
      prism.scale.setScalar(1);
    } else {
      prism.rotation.set(-Math.PI / 6, Math.PI / 2, Math.PI / 8);
      prism.scale.setScalar(1.5);
    }
  },

  animateStep({ prism }, { stepIndex, playTimeline, markDirty, done }) {
    const targets = [
      { rx: 0, ry: 0, rz: 0, s: 1 },
      { rx: Math.PI / 5, ry: Math.PI / 4, rz: 0, s: 1 },
      { rx: -Math.PI / 6, ry: Math.PI / 2, rz: Math.PI / 8, s: 1.5 },
    ];
    const to = targets[stepIndex];
    const from = {
      rx: prism.rotation.x,
      ry: prism.rotation.y,
      rz: prism.rotation.z,
      s: prism.scale.x,
    };
    playTimeline(
      [
        { property: 'rx', from: from.rx, to: to.rx, delay: 0, duration: 700 },
        { property: 'ry', from: from.ry, to: to.ry, delay: 0, duration: 700 },
        { property: 'rz', from: from.rz, to: to.rz, delay: 0, duration: 700 },
        { property: 's',  from: from.s,  to: to.s,  delay: 0, duration: 700 },
      ],
      ({ rx, ry, rz, s }) => {
        prism.rotation.set(rx, ry, rz);
        prism.scale.setScalar(s);
        markDirty();
      },
      done,
    );
  },
});
