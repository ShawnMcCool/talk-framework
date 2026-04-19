import { createTextMesh } from '../text.js';
import { createContactShadow } from '../effects.js';
import * as THREE from 'three';

export function dropAnimation(text, textOpts = {}) {
  const startY = 8;
  const endY = 0;
  const gravity = 50;
  let state = null;
  let shadow = null;

  return {
    label: 'Drop',
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

      shadow = createContactShadow(scene, { groundY: endY, startY });
      return { group, mesh };
    },

    setStart(content) {
      content.mesh.position.y = startY;
      state = { y: startY, vy: 0, landed: false, elapsed: 0 };
      if (shadow) shadow.update(startY);
    },

    setEnd(content) {
      content.mesh.position.y = endY;
      state = null;
      if (shadow) shadow.reset();
    },

    tick(content, dt, { shake }) {
      if (!state || state.landed) return true;

      state.elapsed += dt;
      state.vy += gravity * dt;
      state.y -= state.vy * dt;

      if (state.y <= endY) {
        state.y = endY;
        state.landed = true;
        shake.trigger();
      }

      content.mesh.position.y = state.y;
      if (shadow) shadow.update(state.y);
      return state.landed;
    },

    dispose() {
      if (shadow) shadow.dispose();
    },
  };
}
