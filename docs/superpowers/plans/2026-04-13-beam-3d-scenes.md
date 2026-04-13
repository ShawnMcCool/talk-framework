# BEAM 3D Scenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 7 Three.js scenes that visually explain BEAM/Erlang concepts through smooth 3D animations, replacing the existing demo scenes.

**Architecture:** Each scene is a self-contained module in `src/scenes/{nn}-{name}/scene.js` following the existing scene contract. Scenes use `createThreeRenderer()` for 3D setup, `playTimeline()` for step transitions, and optional continuous rAF loops for ambient animation (particles, rotation). A shared `scene-helpers.js` module provides common utilities (text sprites, easing, particle systems).

**Tech Stack:** Three.js (0.170), vanilla JS, Vite, node:test

**Spec:** `docs/superpowers/specs/2026-04-13-beam-3d-scenes-design.md`

---

### Task 1: Scene Helpers + Color Palette Extension

**Files:**
- Create: `src/scenes/scene-helpers.js`
- Modify: `src/shared/colors.js`

Shared utilities used across multiple scenes: text sprite creation, easing functions, and common geometry builders.

- [ ] **Step 1: Add new colors to palette**

In `src/shared/colors.js`, add two entries to the `colors` object after the `beam` entry:

```js
green: '#44dd88',
purple: '#aa77ff',
```

- [ ] **Step 2: Create scene-helpers.js with text sprite utility**

Create `src/scenes/scene-helpers.js`:

```js
import * as THREE from 'three';

/**
 * Create a text sprite that always faces camera.
 * Returns a THREE.Sprite with a canvas-rendered label.
 */
export function createTextSprite(text, {
  fontSize = 48,
  color = '#e8e8f8',
  bgColor = null,
  padding = 12,
} = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${fontSize}px sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;

  canvas.width = textWidth + padding * 2;
  canvas.height = fontSize + padding * 2;

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
    ctx.fill();
  }

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);

  // Scale so sprite is roughly proportional in world units
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(aspect * 0.6, 0.6, 1);

  return sprite;
}

/**
 * Easing: cubic ease-in-out.
 * For use with manual animation loops (not playTimeline).
 */
export function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Create a simple glow material (emissive MeshPhongMaterial).
 */
export function glowMaterial(color, { emissiveIntensity = 0.4, opacity = 1.0, transparent = false } = {}) {
  return new THREE.MeshPhongMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    opacity,
    transparent,
  });
}

/**
 * Create a wireframe material.
 */
export function wireframeMaterial(color, { opacity = 0.4 } = {}) {
  return new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity,
  });
}

/**
 * Dispose all children of a THREE.Object3D (geometries + materials).
 */
export function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (obj.material.map) obj.material.map.dispose();
      obj.material.dispose();
    }
  });
}
```

- [ ] **Step 3: Run existing tests to verify nothing broken**

Run: `./test`
Expected: All tests pass (timeline, engine, palette).

- [ ] **Step 4: Commit**

```
git add src/shared/colors.js src/scenes/scene-helpers.js
git commit -m "feat: add scene helpers and extend color palette"
```

---

### Task 2: Scene 07 — The BEAM VM

**Files:**
- Create: `src/scenes/07-beam-vm/scene.js`

A transparent containment box with drifting luminous spheres (processes), and layered infrastructure shelves below (schedulers, threads, cores).

- [ ] **Step 1: Create the scene file with structure**

Create `src/scenes/07-beam-vm/scene.js`:

