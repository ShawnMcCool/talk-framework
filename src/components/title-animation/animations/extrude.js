import { createTextMesh } from '../text.js';
import * as THREE from 'three';

export function extrudeAnimation(text, textOpts = {}) {
  const duration = 0.7;
  let elapsed = 0;

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  return {
    label: 'Extrude from Ground',
    lowAngle: 1.5,
    fov: 50,

    createContent(scene, { colors }) {
      const mesh = createTextMesh(text, {
        size: 2.2, depth: 0.8, color: colors.accent,
        emissiveIntensity: 0.2, bevelThickness: 0.06, bevelSize: 0.04,
        ...textOpts,
      });
      mesh.rotation.x = -0.15;
      mesh.rotation.y = 0.12;

      const group = new THREE.Group();
      group.add(mesh);
      scene.add(group);
      return { group, mesh };
    },

    setStart(content) {
      elapsed = 0;
      content.mesh.scale.set(1, 0.01, 0.01);
      content.mesh.material.opacity = 0.3;
      content.mesh.material.transparent = true;
    },

    setEnd(content) {
      content.mesh.scale.set(1, 1, 1);
      content.mesh.material.opacity = 1;
      content.mesh.material.transparent = false;
    },

    tick(content, dt, { shake }) {
      elapsed += dt;
      const t = Math.min(1, elapsed / duration);
      const e = easeOutBack(t);

      content.mesh.scale.set(1, Math.max(0.01, e), Math.max(0.01, e));
      content.mesh.material.opacity = 0.3 + 0.7 * t;
      content.mesh.material.transparent = content.mesh.material.opacity < 1;

      if (t >= 1) {
        shake.trigger();
        this.setEnd(content);
        return true;
      }
      return false;
    },
  };
}
