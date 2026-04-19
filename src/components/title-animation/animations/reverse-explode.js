import { createLetterMeshes } from '../text.js';
import * as THREE from 'three';

export function reverseExplodeAnimation(text, textOpts = {}) {
  const scatterRadius = 12;
  const duration = 0.6;
  let elapsed = 0;
  let scatterPositions = null;

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  return {
    label: 'Reverse Explosion',
    lowAngle: 1.2,
    fov: 48,

    createContent(scene, { colors }) {
      const { group, letters } = createLetterMeshes(text, {
        size: 2.2, depth: 0.8, color: colors.accent,
        emissiveIntensity: 0.2, bevelThickness: 0.06, bevelSize: 0.04,
        ...textOpts,
      });
      group.rotation.x = -0.15;
      group.rotation.y = 0.12;
      scene.add(group);
      return { group, letters };
    },

    setStart(content) {
      elapsed = 0;
      scatterPositions = content.letters.map((l) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = scatterRadius * (0.5 + Math.random() * 0.5);
        const sx = Math.cos(angle) * dist;
        const sy = Math.sin(angle) * dist;
        const sz = (Math.random() - 0.5) * scatterRadius;
        const srotX = (Math.random() - 0.5) * Math.PI * 2;
        const srotY = (Math.random() - 0.5) * Math.PI * 2;
        const srotZ = (Math.random() - 0.5) * Math.PI * 2;
        l.mesh.position.set(sx, sy, sz);
        l.mesh.rotation.set(srotX, srotY, srotZ);
        l.mesh.material.opacity = 0;
        l.mesh.material.transparent = true;
        return { sx, sy, sz, srotX, srotY, srotZ };
      });
    },

    setEnd(content) {
      for (const l of content.letters) {
        l.mesh.position.set(l.restX, l.restY, 0);
        l.mesh.rotation.set(0, 0, 0);
        l.mesh.material.opacity = 1;
        l.mesh.material.transparent = false;
      }
      scatterPositions = null;
    },

    tick(content, dt, { shake }) {
      if (!scatterPositions) return true;

      elapsed += dt;
      const t = Math.min(1, elapsed / duration);
      const e = easeOutBack(t);

      for (let i = 0; i < content.letters.length; i++) {
        const l = content.letters[i];
        const s = scatterPositions[i];

        l.mesh.position.x = s.sx + (l.restX - s.sx) * e;
        l.mesh.position.y = s.sy + (l.restY - s.sy) * e;
        l.mesh.position.z = s.sz + (0 - s.sz) * e;
        l.mesh.rotation.x = s.srotX * (1 - e);
        l.mesh.rotation.y = s.srotY * (1 - e);
        l.mesh.rotation.z = s.srotZ * (1 - e);
        l.mesh.material.opacity = Math.min(1, t * 3);
        l.mesh.material.transparent = l.mesh.material.opacity < 1;
      }

      if (t >= 1) {
        shake.trigger();
        this.setEnd(content);
        return true;
      }
      return false;
    },
  };
}
