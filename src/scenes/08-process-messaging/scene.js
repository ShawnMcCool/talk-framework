import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
let currentAnimation = null;

let senderCube = null;
let receiverCube = null;
let senderLabel = null;
let receiverLabel = null;
let particle = null;
let mailboxCylinder = null;
let messageRings = [];

const SENDER_POS = new THREE.Vector3(-2.5, 0, 0);
const RECEIVER_POS = new THREE.Vector3(1.5, 0, 0);
const MAILBOX_POS = new THREE.Vector3(3.5, 0, 0);
const RING_BASE_Y = -0.8;
const RING_SPACING = 0.35;

function arcPosition(t, from, to) {
  const mid = new THREE.Vector3().lerpVectors(from, to, 0.5);
  mid.y += 2.0;
  const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * mid.x + t * t * to.x;
  const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * mid.y + t * t * to.y;
  return { x, y, z: 0 };
}

function createProcesses(scene) {
  const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);

  senderCube = new THREE.Mesh(geo, glowMaterial(colors.beam, { emissiveIntensity: 0.3 }));
  senderCube.position.copy(SENDER_POS);
  scene.add(senderCube);

  receiverCube = new THREE.Mesh(geo, glowMaterial(colors.accentWarm, { emissiveIntensity: 0.3 }));
  receiverCube.position.copy(RECEIVER_POS);
  scene.add(receiverCube);

  senderLabel = createTextSprite('0.12', { fontSize: 32, color: colors.beam });
  senderLabel.position.set(SENDER_POS.x, SENDER_POS.y - 0.6, 0);
  scene.add(senderLabel);

  receiverLabel = createTextSprite('0.57', { fontSize: 32, color: colors.accentWarm });
  receiverLabel.position.set(RECEIVER_POS.x, RECEIVER_POS.y - 0.6, 0);
  scene.add(receiverLabel);
}

function createParticle(scene) {
  const geo = new THREE.SphereGeometry(0.12, 12, 8);
  particle = new THREE.Mesh(geo, glowMaterial(colors.accentWarm, { emissiveIntensity: 0.8 }));
  particle.visible = false;
  scene.add(particle);
}

function createMailbox(scene) {
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 2.2, 16, 1, true);
  const mat = new THREE.MeshPhongMaterial({
    color: colors.accentWarm,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  mailboxCylinder = new THREE.Mesh(geo, mat);
  mailboxCylinder.position.copy(MAILBOX_POS);
  scene.add(mailboxCylinder);
}

function createRings(scene) {
  messageRings = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.TorusGeometry(0.3, 0.07, 8, 24);
    const mat = glowMaterial(colors.accentWarm, { emissiveIntensity: 0.5, transparent: true, opacity: 0 });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(MAILBOX_POS.x, RING_BASE_Y + i * RING_SPACING + 0.5, 0);
    ring.visible = false;
    scene.add(ring);
    messageRings.push(ring);
  }
}

function resolveStep(step) {
  senderCube.visible = true;
  receiverCube.visible = true;
  senderLabel.visible = true;
  receiverLabel.visible = true;
  particle.visible = false;

  mailboxCylinder.material.opacity = step >= 2 ? 0.2 : 0;
  messageRings[0].visible = step >= 2;
  messageRings[0].material.opacity = step >= 2 ? 1 : 0;
  messageRings[1].visible = step >= 3;
  messageRings[1].material.opacity = step >= 3 ? 1 : 0;
  messageRings[2].visible = step >= 3;
  messageRings[2].material.opacity = step >= 3 ? 1 : 0;

  renderer.markDirty();
}

function animateParticleArc(from, to, onComplete) {
  return playTimeline(
    [{ property: 't', from: 0, to: 1, delay: 0, duration: 800 }],
    (vals) => {
      const pos = arcPosition(vals.t, from, to);
      particle.position.set(pos.x, pos.y, pos.z);
      particle.visible = true;
      renderer.markDirty();
    },
    () => {
      particle.visible = false;
      renderer.markDirty();
      onComplete();
    },
  );
}

const slideData = [
  {
    stepCount: 4,
    resolve(stepIndex) {
      resolveStep(stepIndex);
    },
    animate(stepIndex, done) {
      if (stepIndex === 0) {
        resolveStep(0);
        done();
      } else if (stepIndex === 1) {
        currentAnimation = animateParticleArc(SENDER_POS, RECEIVER_POS, () => {
          currentAnimation = null;
          done();
        });
      } else if (stepIndex === 2) {
        currentAnimation = playTimeline(
          [
            { property: 'mailboxOpacity', from: 0, to: 0.2, delay: 0, duration: 400 },
            { property: 'ring0Opacity', from: 0, to: 1, delay: 200, duration: 400 },
          ],
          (vals) => {
            mailboxCylinder.material.opacity = vals.mailboxOpacity;
            messageRings[0].visible = true;
            messageRings[0].material.opacity = vals.ring0Opacity;
            renderer.markDirty();
          },
          () => { currentAnimation = null; done(); },
        );
      } else if (stepIndex === 3) {
        messageRings[1].visible = true;
        messageRings[2].visible = true;
        currentAnimation = playTimeline(
          [
            { property: 'ring1Opacity', from: 0, to: 1, delay: 0, duration: 500 },
            { property: 'ring2Opacity', from: 0, to: 1, delay: 400, duration: 500 },
          ],
          (vals) => {
            messageRings[1].material.opacity = vals.ring1Opacity;
            messageRings[2].material.opacity = vals.ring2Opacity;
            renderer.markDirty();
          },
          () => { currentAnimation = null; done(); },
        );
      }
    },
  },
];

export const processMessagingScene = {
  title: 'Process Messaging',
  slides: slideData.map((s) => ({ stepCount: s.stepCount })),

  init(stage) {
    renderer = createThreeRenderer();
    threeCtx = renderer.init(stage);
    threeCtx.scene.background = new THREE.Color(colors.bg);

    createProcesses(threeCtx.scene);
    createParticle(threeCtx.scene);
    createMailbox(threeCtx.scene);
    createRings(threeCtx.scene);

    return {};
  },

  destroy() {
    if (currentAnimation) { currentAnimation.resolve(); currentAnimation = null; }
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
    senderCube = null;
    receiverCube = null;
    particle = null;
    mailboxCylinder = null;
    messageRings = [];
  },

  resolveToSlide(ctx, slideIndex, stepIndex) {
    if (currentAnimation) { currentAnimation.resolve(); currentAnimation = null; }
    slideData[slideIndex].resolve(stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    if (currentAnimation) { currentAnimation.resolve(); currentAnimation = null; }
    slideData[slideIndex].animate(stepIndex, done);
  },
};
