import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { createTrackedTimeline } from '../../animation/tracked-timeline.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
const tracker = createTrackedTimeline();
let loopId = null;

let gear1 = null;
let gear2 = null;
let stateCube = null;
let shell = null;
let shellCracks = null;
let stateLabel = null;

let orbitAngle = 0;
let gearSpeed = 0.015;
let crashed = false;
let jitterAmount = 0;

function createGears(scene) {
  const geo1 = new THREE.TorusGeometry(0.7, 0.12, 8, 24);
  gear1 = new THREE.Mesh(geo1, glowMaterial(0xffffff, { emissiveIntensity: 0.2 }));
  gear1.position.set(-0.3, 0.2, 0);
  gear1.rotation.x = Math.PI / 4;
  scene.add(gear1);

  const geo2 = new THREE.TorusGeometry(0.5, 0.1, 8, 20);
  gear2 = new THREE.Mesh(geo2, glowMaterial(0xffffff, { emissiveIntensity: 0.2 }));
  gear2.position.set(0.4, -0.2, 0.3);
  gear2.rotation.y = Math.PI / 3;
  scene.add(gear2);
}

function createStateCube(scene) {
  const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  stateCube = new THREE.Mesh(geo, glowMaterial(colors.accent, { emissiveIntensity: 0.5 }));
  stateCube.visible = false;
  scene.add(stateCube);
}

function createShell(scene) {
  const geo = new THREE.IcosahedronGeometry(1.6, 1);
  shell = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
    color: colors.accent,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  }));
  scene.add(shell);

  const crackGeo = new THREE.BufferGeometry();
  const crackVerts = [];
  for (let i = 0; i < 12; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = 1.55;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    crackVerts.push(x, y, z);
    crackVerts.push(x * 1.1, y * 1.1, z * 1.1);
  }
  crackGeo.setAttribute('position', new THREE.Float32BufferAttribute(crackVerts, 3));
  shellCracks = new THREE.LineSegments(crackGeo, new THREE.LineBasicMaterial({
    color: colors.failure,
    transparent: true,
    opacity: 0,
  }));
  scene.add(shellCracks);
}

function createLabel(scene) {
  stateLabel = createTextSprite('State', {
    fontSize: 40,
    color: colors.accent,
    bgColor: 'rgba(26, 26, 46, 0.8)',
    padding: 16,
  });
  stateLabel.position.set(0, 2.2, 0);
  stateLabel.visible = false;
  scene.add(stateLabel);
}

function startLoop() {
  function tick() {
    if (gear1 && gear2) {
      gear1.rotation.z += gearSpeed;
      gear2.rotation.z -= gearSpeed * 1.3;
    }
    if (stateCube && stateCube.visible && !crashed) {
      orbitAngle += 0.02;
      stateCube.position.set(
        Math.cos(orbitAngle) * 1.0,
        Math.sin(orbitAngle) * 0.6 + 0.1,
        Math.sin(orbitAngle) * 0.5,
      );
    }
    if (crashed && gear1 && gear2) {
      gear1.position.x = -0.3 + (Math.random() - 0.5) * jitterAmount;
      gear1.position.y = 0.2 + (Math.random() - 0.5) * jitterAmount;
      gear2.position.x = 0.4 + (Math.random() - 0.5) * jitterAmount;
      gear2.position.y = -0.2 + (Math.random() - 0.5) * jitterAmount;
    }
    renderer.markDirty();
    loopId = requestAnimationFrame(tick);
  }
  loopId = requestAnimationFrame(tick);
}

function stopLoop() {
  if (loopId) cancelAnimationFrame(loopId);
  loopId = null;
}

function resolveStep(step) {
  crashed = false;
  jitterAmount = 0;

  gear1.visible = true;
  gear2.visible = true;
  gear1.material.color.set(0xffffff);
  gear1.material.emissive.set(0xffffff);
  gear2.material.color.set(0xffffff);
  gear2.material.emissive.set(0xffffff);

  stateCube.visible = step >= 1;
  shell.material.opacity = step >= 2 ? 0.15 : 0;
  stateLabel.visible = step >= 2;
  shellCracks.material.opacity = 0;

  if (step >= 3) {
    crashed = true;
    jitterAmount = 0.08;
    gear1.material.color.set(colors.failure);
    gear1.material.emissive.set(colors.failure);
    gear2.material.color.set(colors.failure);
    gear2.material.emissive.set(colors.failure);
    shellCracks.material.opacity = 0.8;
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
        stateCube.visible = true;
        stateCube.material.opacity = 0;
        stateCube.material.transparent = true;
        tracker.playTimeline(
          [{ property: 'opacity', from: 0, to: 1, delay: 0, duration: 500 }],
          (vals) => {
            stateCube.material.opacity = vals.opacity;
            renderer.markDirty();
          },
          () => {
            stateCube.material.transparent = false;
            done();
          },
        );
      } else if (stepIndex === 2) {
        stateLabel.visible = true;
        tracker.playTimeline(
          [{ property: 'shellOpacity', from: 0, to: 0.15, delay: 0, duration: 800 }],
          (vals) => {
            shell.material.opacity = vals.shellOpacity;
            renderer.markDirty();
          },
          done,
        );
      } else if (stepIndex === 3) {
        crashed = true;
        tracker.playTimeline(
          [
            { property: 'jitter', from: 0, to: 0.08, delay: 0, duration: 300 },
            { property: 'red', from: 0, to: 1, delay: 0, duration: 500 },
            { property: 'cracks', from: 0, to: 0.8, delay: 200, duration: 400 },
          ],
          (vals) => {
            jitterAmount = vals.jitter;
            const c = new THREE.Color(0xffffff).lerp(new THREE.Color(colors.failure), vals.red);
            gear1.material.color.copy(c);
            gear1.material.emissive.copy(c);
            gear2.material.color.copy(c);
            gear2.material.emissive.copy(c);
            shellCracks.material.opacity = vals.cracks;
            renderer.markDirty();
          },
          done,
        );
      }
    },
  },
];

export const executionModelScene = {
  title: 'Execution Model',
  slides: slideData.map((s) => ({ stepCount: s.stepCount })),

  init(stage) {
    renderer = createThreeRenderer();
    threeCtx = renderer.init(stage);
    threeCtx.scene.background = new THREE.Color(colors.bg);

    createGears(threeCtx.scene);
    createStateCube(threeCtx.scene);
    createShell(threeCtx.scene);
    createLabel(threeCtx.scene);

    startLoop();
    return {};
  },

  destroy() {
    stopLoop();
    tracker.cancelAll();
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
    crashed = false;
    jitterAmount = 0;
  },

  resolveToSlide(ctx, slideIndex, stepIndex) {
    tracker.cancelAll();
    slideData[slideIndex].resolve(stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    tracker.cancelAll();
    slideData[slideIndex].animate(stepIndex, done);
  },
};