```js
import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial, disposeGroup } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
let currentAnimation = null;
let loopId = null;

// Scene objects
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

// Each sphere gets a random drift velocity
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
    // Bounce off walls
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

// Shelf definitions: label, color
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
    // Scatter inside box bounds
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
    // Shelf bar
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

    // Label
    const label = createTextSprite(def.label, { fontSize: 36, color: def.color });
    label.position.set(-4.2, y, 0);
    label.material.opacity = 0;
    scene.add(label);
    shelfLabels.push(label);
  });
}

function createLightColumns(scene) {
  lightColumns = [];
  // Create 6 thin columns connecting sphere clusters through shelves
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

// Slide resolve functions for each step
function resolveStep(step) {
  // Step 0: Box visible
  vmBox.material.opacity = step >= 0 ? 0.35 : 0;

  // Step 1: Spheres visible and drifting
  processSpheres.forEach((s) => {
    s.visible = step >= 1;
  });

  // Step 2: Shelves visible
  shelves.forEach((s) => {
    s.material.opacity = step >= 2 ? 0.6 : 0;
  });
  shelfLabels.forEach((l) => {
    l.material.opacity = step >= 2 ? 0.9 : 0;
  });

  // Step 3: Light columns visible
  lightColumns.forEach((c) => {
    c.material.opacity = step >= 3 ? 0.15 : 0;
  });

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
        // Fade in box
        currentAnimation = playTimeline(
          [{ property: 'opacity', from: 0, to: 0.35, delay: 0, duration: 600 }],
          (vals) => {
            vmBox.material.opacity = vals.opacity;
            renderer.markDirty();
          },
          () => { currentAnimation = null; done(); },
        );
      } else if (stepIndex === 1) {
        // Show spheres one by one
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
        // Fade in shelves sequentially
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
        // Fade in light columns
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
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
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
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].resolve(stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].animate(stepIndex, done);
  },
};
```

- [ ] **Step 2: Verify scene loads in browser**

Run: `./dev`
Open: http://localhost:3000

The scene won't be registered yet, but the file should import without errors. We'll register it in Task 9.

- [ ] **Step 3: Commit**

```
git add src/scenes/07-beam-vm/scene.js
git commit -m "feat: add BEAM VM scene (07)"
```

---

### Task 3: Scene 08 — Process Messaging

**Files:**
- Create: `src/scenes/08-process-messaging/scene.js`

Two process cubes with PID labels. Glowing particles arc from sender to receiver's mailbox cylinder. Messages accumulate as rings.

- [ ] **Step 1: Create the scene file**

Create `src/scenes/08-process-messaging/scene.js`:

```js
import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial, disposeGroup } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
let currentAnimation = null;

// Objects
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

/**
 * Cubic bezier point for arc path.
 * Control points go upward for a nice arc.
 */
function arcPosition(t, from, to) {
  const mid = new THREE.Vector3().lerpVectors(from, to, 0.5);
  mid.y += 2.0; // arc height
  // Quadratic bezier: (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
  const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * mid.x + t * t * to.x;
  const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * mid.y + t * t * to.y;
  const z = 0;
  return { x, y, z };
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
  // Step 0: Two cubes + labels visible
  senderCube.visible = true;
  receiverCube.visible = true;
  senderLabel.visible = true;
  receiverLabel.visible = true;
  particle.visible = false;

  // Step 1: Particle has arrived (hide it, it's done)
  // Step 2: Mailbox visible with 1 ring
  mailboxCylinder.material.opacity = step >= 2 ? 0.2 : 0;
  messageRings[0].visible = step >= 2;
  messageRings[0].material.opacity = step >= 2 ? 1 : 0;

  // Step 3: 3 rings visible
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
        // Cubes are already visible from init resolve
        resolveStep(0);
        done();
      } else if (stepIndex === 1) {
        // Animate particle arc from sender to receiver
        currentAnimation = animateParticleArc(SENDER_POS, RECEIVER_POS, () => {
          currentAnimation = null;
          done();
        });
      } else if (stepIndex === 2) {
        // Show mailbox, animate first ring appearing
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
        // Animate 2 more rings appearing with particle arcs
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
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
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
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].resolve(stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].animate(stepIndex, done);
  },
};
```

- [ ] **Step 2: Commit**

```
git add src/scenes/08-process-messaging/scene.js
git commit -m "feat: add Process Messaging scene (08)"
```

---

### Task 4: Scene 09 — Mailbox & Execution Loop

**Files:**
- Create: `src/scenes/09-mailbox-execution/scene.js`

Two transparent columns. Messages dequeue from mailbox to execution, descend through processing, dissolve. Process sleeps when empty.

- [ ] **Step 1: Create the scene file**

Create `src/scenes/09-mailbox-execution/scene.js`:

