import { createTextMesh } from '../text.js';
import * as THREE from 'three';

export function spinLockAnimation(text, textOpts = {}) {
  const totalSpins = 3;
  const duration = 0.8;
  const startZ = -15;
  let elapsed = 0;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  return {
    label: 'Spin Lock',
    lowAngle: 1.5,
    fov: 50,

    createContent(scene, { colors }) {
      const mesh = createTextMesh(text, {
        size: 2.2, depth: 0.8, color: colors.accent,
        emissiveIntensity: 0.2, bevelThickness: 0.06, bevelSize: 0.04,
        ...textOpts,
      });

      // Wrap in a pivot so we can spin around the mesh center
      const pivot = new THREE.Group();
      pivot.add(mesh);

      const group = new THREE.Group();
      group.add(pivot);
      group.rotation.y = 0.12;
      scene.add(group);
      return { group, mesh, pivot };
    },

    setStart(content) {
      elapsed = 0;
      content.pivot.rotation.x = totalSpins * Math.PI * 2 - 0.15;
      content.pivot.position.z = startZ;
      content.mesh.material.opacity = 0;
      content.mesh.material.transparent = true;
    },

    setEnd(content) {
      content.pivot.rotation.x = -0.15;
      content.pivot.position.z = 0;
      content.mesh.material.opacity = 1;
      content.mesh.material.transparent = false;
    },

    tick(content, dt, { shake }) {
      elapsed += dt;
      const t = Math.min(1, elapsed / duration);
      const e = easeOutCubic(t);

      const startRot = totalSpins * Math.PI * 2 - 0.15;
      const endRot = -0.15;
      content.pivot.rotation.x = startRot + (endRot - startRot) * e;
      content.pivot.position.z = startZ * (1 - e);
      content.mesh.material.opacity = Math.min(1, t * 3);
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
