import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
let currentAnimation = null;

let supervisor = null;
let workers = [];
let supportBeams = [];
let workerLinks = [];
let titleLabel = null;

const SUP_POS = new THREE.Vector3(0, 2.5, 0);
const WORKER_POSITIONS = [
  new THREE.Vector3(-2, -0.5, 0),
  new THREE.Vector3(0, -0.5, 0),
  new THREE.Vector3(2, -0.5, 0),
];

function createSupervisor(scene) {
  const geo = new THREE.CylinderGeometry(0.6, 0.6, 0.12, 6);
  supervisor = new THREE.Mesh(geo, glowMaterial(0xff7799, { emissiveIntensity: 0.4 }));
  supervisor.position.copy(SUP_POS);
  scene.add(supervisor);

  titleLabel = createTextSprite('Supervisor', { fontSize: 36, color: colors.textMuted });
  titleLabel.position.set(0, 3.8, 0);
  scene.add(titleLabel);
}

function createWorkerGroup(scene) {
  workers = [];
  supportBeams = [];
  workerLinks = [];
  const geo = new THREE.SphereGeometry(0.3, 16, 12);

  WORKER_POSITIONS.forEach((pos) => {
    const mat = glowMaterial(colors.accentWarm, { emissiveIntensity: 0.3, transparent: true, opacity: 1 });
    const worker = new THREE.Mesh(geo.clone(), mat);
    worker.position.copy(pos);
    scene.add(worker);
    workers.push(worker);

    const dir = new THREE.Vector3().subVectors(pos, SUP_POS);
    const length = dir.length();
    const beamGeo = new THREE.CylinderGeometry(0.02, 0.02, length, 4);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff7799,
      transparent: true,
      opacity: 0.5,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    const mid = new THREE.Vector3().addVectors(SUP_POS, pos).multiplyScalar(0.5);
    beam.position.copy(mid);
    beam.lookAt(pos);
    beam.rotateX(Math.PI / 2);
    scene.add(beam);
    supportBeams.push(beam);
  });

  for (let i = 0; i < WORKER_POSITIONS.length - 1; i++) {
    const from = WORKER_POSITIONS[i];
    const to = WORKER_POSITIONS[i + 1];
    const dir = new THREE.Vector3().subVectors(to, from);
    const length = dir.length();
    const linkGeo = new THREE.CylinderGeometry(0.015, 0.015, length, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: colors.accentWarm,
      transparent: true,
      opacity: 0.4,
    });
    const link = new THREE.Mesh(linkGeo, mat);
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    link.position.copy(mid);
    link.rotation.z = Math.PI / 2;
    scene.add(link);
    workerLinks.push(link);
  }
}

function setWorkersVisible(visible, opacity = 1) {
  workers.forEach((w) => {
    w.visible = visible;
    w.material.opacity = opacity;
    w.material.color.set(colors.accentWarm);
    w.material.emissive.set(colors.accentWarm);
    w.scale.set(1, 1, 1);
  });
  supportBeams.forEach((b) => {
    b.visible = visible;
    b.material.opacity = visible ? 0.5 : 0;
  });
  workerLinks.forEach((l) => {
    l.visible = visible;
    l.material.opacity = visible ? 0.4 : 0;
  });
}

function resolveStep(step) {
  supervisor.material.emissiveIntensity = 0.4;

  if (step === 0) {
    setWorkersVisible(true);
  } else if (step === 1) {
    setWorkersVisible(true);
    workers[1].material.color.set(colors.failure);
    workers[1].material.emissive.set(colors.failure);
    workers[1].scale.setScalar(0.5);
    workers[1].material.opacity = 0.4;
  } else if (step === 2) {
    setWorkersVisible(false, 0);
    supervisor.material.emissiveIntensity = 0.8;
  } else if (step === 3) {
    setWorkersVisible(true, 0.5);
    workers.forEach((w) => w.scale.setScalar(0.3));
    supportBeams.forEach((b) => { b.material.opacity = 0.2; });
    workerLinks.forEach((l) => { l.material.opacity = 0.1; });
  } else if (step === 4) {
    setWorkersVisible(true);
  }

  renderer.markDirty();
}