```js
import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
let currentAnimation = null;
let sleepLoopId = null;

// Layout
const MAILBOX_X = -1.8;
const EXEC_X = 1.8;
const COL_WIDTH = 2.5;
const COL_HEIGHT = 4;
const COL_Y = 0;
const MSG_HEIGHT = 0.3;
const MSG_WIDTH = 1.8;
const MSG_START_Y = 1.2;
const MSG_SPACING = 0.5;

// Objects
let mailboxFrame = null;
let execFrame = null;
let mailboxLabel = null;
let execLabel = null;
let messages = []; // { mesh, inMailbox: bool }
let sleepText = null;

function createColumn(scene, x, label, color) {
  const geo = new THREE.BoxGeometry(COL_WIDTH, COL_HEIGHT, 0.5);
  const edges = new THREE.EdgesGeometry(geo);
  const frame = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.3,
  }));
  frame.position.set(x, COL_Y, 0);
  scene.add(frame);

  // Dark fill
  const fillGeo = new THREE.BoxGeometry(COL_WIDTH - 0.05, COL_HEIGHT - 0.05, 0.4);
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshPhongMaterial({
    color: colors.bgDark,
    transparent: true,
    opacity: 0.7,
  }));
  fill.position.set(x, COL_Y, -0.05);
  scene.add(fill);

  const sprite = createTextSprite(label, { fontSize: 36, color });
  sprite.position.set(x, COL_Y + COL_HEIGHT / 2 + 0.5, 0);
  scene.add(sprite);

  return { frame, sprite };
}

function createMessages(scene) {
  messages = [];
  const geo = new THREE.BoxGeometry(MSG_WIDTH, MSG_HEIGHT, 0.3);
  for (let i = 0; i < 3; i++) {
    const mat = glowMaterial(colors.accentWarm, { emissiveIntensity: 0.3, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(MAILBOX_X, MSG_START_Y - i * MSG_SPACING, 0);
    mesh.visible = false;
    scene.add(mesh);
    messages.push(mesh);
  }
}

function createSleepText(scene) {
  sleepText = createTextSprite('ZZZzzz...', { fontSize: 32, color: colors.textMuted });
  sleepText.position.set(EXEC_X, COL_Y, 0.2);
  sleepText.visible = false;
  scene.add(sleepText);
}

// Resolve to a specific step (0-7)
function resolveStep(step) {
  stopSleepPulse();

  // Messages: 3 in mailbox at step 0
  // Steps 1-2: first message moves to exec and dissolves
  // Steps 3-4: second message
  // Steps 5-6: third message
  // Step 7: empty, sleeping

  const msgStates = [
    // [msg0, msg1, msg2] - 'mailbox' | 'exec' | 'gone'
    ['mailbox', 'mailbox', 'mailbox'], // step 0
    ['exec', 'mailbox', 'mailbox'],    // step 1
    ['gone', 'mailbox', 'mailbox'],    // step 2
    ['gone', 'exec', 'mailbox'],       // step 3
    ['gone', 'gone', 'mailbox'],       // step 4
    ['gone', 'gone', 'exec'],          // step 5
    ['gone', 'gone', 'gone'],          // step 6
    ['gone', 'gone', 'gone'],          // step 7
  ];

  const states = msgStates[step] || msgStates[0];
  let mailboxSlot = 0;
  states.forEach((state, i) => {
    if (state === 'mailbox') {
      messages[i].visible = true;
      messages[i].material.opacity = 1;
      messages[i].position.set(MAILBOX_X, MSG_START_Y - mailboxSlot * MSG_SPACING, 0);
      messages[i].scale.set(1, 1, 1);
      mailboxSlot++;
    } else if (state === 'exec') {
      messages[i].visible = true;
      messages[i].material.opacity = 1;
      messages[i].position.set(EXEC_X, 0.5, 0);
      messages[i].scale.set(1, 1, 1);
    } else {
      messages[i].visible = false;
    }
  });

  sleepText.visible = step >= 7;
  if (step >= 7) startSleepPulse();

  renderer.markDirty();
}

function startSleepPulse() {
  let phase = 0;
  function tick() {
    phase += 0.03;
    sleepText.material.opacity = 0.4 + Math.sin(phase) * 0.3;
    renderer.markDirty();
    sleepLoopId = requestAnimationFrame(tick);
  }
  sleepLoopId = requestAnimationFrame(tick);
}

function stopSleepPulse() {
  if (sleepLoopId) cancelAnimationFrame(sleepLoopId);
  sleepLoopId = null;
}

// Animate a message from mailbox slot to exec column, then dissolve
function animateDequeueAndProcess(msgIndex, fromY, done) {
  const msg = messages[msgIndex];
  // Phase 1: lift and arc to exec column
  const anim1 = playTimeline(
    [
      { property: 'x', from: MAILBOX_X, to: EXEC_X, delay: 0, duration: 600 },
      { property: 'y', from: fromY, to: 0.5, delay: 0, duration: 600 },
    ],
    (vals) => {
      msg.position.x = vals.x;
      msg.position.y = vals.y;
      renderer.markDirty();
    },
    () => { currentAnimation = null; done(); },
  );
  return anim1;
}

function animateDissolve(msgIndex, done) {
  const msg = messages[msgIndex];
  return playTimeline(
    [
      { property: 'y', from: 0.5, to: -1.2, delay: 0, duration: 600 },
      { property: 'opacity', from: 1, to: 0, delay: 200, duration: 400 },
      { property: 'scaleX', from: 1, to: 0.3, delay: 200, duration: 400 },
    ],
    (vals) => {
      msg.position.y = vals.y;
      msg.material.opacity = vals.opacity;
      msg.scale.x = vals.scaleX;
      renderer.markDirty();
    },
    () => {
      msg.visible = false;
      currentAnimation = null;
      done();
    },
  );
}

const slideData = [
  {
    stepCount: 8,
    resolve(stepIndex) {
      resolveStep(stepIndex);
    },
    animate(stepIndex, done) {
      stopSleepPulse();
      // Determine which message is being acted on
      const msgForStep = [null, 0, 0, 1, 1, 2, 2, null];
      const msgIdx = msgForStep[stepIndex];

      if (stepIndex === 0) {
        resolveStep(0);
        done();
      } else if (stepIndex % 2 === 1 && msgIdx !== null) {
        // Odd steps: dequeue (move from mailbox to exec)
        const fromY = messages[msgIdx].position.y;
        currentAnimation = animateDequeueAndProcess(msgIdx, fromY, done);
      } else if (stepIndex % 2 === 0 && msgIdx !== null) {
        // Even steps: dissolve in exec
        currentAnimation = animateDissolve(msgIdx, done);
      } else if (stepIndex === 7) {
        // Sleep
        resolveStep(7);
        done();
      }
    },
  },
];

export const mailboxExecutionScene = {
  title: 'Mailbox & Execution',
  slides: slideData.map((s) => ({ stepCount: s.stepCount })),

  init(stage) {
    renderer = createThreeRenderer();
    threeCtx = renderer.init(stage);
    threeCtx.scene.background = new THREE.Color(colors.bg);

    const mb = createColumn(threeCtx.scene, MAILBOX_X, 'Mailbox', colors.accentWarm);
    mailboxFrame = mb.frame;
    mailboxLabel = mb.sprite;
    const ex = createColumn(threeCtx.scene, EXEC_X, 'Execution', colors.accentWarm);
    execFrame = ex.frame;
    execLabel = ex.sprite;

    createMessages(threeCtx.scene);
    createSleepText(threeCtx.scene);

    return {};
  },

  destroy() {
    stopSleepPulse();
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
    messages = [];
  },

  resolveToSlide(ctx, slideIndex, stepIndex) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].resolve(stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].animate(stepIndex, done);
  },
};
```

