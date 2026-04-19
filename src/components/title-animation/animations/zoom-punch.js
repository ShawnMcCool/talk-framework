import { createTextMesh } from '../text.js';
import * as THREE from 'three';

export function zoomPunchAnimation(text, textOpts = {}) {
  const startScale = 15;
  const duration = 0.5;
  let elapsed = 0;

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  return {
    label: 'Zoom Punch',
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
      content.mesh.scale.set(startScale, startScale, startScale);
      content.mesh.material.opacity = 0;
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
      const e = easeOutExpo(t);

      const scale = startScale + (1 - startScale) * e;
      content.mesh.scale.set(scale, scale, scale);
      content.mesh.material.opacity = Math.min(1, t * 4);
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
