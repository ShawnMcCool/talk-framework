import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
let currentAnimation = null;

let observer = null;
let workers = [];
let beams = [];
let notificationRing = null;
let titleLabel = null;

const OBSERVER_POS = new THREE.Vector3(0, 2.2, 0);
const WORKER_POSITIONS = [
  new THREE.Vector3(-2.2, -1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(2.2, -1, 0),
];

function createObserver(scene) {
  const geo = new THREE.SphereGeometry(0.4, 20, 16);
  observer = new THREE.Mesh(geo, glowMaterial(0xff7799, { emissiveIntensity: 0.4 }));
  observer.position.copy(OBSERVER_POS);
  scene.add(observer);

  titleLabel = createTextSprite('Monitor', { fontSize: 36, color: colors.textMuted });
  titleLabel.position.set(0, 3.5, 0);
  scene.add(titleLabel);
}

function createWorkers(scene) {
  workers = [];
  const geo = new THREE.SphereGeometry(0.3, 16, 12);
  WORKER_POSITIONS.forEach((pos) => {
    const mat = glowMaterial(colors.accentWarm, { emissiveIntensity: 0.3 });
    const worker = new THREE.Mesh(geo.clone(), mat);
    worker.position.copy(pos);
    scene.add(worker);
    workers.push(worker);
  });
}

function createBeams(scene) {
  beams = [];
  WORKER_POSITIONS.forEach((wPos) => {
    const dir = new THREE.Vector3().subVectors(wPos, OBSERVER_POS);
    const length = dir.length();
    const geo = new THREE.CylinderGeometry(0.015, 0.04, length, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff7799,
      transparent: true,
      opacity: 0,
    });
    const beam = new THREE.Mesh(geo, mat);
    const mid = new THREE.Vector3().addVectors(OBSERVER_POS, wPos).multiplyScalar(0.5);
    beam.position.copy(mid);
    beam.lookAt(wPos);
    beam.rotateX(Math.PI / 2);
    scene.add(beam);
    beams.push(beam);
  });
}

function createNotification(scene) {
  const geo = new THREE.TorusGeometry(0.2, 0.04, 8, 20);
  notificationRing = new THREE.Mesh(geo, glowMaterial(colors.failure, { emissiveIntensity: 0.8, transparent: true, opacity: 0 }));
  notificationRing.rotation.x = Math.PI / 2;
  notificationRing.visible = false;
  scene.add(notificationRing);
}

function resolveStep(step) {
  observer.visible = true;
  observer.material.emissiveIntensity = 0.4;
  workers.forEach((w) => {
    w.visible = true;
    w.material.color.set(colors.accentWarm);
    w.material.emissive.set(colors.accentWarm);
    w.material.opacity = 1;
    w.material.transparent = false;
    w.scale.set(1, 1, 1);
  });

  beams.forEach((b) => {
    b.material.opacity = step >= 1 ? 0.4 : 0;
    b.material.color.set(0xff7799);
  });

  if (step >= 2) {
    workers[0].material.color.set(colors.failure);
    workers[0].material.emissive.set(colors.failure);
    workers[0].material.transparent = true;
    workers[0].material.opacity = 0.3;
    workers[0].scale.setScalar(0.6);
    beams[0].material.color.set(colors.failure);
  }

  notificationRing.visible = false;
  if (step >= 3) {
    observer.material.emissiveIntensity = 0.8;
  }

  renderer.markDirty();
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
        currentAnimation = playTimeline(
          beams.map((b, i) => ({
            property: `beam${i}`, from: 0, to: 0.4, delay: i * 150, duration: 400,
          })),
          (vals) => {
            beams.forEach((b, i) => { b.material.opacity = vals[`beam${i}`]; });
            renderer.markDirty();
          },
          () => { currentAnimation = null; done(); },
        );
      } else if (stepIndex === 2) {
        currentAnimation = playTimeline(
          [
            { property: 'red', from: 0, to: 1, delay: 0, duration: 400 },
            { property: 'scale', from: 1, to: 0.6, delay: 0, duration: 500 },
            { property: 'opacity', from: 1, to: 0.3, delay: 200, duration: 400 },
          ],
          (vals) => {
            const c = new THREE.Color(colors.accentWarm).lerp(new THREE.Color(colors.failure), vals.red);
            workers[0].material.color.copy(c);
            workers[0].material.emissive.copy(c);
            workers[0].material.transparent = true;
            workers[0].material.opacity = vals.opacity;
            workers[0].scale.setScalar(vals.scale);
            beams[0].material.color.copy(c);
            renderer.markDirty();
          },
          () => { currentAnimation = null; done(); },
        );
      } else if (stepIndex === 3) {
        notificationRing.visible = true;
        notificationRing.position.copy(WORKER_POSITIONS[0]);
        currentAnimation = playTimeline(
          [
            { property: 'ringY', from: WORKER_POSITIONS[0].y, to: OBSERVER_POS.y, delay: 0, duration: 800 },
            { property: 'ringX', from: WORKER_POSITIONS[0].x, to: OBSERVER_POS.x, delay: 0, duration: 800 },
            { property: 'ringOpacity', from: 0.9, to: 0, delay: 600, duration: 300 },
            { property: 'observerGlow', from: 0.4, to: 0.8, delay: 700, duration: 300 },
          ],
          (vals) => {
            notificationRing.position.set(vals.ringX, vals.ringY, 0);
            notificationRing.material.opacity = vals.ringOpacity;
            observer.material.emissiveIntensity = vals.observerGlow;
            renderer.markDirty();
          },
          () => {
            notificationRing.visible = false;
            currentAnimation = null;
            done();
          },
        );
      }
    },
  },
];

export const monitorsScene = {
  title: 'Monitors',
  slides: slideData.map((s) => ({ stepCount: s.stepCount })),

  init(stage) {
    renderer = createThreeRenderer();
    threeCtx = renderer.init(stage);
    threeCtx.scene.background = new THREE.Color(colors.bg);

    createObserver(threeCtx.scene);
    createWorkers(threeCtx.scene);
    createBeams(threeCtx.scene);
    createNotification(threeCtx.scene);

    return {};
  },

  destroy() {
    if (currentAnimation) { currentAnimation.resolve(); currentAnimation = null; }
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
    workers = [];
    beams = [];
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