- [ ] **Step 2: Commit**

```
git add src/scenes/09-mailbox-execution/scene.js
git commit -m "feat: add Mailbox & Execution scene (09)"
```

---

### Task 5: Scene 10 — Execution Model

**Files:**
- Create: `src/scenes/10-execution-model/scene.js`

Rotating torus gears (behavior) + orbiting state cube get encased in a process shell. On crash, gears redden and shell cracks.

- [ ] **Step 1: Create the scene file**

Create `src/scenes/10-execution-model/scene.js`:

```js
import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial, wireframeMaterial } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
let currentAnimation = null;
let loopId = null;

// Objects
let gear1 = null;
let gear2 = null;
let stateCube = null;
let shell = null;
let shellCracks = null;
let stateLabel = null;

// State
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

  // Crack lines (hidden until crash)
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
    // Rotate gears
    if (gear1 && gear2) {
      gear1.rotation.z += gearSpeed;
      gear2.rotation.z -= gearSpeed * 1.3;
    }
    // Orbit state cube
    if (stateCube && stateCube.visible && !crashed) {
      orbitAngle += 0.02;
      stateCube.position.set(
        Math.cos(orbitAngle) * 1.0,
        Math.sin(orbitAngle) * 0.6 + 0.1,
        Math.sin(orbitAngle) * 0.5,
      );
    }
    // Jitter on crash
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
        // Fade in state cube
        stateCube.visible = true;
        stateCube.material.opacity = 0;
        stateCube.material.transparent = true;
        currentAnimation = playTimeline(
          [{ property: 'opacity', from: 0, to: 1, delay: 0, duration: 500 }],
          (vals) => {
            stateCube.material.opacity = vals.opacity;
            renderer.markDirty();
          },
          () => {
            stateCube.material.transparent = false;
            currentAnimation = null;
            done();
          },
        );
      } else if (stepIndex === 2) {
        // Shell closes around
        stateLabel.visible = true;
        currentAnimation = playTimeline(
          [{ property: 'shellOpacity', from: 0, to: 0.15, delay: 0, duration: 800 }],
          (vals) => {
            shell.material.opacity = vals.shellOpacity;
            renderer.markDirty();
          },
          () => { currentAnimation = null; done(); },
        );
      } else if (stepIndex === 3) {
        // Crash: gears turn red, cracks appear
        crashed = true;
        currentAnimation = playTimeline(
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
          () => { currentAnimation = null; done(); },
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
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
    crashed = false;
    jitterAmount = 0;
  },

  resolveToSlide(ctx, slideIndex, stepIndex) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].resolve(stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].animate(stepIndex, done);
  },
};
```