const slideData = [
  {
    stepCount: 5,
    resolve(stepIndex) {
      resolveStep(stepIndex);
    },
    animate(stepIndex, done) {
      if (stepIndex === 0) {
        resolveStep(0);
        done();
      } else if (stepIndex === 1) {
        currentAnimation = playTimeline(
          [
            { property: 'red', from: 0, to: 1, delay: 0, duration: 300 },
            { property: 'scale', from: 1, to: 0.5, delay: 100, duration: 400 },
            { property: 'opacity', from: 1, to: 0.4, delay: 200, duration: 300 },
          ],
          (vals) => {
            const c = new THREE.Color(colors.accentWarm).lerp(new THREE.Color(colors.failure), vals.red);
            workers[1].material.color.copy(c);
            workers[1].material.emissive.copy(c);
            workers[1].scale.setScalar(vals.scale);
            workers[1].material.opacity = vals.opacity;
            renderer.markDirty();
          },
          () => { currentAnimation = null; done(); },
        );
      } else if (stepIndex === 2) {
        currentAnimation = playTimeline(
          [
            { property: 'supGlow', from: 0.4, to: 0.8, delay: 0, duration: 200 },
            { property: 'allOpacity', from: 1, to: 0, delay: 100, duration: 600 },
            { property: 'beamOpacity', from: 0.5, to: 0, delay: 100, duration: 500 },
            { property: 'linkOpacity', from: 0.4, to: 0, delay: 100, duration: 500 },
          ],
          (vals) => {
            supervisor.material.emissiveIntensity = vals.supGlow;
            workers.forEach((w) => { w.material.opacity = vals.allOpacity; });
            supportBeams.forEach((b) => { b.material.opacity = vals.beamOpacity; });
            workerLinks.forEach((l) => { l.material.opacity = vals.linkOpacity; });
            renderer.markDirty();
          },
          () => {
            workers.forEach((w) => { w.visible = false; });
            supportBeams.forEach((b) => { b.visible = false; });
            workerLinks.forEach((l) => { l.visible = false; });
            currentAnimation = null;
            done();
          },
        );
      } else if (stepIndex === 3) {
        workers.forEach((w) => {
          w.visible = true;
          w.material.color.set(colors.accentWarm);
          w.material.emissive.set(colors.accentWarm);
          w.scale.setScalar(0.05);
          w.material.opacity = 0.3;
        });
        supportBeams.forEach((b) => { b.visible = true; });
        workerLinks.forEach((l) => { l.visible = true; });

        currentAnimation = playTimeline(
          [
            { property: 'scale', from: 0.05, to: 0.3, delay: 0, duration: 800 },
            { property: 'opacity', from: 0.3, to: 0.5, delay: 0, duration: 800 },
            { property: 'beamOpacity', from: 0, to: 0.2, delay: 300, duration: 500 },
            { property: 'linkOpacity', from: 0, to: 0.1, delay: 300, duration: 500 },
          ],
          (vals) => {
            workers.forEach((w) => {
              w.scale.setScalar(vals.scale);
              w.material.opacity = vals.opacity;
            });
            supportBeams.forEach((b) => { b.material.opacity = vals.beamOpacity; });
            workerLinks.forEach((l) => { l.material.opacity = vals.linkOpacity; });
            renderer.markDirty();
          },
          () => { currentAnimation = null; done(); },
        );
      } else if (stepIndex === 4) {
        currentAnimation = playTimeline(
          [
            { property: 'scale', from: 0.3, to: 1, delay: 0, duration: 600 },
            { property: 'opacity', from: 0.5, to: 1, delay: 0, duration: 600 },
            { property: 'beamOpacity', from: 0.2, to: 0.5, delay: 0, duration: 500 },
            { property: 'linkOpacity', from: 0.1, to: 0.4, delay: 0, duration: 500 },
            { property: 'supGlow', from: 0.8, to: 0.4, delay: 0, duration: 400 },
          ],
          (vals) => {
            workers.forEach((w) => {
              w.scale.setScalar(vals.scale);
              w.material.opacity = vals.opacity;
            });
            supportBeams.forEach((b) => { b.material.opacity = vals.beamOpacity; });
            workerLinks.forEach((l) => { l.material.opacity = vals.linkOpacity; });
            supervisor.material.emissiveIntensity = vals.supGlow;
            renderer.markDirty();
          },
          () => { currentAnimation = null; done(); },
        );
      }
    },
  },
];

export const supervisorsScene = {
  title: 'Supervisors',
  slides: slideData.map((s) => ({ stepCount: s.stepCount })),

  init(stage) {
    renderer = createThreeRenderer();
    threeCtx = renderer.init(stage);
    threeCtx.scene.background = new THREE.Color(colors.bg);

    createSupervisor(threeCtx.scene);
    createWorkerGroup(threeCtx.scene);

    return {};
  },

  destroy() {
    if (currentAnimation) { currentAnimation.resolve(); currentAnimation = null; }
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
    workers = [];
    supportBeams = [];
    workerLinks = [];
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
