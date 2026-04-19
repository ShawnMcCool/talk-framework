import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { createTrackedTimeline } from '../../animation/tracked-timeline.js';
import { colors } from '../../shared/colors.js';
import { createTextSprite, glowMaterial } from '../scene-helpers.js';

let renderer = null;
let threeCtx = null;
const tracker = createTrackedTimeline();
let sleepLoopId = null;

const MAILBOX_X = -1.8;
const EXEC_X = 1.8;
const COL_WIDTH = 2.5;
const COL_HEIGHT = 4;
const COL_Y = 0;
const MSG_HEIGHT = 0.3;
const MSG_WIDTH = 1.8;
const MSG_START_Y = 1.2;
const MSG_SPACING = 0.5;

let mailboxFrame = null;
let execFrame = null;
let mailboxLabel = null;
let execLabel = null;
let messages = [];
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

function resolveStep(step) {
  stopSleepPulse();

  const msgStates = [
    ['mailbox', 'mailbox', 'mailbox'],
    ['exec', 'mailbox', 'mailbox'],
    ['gone', 'mailbox', 'mailbox'],
    ['gone', 'exec', 'mailbox'],
    ['gone', 'gone', 'mailbox'],
    ['gone', 'gone', 'exec'],
    ['gone', 'gone', 'gone'],
    ['gone', 'gone', 'gone'],
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

function animateDequeueAndProcess(msgIndex, fromY, done) {
  const msg = messages[msgIndex];
  return tracker.playTimeline(
    [
      { property: 'x', from: MAILBOX_X, to: EXEC_X, delay: 0, duration: 600 },
      { property: 'y', from: fromY, to: 0.5, delay: 0, duration: 600 },
    ],
    (vals) => {
      msg.position.x = vals.x;
      msg.position.y = vals.y;
      renderer.markDirty();
    },
    done,
  );
}

function animateDissolve(msgIndex, done) {
  const msg = messages[msgIndex];
  return tracker.playTimeline(
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
      const msgForStep = [null, 0, 0, 1, 1, 2, 2, null];
      const msgIdx = msgForStep[stepIndex];

      if (stepIndex === 0) {
        resolveStep(0);
        done();
      } else if (stepIndex % 2 === 1 && msgIdx !== null) {
        const fromY = messages[msgIdx].position.y;
        animateDequeueAndProcess(msgIdx, fromY, done);
      } else if (stepIndex % 2 === 0 && msgIdx !== null) {
        animateDissolve(msgIdx, done);
      } else if (stepIndex === 7) {
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
    tracker.cancelAll();
    if (renderer) renderer.destroy();
    renderer = null;
    threeCtx = null;
    messages = [];
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