- [ ] **Step 2: Commit**

```
git add src/scenes/10-execution-model/scene.js
git commit -m "feat: add Execution Model scene (10)"
```

---

### Task 6: Scene 11 — Links

**Files:**
- Create: `src/scenes/11-links/scene.js`

Two spheres connected by an energy tether. One fails, shockwave propagates along tether, both die.

- [ ] **Step 1: Create the scene file**

Create `src/scenes/11-links/scene.js`:

```js
import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';
import { glowMaterial, wireframeMaterial } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
let currentAnimation = null;
let loopId = null;

// Objects
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

  // Wireframe husks (hidden initially)
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

  // Small particles that flow along the tether
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
        // Alternate direction: even go left-to-right, odd go right-to-left
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
  // Step 0: Two spheres
  sphere1.visible = step < 2;
  sphere2.visible = step < 3;
  sphere1.scale.set(1, 1, 1);
  sphere2.scale.set(1, 1, 1);
  sphere1.material.color.set(colors.accentWarm);
  sphere1.material.emissive.set(colors.accentWarm);

  // Step 1: Tether with particles
  tether.material.opacity = step >= 1 && step < 3 ? 0.6 : 0;
  tetherVisible = step >= 1 && step < 3;
  tetherParticles.forEach((p) => {
    p.visible = step >= 1 && step < 3;
    p.material.opacity = step >= 1 && step < 3 ? 0.8 : 0;
  });

  // Step 2: Sphere 1 dead
  if (step >= 2) {
    sphere1.visible = false;
    husk1.visible = true;
  } else {
    husk1.visible = false;
  }

  // Step 3: Both dead
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
        // Tether fades in, particles appear
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
        // Sphere1 turns red, shrinks, replaced by husk
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
        // Shockwave travels along tether, sphere2 dies
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
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
    tetherVisible = false;
  },

  resolveToSlide(ctx, slideIndex, stepIndex) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].resolve(stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].animate(stepIndex, done);
  },
};
```

- [ ] **Step 2: Commit**

```
git add src/scenes/11-links/scene.js
git commit -m "feat: add Links scene (11)"
```

---

### Task 7: Scene 12 — Monitors

**Files:**
- Create: `src/scenes/12-monitors/scene.js`

