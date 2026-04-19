import * as THREE from 'three';
import { createThreeScene } from '../../three-scenes/scene-factory.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial } from '../scene-helpers.js';

const SPHERE_COUNT = 12;
const BOX_SIZE = { x: 7, y: 3.5, z: 2 };
const BOX_CENTER = { x: 0, y: 1.2 };
const SHELF_Y_START = -1.8;
const SHELF_SPACING = 0.7;

const SHELF_DEFS = [
  { label: 'Scheduler', color: colors.accentWarm },
  { label: 'OS Thread', color: colors.beam },
  { label: 'CPU Core', color: colors.accent },
];

function createVmBox(scene) {
  const geo = new THREE.BoxGeometry(BOX_SIZE.x, BOX_SIZE.y, BOX_SIZE.z);
  const edges = new THREE.EdgesGeometry(geo);
  const box = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
    color: colors.accent,
    transparent: true,
    opacity: 0,
  }));
  box.position.set(BOX_CENTER.x, BOX_CENTER.y, 0);
  scene.add(box);
  return box;
}

function createSpheres(scene) {
  const geo = new THREE.SphereGeometry(0.15, 16, 12);
  const spheres = [];
  const drifts = [];
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
    spheres.push(sphere);
    drifts.push({
      vx: (Math.random() - 0.5) * 0.004,
      vy: (Math.random() - 0.5) * 0.003,
    });
  }
  return { spheres, drifts };
}

function createShelves(scene) {
  const shelves = [];
  const shelfLabels = [];
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
  return { shelves, shelfLabels };
}

function createLightColumns(scene) {
  const lightColumns = [];
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
  return lightColumns;
}

function driftSpheres(objects) {
  const halfX = BOX_SIZE.x / 2 - 0.3;
  const halfY = BOX_SIZE.y / 2 - 0.3;
  objects.spheres.forEach((sphere, i) => {
    if (!sphere.visible) return;
    const d = objects.drifts[i];
    sphere.position.x += d.vx;
    sphere.position.y += d.vy;
    if (Math.abs(sphere.position.x - BOX_CENTER.x) > halfX) d.vx *= -1;
    if (Math.abs(sphere.position.y - BOX_CENTER.y) > halfY) d.vy *= -1;
  });
}

function applyStep({ vmBox, spheres, shelves, shelfLabels, lightColumns }, step) {
  vmBox.material.opacity = step >= 0 ? 0.35 : 0;
  spheres.forEach((s) => { s.visible = step >= 1; });
  shelves.forEach((s) => { s.material.opacity = step >= 2 ? 0.6 : 0; });
  shelfLabels.forEach((l) => { l.material.opacity = step >= 2 ? 0.9 : 0; });
  lightColumns.forEach((c) => { c.material.opacity = step >= 3 ? 0.15 : 0; });
}

export const beamVmScene = createThreeScene({
  title: 'The BEAM VM',
  slides: [{ stepCount: 4 }],
  background: colors.bg,

  setup({ scene }) {
    const vmBox = createVmBox(scene);
    const { spheres, drifts } = createSpheres(scene);
    const { shelves, shelfLabels } = createShelves(scene);
    const lightColumns = createLightColumns(scene);
    return { vmBox, spheres, drifts, shelves, shelfLabels, lightColumns };
  },

  onTick(objects) {
    driftSpheres(objects);
  },

  resolveStep(objects, { stepIndex }) {
    applyStep(objects, stepIndex);
  },

  animateStep(objects, { stepIndex, playTimeline, setTimeout: later, markDirty, done }) {
    const { vmBox, spheres, shelves, shelfLabels, lightColumns } = objects;

    if (stepIndex === 0) {
      playTimeline(
        [{ property: 'opacity', from: 0, to: 0.35, delay: 0, duration: 600 }],
        (vals) => { vmBox.material.opacity = vals.opacity; markDirty(); },
        done,
      );
    } else if (stepIndex === 1) {
      let shown = 0;
      function showNext() {
        if (shown < SPHERE_COUNT) {
          spheres[shown].visible = true;
          shown++;
          markDirty();
          later(showNext, 60);
        } else {
          done();
        }
      }
      showNext();
    } else if (stepIndex === 2) {
      playTimeline(
        [
          ...shelves.map((_, i) => ({
            property: `shelf${i}`, from: 0, to: 0.6, delay: i * 200, duration: 400,
          })),
          ...shelfLabels.map((_, i) => ({
            property: `label${i}`, from: 0, to: 0.9, delay: i * 200, duration: 400,
          })),
        ],
        (vals) => {
          shelves.forEach((s, i) => { s.material.opacity = vals[`shelf${i}`]; });
          shelfLabels.forEach((l, i) => { l.material.opacity = vals[`label${i}`]; });
          markDirty();
        },
        done,
      );
    } else if (stepIndex === 3) {
      playTimeline(
        lightColumns.map((_, i) => ({
          property: `col${i}`, from: 0, to: 0.15, delay: i * 80, duration: 400,
        })),
        (vals) => {
          lightColumns.forEach((c, i) => { c.material.opacity = vals[`col${i}`]; });
          markDirty();
        },
        done,
      );
    } else {
      done();
    }
  },
});
