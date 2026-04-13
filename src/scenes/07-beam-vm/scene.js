import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
let currentAnimation = null;
let loopId = null;

let vmBox = null;
let processSpheres = [];
let shelves = [];
let shelfLabels = [];
let lightColumns = [];

const SPHERE_COUNT = 12;
const BOX_SIZE = { x: 7, y: 3.5, z: 2 };
const BOX_CENTER = { x: 0, y: 1.2 };
const SHELF_Y_START = -1.8;
const SHELF_SPACING = 0.7;

const sphereDrifts = [];

function initSpherePositions() {
  sphereDrifts.length = 0;
  for (let i = 0; i < SPHERE_COUNT; i++) {
    sphereDrifts.push({
      vx: (Math.random() - 0.5) * 0.004,
      vy: (Math.random() - 0.5) * 0.003,
    });
  }
}

function updateDrift() {
  const halfX = BOX_SIZE.x / 2 - 0.3;
  const halfY = BOX_SIZE.y / 2 - 0.3;
  processSpheres.forEach((sphere, i) => {
    if (!sphere.visible) return;
    const d = sphereDrifts[i];
    sphere.position.x += d.vx;
    sphere.position.y += d.vy;
    if (Math.abs(sphere.position.x - BOX_CENTER.x) > halfX) d.vx *= -1;
    if (Math.abs(sphere.position.y - BOX_CENTER.y) > halfY) d.vy *= -1;
  });
}

function startLoop() {
  function tick() {
    updateDrift();
    renderer.markDirty();
    loopId = requestAnimationFrame(tick);
  }
  loopId = requestAnimationFrame(tick);
}

function stopLoop() {
  if (loopId) cancelAnimationFrame(loopId);
  loopId = null;
}

const SHELF_DEFS = [
  { label: 'Scheduler', color: colors.accentWarm },
  { label: 'OS Thread', color: colors.beam },
  { label: 'CPU Core', color: colors.accent },
];

function createVmBox(scene) {
  const geo = new THREE.BoxGeometry(BOX_SIZE.x, BOX_SIZE.y, BOX_SIZE.z);
  const edges = new THREE.EdgesGeometry(geo);
  vmBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
    color: colors.accent,
    transparent: true,
    opacity: 0,
  }));
  vmBox.position.set(BOX_CENTER.x, BOX_CENTER.y, 0);
  scene.add(vmBox);
}

function createSpheres(scene) {
  const geo = new THREE.SphereGeometry(0.15, 16, 12);
  processSpheres = [];
  initSpherePositions();
  for (let i = 0; i < SPHERE_COUNT; i++) {
    const mat = glowMaterial(colors.accentWarm, { emissiveIntensity: 0.5 });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.set(
      BOX_CENTER.x + (Math.random() - 0.5) * (BOX_SIZE.x - 1),
      BOX_CENTER.y + (Math.random() - 0.5) * (BOX_SIZE.y - 1),
      (Math.random() - 0.5) * (BOX_SIZE.z - 0.5),
    );
    sphere.visible = false;
    scene.add(sphere);
    processSpheres.push(sphere);
  }
}

function createShelves(scene) {
  shelves = [];
  shelfLabels = [];
  SHELF_DEFS.forEach((def, i) => {
    const y = SHELF_Y_START - i * SHELF_SPACING;
    const geo = new THREE.BoxGeometry(6.5, 0.15, 0.5);
    const mat = new THREE.MeshPhongMaterial({
      color: def.color,
      transparent: true,
      opacity: 0,
    });
    const shelf = new THREE.Mesh(geo, mat);
    shelf.position.set(0.5, y, 0);
    scene.add(shelf);
    shelves.push(shelf);

    const label = createTextSprite(def.label, { fontSize: 36, color: def.color });
    label.position.set(-4.2, y, 0);
    label.material.opacity = 0;
    scene.add(label);
    shelfLabels.push(label);
  });
}

function createLightColumns(scene) {
  lightColumns = [];
  const xPositions = [-2.5, -1.2, 0, 1.2, 2.5, 3.5];
  const geo = new THREE.CylinderGeometry(0.02, 0.02, 5, 4);
  xPositions.forEach((x) => {
    const mat = new THREE.MeshBasicMaterial({
      color: colors.accent,
      transparent: true,
      opacity: 0,
    });
    const col = new THREE.Mesh(geo, mat);
    col.position.set(x, -0.5, 0);
    scene.add(col);
    lightColumns.push(col);
  });
}

function resolveStep(step) {
  vmBox.material.opacity = step >= 0 ? 0.35 : 0;
  processSpheres.forEach((s) => { s.visible = step >= 1; });
  shelves.forEach((s) => { s.material.opacity = step >= 2 ? 0.6 : 0; });
  shelfLabels.forEach((l) => { l.material.opacity = step >= 2 ? 0.9 : 0; });
  lightColumns.forEach((c) => { c.material.opacity = step >= 3 ? 0.15 : 0; });
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
        currentAnimation = playTimeline(
          [{ property: 'opacity', from: 0, to: 0.35, delay: 0, duration: 600 }],
          (vals) => { vmBox.material.opacity = vals.opacity; renderer.markDirty(); },
          () => { currentAnimation = null; done(); },
        );
      } else if (stepIndex === 1) {
        let shown = 0;
        function showNext() {
          if (shown < SPHERE_COUNT) {
            processSpheres[shown].visible = true;
            shown++;
            renderer.markDirty();
            setTimeout(showNext, 60);
          } else {
            done();
          }
        }
        showNext();
      } else if (stepIndex === 2) {
        currentAnimation = playTimeline(
          [
            ...shelves.flatMap((s, i) => [
              { property: `shelf${i}`, from: 0, to: 0.6, delay: i * 200, duration: 400 },
            ]),
            ...shelfLabels.flatMap((l, i) => [
              { property: `label${i}`, from: 0, to: 0.9, delay: i * 200, duration: 400 },
            ]),
          ],
          (vals) => {
            shelves.forEach((s, i) => { s.material.opacity = vals[`shelf${i}`]; });
            shelfLabels.forEach((l, i) => { l.material.opacity = vals[`label${i}`]; });
            renderer.markDirty();
          },
          () => { currentAnimation = null; done(); },
        );
      } else if (stepIndex === 3) {
        currentAnimation = playTimeline(
          lightColumns.map((c, i) => ({
            property: `col${i}`, from: 0, to: 0.15, delay: i * 80, duration: 400,
          })),
          (vals) => {
            lightColumns.forEach((c, i) => { c.material.opacity = vals[`col${i}`]; });
            renderer.markDirty();
          },
          () => { currentAnimation = null; done(); },
        );
      }
    },
  },
];

export const beamVmScene = {
  title: 'The BEAM VM',
  slides: slideData.map((s) => ({ stepCount: s.stepCount })),

  init(stage) {
    renderer = createThreeRenderer();
    threeCtx = renderer.init(stage);
    threeCtx.scene.background = new THREE.Color(colors.bg);
    createVmBox(threeCtx.scene);
    createSpheres(threeCtx.scene);
    createShelves(threeCtx.scene);
    createLightColumns(threeCtx.scene);
    startLoop();
    return {};
  },

  destroy() {
    stopLoop();
    if (currentAnimation) { currentAnimation.resolve(); currentAnimation = null; }
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
    vmBox = null;
    processSpheres = [];
    shelves = [];
    shelfLabels = [];
    lightColumns = [];
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