Observer sphere above workers, sensor beams connecting them. Worker fails, notification ring rises to observer. Observer survives.

- [ ] **Step 1: Create the scene file**

Create `src/scenes/12-monitors/scene.js`:

```js
import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial, wireframeMaterial } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
let currentAnimation = null;

// Objects
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
    // Position at midpoint, orient toward worker
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
  // Step 0: Observer + workers visible
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

  // Step 1: Beams visible
  beams.forEach((b) => {
    b.material.opacity = step >= 1 ? 0.4 : 0;
    b.material.color.set(0xff7799);
  });

  // Step 2: Worker 0 dies
  if (step >= 2) {
    workers[0].material.color.set(colors.failure);
    workers[0].material.emissive.set(colors.failure);
    workers[0].material.transparent = true;
    workers[0].material.opacity = 0.3;
    workers[0].scale.setScalar(0.6);
    beams[0].material.color.set(colors.failure);
  }

  // Step 3: Notification received, observer flashes
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
        // Beams fade in
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
        // Worker 0 fades to failure
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
        // Notification ring rises from dead worker to observer
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
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
    workers = [];
    beams = [];
  },

  resolveToSlide(ctx, slideIndex, stepIndex) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].resolve(stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].animate(stepIndex, done);
  },
};
```

- [ ] **Step 2: Commit**

```
git add src/scenes/12-monitors/scene.js
git commit -m "feat: add Monitors scene (12)"
```

---

### Task 8: Scene 13 — Supervisors

**Files:**
- Create: `src/scenes/13-supervisors/scene.js`

Supervisor shield above workers. One crashes, all dissolve (one_for_all), particles coalesce back to healthy workers.

- [ ] **Step 1: Create the scene file**

Create `src/scenes/13-supervisors/scene.js`:

```js
import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
let currentAnimation = null;

// Objects
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
  // Hexagonal plate
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

  WORKER_POSITIONS.forEach((pos, i) => {
    const mat = glowMaterial(colors.accentWarm, { emissiveIntensity: 0.3, transparent: true, opacity: 1 });
    const worker = new THREE.Mesh(geo.clone(), mat);
    worker.position.copy(pos);
    scene.add(worker);
    workers.push(worker);

    // Support beam from supervisor to worker
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

  // Horizontal links between workers
  for (let i = 0; i < WORKER_POSITIONS.length - 1; i++) {
    const from = WORKER_POSITIONS[i];
    const to = WORKER_POSITIONS[i + 1];
    const dir = new THREE.Vector3().subVectors(to, from);
    const length = dir.length();
    const geo = new THREE.CylinderGeometry(0.015, 0.015, length, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: colors.accentWarm,
      transparent: true,
      opacity: 0.4,
    });
    const link = new THREE.Mesh(geo, mat);
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
    // Healthy system
    setWorkersVisible(true);
  } else if (step === 1) {
    // Middle worker crashed
    setWorkersVisible(true);
    workers[1].material.color.set(colors.failure);
    workers[1].material.emissive.set(colors.failure);
    workers[1].scale.setScalar(0.5);
    workers[1].material.opacity = 0.4;
  } else if (step === 2) {
    // All dissolved
    setWorkersVisible(false, 0);
    supervisor.material.emissiveIntensity = 0.8;
  } else if (step === 3) {
    // Particles coalescing (show as small, semi-transparent)
    setWorkersVisible(true, 0.5);
    workers.forEach((w) => w.scale.setScalar(0.3));
    supportBeams.forEach((b) => { b.material.opacity = 0.2; });
    workerLinks.forEach((l) => { l.material.opacity = 0.1; });
  } else if (step === 4) {
    // Fully restored
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
        // Middle worker crashes
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
        // Supervisor flashes, all workers dissolve
        currentAnimation = playTimeline(
          [
            { property: 'supGlow', from: 0.4, to: 0.8, delay: 0, duration: 200 },
            { property: 'allOpacity', from: 1, to: 0, delay: 100, duration: 600 },
            { property: 'beamOpacity', from: 0.5, to: 0, delay: 100, duration: 500 },
            { property: 'linkOpacity', from: 0.4, to: 0, delay: 100, duration: 500 },
          ],
          (vals) => {
            supervisor.material.emissiveIntensity = vals.supGlow;
            workers.forEach((w) => {
              w.material.opacity = vals.allOpacity;
            });
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
        // Particles coalesce — workers reappear small and grow
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
        // Final: snap to full healthy
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
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
    workers = [];
    supportBeams = [];
    workerLinks = [];
  },

  resolveToSlide(ctx, slideIndex, stepIndex) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].resolve(stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].animate(stepIndex, done);
  },
};
```

