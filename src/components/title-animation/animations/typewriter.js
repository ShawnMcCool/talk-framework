import { createLetterMeshes } from '../text.js';
import * as THREE from 'three';

export function typewriterAnimation(text, textOpts = {}) {
  const dropHeight = 4;
  const staggerDelay = 0.06;
  const gravity = 120;
  let letterStates = null;

  return {
    label: 'Typewriter Stomp',
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
      letterStates = content.letters.map((l, i) => {
        l.mesh.position.y = l.restY + dropHeight;
        l.mesh.visible = false;
        return { y: l.restY + dropHeight, vy: 0, landed: false, delay: i * staggerDelay, started: false };
      });
    },

    setEnd(content) {
      for (const l of content.letters) {
        l.mesh.position.y = l.restY;
        l.mesh.visible = true;
      }
      letterStates = null;
    },

    tick(content, dt, { shake }) {
      if (!letterStates) return true;

      let allLanded = true;

      for (let i = 0; i < letterStates.length; i++) {
        const s = letterStates[i];
        const l = content.letters[i];

        s.delay -= dt;
        if (s.delay > 0) { allLanded = false; continue; }

        if (!s.started) {
          s.started = true;
          l.mesh.visible = true;
        }

        if (s.landed) continue;

        allLanded = false;
        s.vy += gravity * dt;
        s.y -= s.vy * dt;

        if (s.y <= l.restY) {
          s.y = l.restY;
          s.landed = true;
          shake.trigger();
        }

        l.mesh.position.y = s.y;
      }

      return allLanded;
    },
  };
}
