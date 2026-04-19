import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';
import { glowMaterial, wireframeMaterial } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
let currentAnimation = null;
let loopId = null;

let sphere1 = null;
let sphere2 = null;
let tether = null;
let tetherParticles = [];
let shockwave = null;
let husk1 = null;
let husk2 = null;

const S1_POS = new THREE.Vector3(-2, 0, 0);
const S2_POS = new THREE.Vector3(2, 0, 0);
const PARTICLE_COUNT = 8;

let particlePhases = [];
let tetherVisible = false;

function createSpheres(scene) {
  const geo = new THREE.SphereGeometry(0.4, 20, 16);
  sphere1 = new THREE.Mesh(geo, glowMaterial(colors.accentWarm, { emissiveIntensity: 0.4 }));
  sphere1.position.copy(S1_POS);
  scene.add(sphere1);

  sphere2 = new THREE.Mesh(geo.clone(), glowMaterial(colors.accentWarm, { emissiveIntensity: 0.4 }));
  sphere2.position.copy(S2_POS);
  scene.add(sphere2);

  husk1 = new THREE.Mesh(geo.clone(), wireframeMaterial(colors.failure));
  husk1.position.copy(S1_POS);
  husk1.visible = false;
  scene.add(husk1);

  husk2 = new THREE.Mesh(geo.clone(), wireframeMaterial(colors.failure));
  husk2.position.copy(S2_POS);
  husk2.visible = false;
  scene.add(husk2);
}

function createTether(scene) {
  const geo = new THREE.CylinderGeometry(0.03, 0.03, 4, 4);
  tether = new THREE.Mesh(geo, glowMaterial(colors.accentWarm, {
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0,
  }));
  tether.rotation.z = Math.PI / 2;
  tether.position.set(0, 0, 0);
  scene.add(tether);

  const pGeo = new THREE.SphereGeometry(0.06, 6, 4);
  particlePhases = [];
  tetherParticles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const mat = glowMaterial(colors.accentWarm, { emissiveIntensity: 0.6, transparent: true, opacity: 0 });
    const p = new THREE.Mesh(pGeo, mat);
    p.visible = false;
    scene.add(p);
    tetherParticles.push(p);
    particlePhases.push(i / PARTICLE_COUNT);
  }
}

function createShockwave(scene) {
  const geo = new THREE.SphereGeometry(0.3, 12, 8);
  shockwave = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: colors.failure,
    transparent: true,
    opacity: 0,
  }));
  shockwave.visible = false;
  scene.add(shockwave);
}

function startLoop() {
  function tick() {
    if (tetherVisible) {
      tetherParticles.forEach((p, i) => {
        particlePhases[i] = (particlePhases[i] + 0.008) % 1;
        const t = particlePhases[i];
        const dir = i % 2 === 0 ? 1 : -1;
        const tt = dir === 1 ? t : 1 - t;
        p.position.lerpVectors(S1_POS, S2_POS, tt);
        p.position.y += Math.sin(t * Math.PI) * 0.15;
      });
      renderer.markDirty();
    }
    loopId = requestAnimationFrame(tick);
  }
  loopId = requestAnimationFrame(tick);
}

function stopLoop() {
  if (loopId) cancelAnimationFrame(loopId);
  loopId = null;
}

function resolveStep(step) {
  sphere1.visible = step < 2;
  sphere2.visible = step < 3;
  sphere1.scale.set(1, 1, 1);
  sphere2.scale.set(1, 1, 1);
  sphere1.material.color.set(colors.accentWarm);
  sphere1.material.emissive.set(colors.accentWarm);

  tether.material.opacity = step >= 1 && step < 3 ? 0.6 : 0;
  tetherVisible = step >= 1 && step < 3;
  tetherParticles.forEach((p) => {
    p.visible = step >= 1 && step < 3;
    p.material.opacity = step >= 1 && step < 3 ? 0.8 : 0;
  });

  if (step >= 2) {
    sphere1.visible = false;
    husk1.visible = true;
  } else {
    husk1.visible = false;
  }

  if (step >= 3) {
    sphere2.visible = false;
    husk2.visible = true;
    tether.material.opacity = 0;
    tetherVisible = false;
    tetherParticles.forEach((p) => { p.visible = false; });
  } else {
    husk2.visible = false;
  }

  shockwave.visible = false;
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
        tetherVisible = true;
        tetherParticles.forEach((p) => { p.visible = true; });
        currentAnimation = playTimeline(
          [
            { property: 'tetherOpacity', from: 0, to: 0.6, delay: 0, duration: 500 },
            { property: 'particleOpacity', from: 0, to: 0.8, delay: 200, duration: 400 },
          ],
          (vals) => {
            tether.material.opacity = vals.tetherOpacity;
            tetherParticles.forEach((p) => { p.material.opacity = vals.particleOpacity; });
            renderer.markDirty();
          },
          () => { currentAnimation = null; done(); },
        );
      } else if (stepIndex === 2) {
        currentAnimation = playTimeline(
          [
            { property: 'red', from: 0, to: 1, delay: 0, duration: 300 },
            { property: 'scale', from: 1, to: 0, delay: 200, duration: 400 },
          ],
          (vals) => {
            const c = new THREE.Color(colors.accentWarm).lerp(new THREE.Color(colors.failure), vals.red);
            sphere1.material.color.copy(c);
            sphere1.material.emissive.copy(c);
            sphere1.scale.setScalar(Math.max(0.01, vals.scale));
            renderer.markDirty();
          },
          () => {
            sphere1.visible = false;
            husk1.visible = true;
            currentAnimation = null;
            done();
          },
        );
      } else if (stepIndex === 3) {
        shockwave.visible = true;
        shockwave.position.copy(S1_POS);
        currentAnimation = playTimeline(
          [
            { property: 'shockX', from: S1_POS.x, to: S2_POS.x, delay: 0, duration: 600 },
            { property: 'shockOpacity', from: 0.8, to: 0, delay: 400, duration: 300 },
            { property: 'shockScale', from: 0.3, to: 1.0, delay: 0, duration: 600 },
            { property: 's2Scale', from: 1, to: 0, delay: 500, duration: 300 },
            { property: 'tetherFade', from: 0.6, to: 0, delay: 400, duration: 300 },
          ],
          (vals) => {
            shockwave.position.x = vals.shockX;
            shockwave.material.opacity = vals.shockOpacity;
            shockwave.scale.setScalar(vals.shockScale);
            sphere2.scale.setScalar(Math.max(0.01, vals.s2Scale));
            tether.material.opacity = vals.tetherFade;
            tetherParticles.forEach((p) => { p.material.opacity = vals.tetherFade; });
            renderer.markDirty();
          },
          () => {
            sphere2.visible = false;
            husk2.visible = true;
            shockwave.visible = false;
            tetherVisible = false;
            tetherParticles.forEach((p) => { p.visible = false; });
            currentAnimation = null;
            done();
          },
        );
      }
    },
  },
];

export const linksScene = {
  title: 'Links',
  slides: slideData.map((s) => ({ stepCount: s.stepCount })),

  init(stage) {
    renderer = createThreeRenderer();
    threeCtx = renderer.init(stage);
    threeCtx.scene.background = new THREE.Color(colors.bg);

    createSpheres(threeCtx.scene);
    createTether(threeCtx.scene);
    createShockwave(threeCtx.scene);

    startLoop();
    return {};
  },

  destroy() {
    stopLoop();
    if (currentAnimation) { currentAnimation.resolve(); currentAnimation = null; }
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
    tetherVisible = false;
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