- [ ] **Step 2: Commit**

```
git add src/scenes/13-supervisors/scene.js
git commit -m "feat: add Supervisors scene (13)"
```

---

### Task 9: Wire Up main.js + Integration Test

**Files:**
- Modify: `src/main.js`

Replace demo scene imports with the 7 new scenes and verify everything runs.

- [ ] **Step 1: Update main.js imports and scene list**

Replace the existing imports and `buildSceneDefs()` in `src/main.js`:

```js
import { createEngine } from './engine/engine.js';
import { createPalette } from './commands/palette.js';
import { beamVmScene } from './scenes/07-beam-vm/scene.js';
import { processMessagingScene } from './scenes/08-process-messaging/scene.js';
import { mailboxExecutionScene } from './scenes/09-mailbox-execution/scene.js';
import { executionModelScene } from './scenes/10-execution-model/scene.js';
import { linksScene } from './scenes/11-links/scene.js';
import { monitorsScene } from './scenes/12-monitors/scene.js';
import { supervisorsScene } from './scenes/13-supervisors/scene.js';
import { applyColorVars } from './shared/colors.js';
import { createDebugOverlay } from './debug/overlay.js';

const stage = document.getElementById('stage');
applyColorVars(document.documentElement);

let engine = null;
let palette = null;

function buildSceneDefs() {
  return [
    beamVmScene,
    processMessagingScene,
    mailboxExecutionScene,
    executionModelScene,
    linksScene,
    monitorsScene,
    supervisorsScene,
  ];
}
```

Keep the rest of `main.js` unchanged (the `setup()`, `teardown()`, HMR code stays the same).

- [ ] **Step 2: Run existing unit tests**

Run: `./test`
Expected: All tests pass. The unit tests don't import scenes directly, so they should be unaffected.

- [ ] **Step 3: Start dev server and manually test**

Run: `./dev`
Open: http://localhost:3000

Walk through all 7 scenes:
1. BEAM VM — box fades in, spheres drift, shelves appear, light columns
2. Process Messaging — cubes with labels, particle arc, mailbox + rings
3. Mailbox & Execution — messages dequeue, dissolve, sleep state
4. Execution Model — gears rotate, state cube orbits, shell closes, crash
5. Links — tether with particles, shockwave kills both
6. Monitors — beams connect, worker dies, notification rises
7. Supervisors — crash, dissolve, coalesce, restore

For each scene, test:
- Forward navigation (arrow right)
- Rapid clicking (should skip to final state)
- Direct jump via command palette (Escape → "Scene 3")
- Scene transitions don't leak

- [ ] **Step 4: Commit**

```
git add src/main.js
git commit -m "feat: wire up 7 BEAM scenes, replace demo scenes"
```

---

### Task 10: Visual Polish Pass

**Files:**
- Potentially modify any scene file based on visual review

This is a hands-on tuning task. Run the dev server, walk through every scene, and adjust:

- [ ] **Step 1: Review each scene in browser**

Run: `./dev`

For each scene, check:
- Object positions — nothing clipped at edges, centered nicely
- Animation timing — smooth, not too fast or slow
- Colors — readable against background, consistent palette use
- Opacity levels — transparent objects visible enough but not overpowering
- Text labels — readable size, not overlapping objects

- [ ] **Step 2: Fix any visual issues found**

Common fixes:
- Adjust position constants (e.g., `BOX_CENTER`, `SENDER_POS`)
- Tweak animation durations and delays
- Adjust opacity values
- Scale text sprites up/down

- [ ] **Step 3: Run tests one final time**

Run: `./test`
Expected: All pass.

- [ ] **Step 4: Commit**

```
git add -A
git commit -m "polish: tune scene positions, timing, and visual balance"
```
