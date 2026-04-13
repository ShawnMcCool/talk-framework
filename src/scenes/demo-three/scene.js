import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';

let renderer = null;
let box1 = null;
let box2 = null;
let threeCtx = null;
let currentAnimation = null;

const slideData = [
  {
    stepCount: 1,
    resolve() {
      box1.position.set(-1, 0, 0);
      box1.visible = true;
      box2.visible = false;
      renderer.markDirty();
    },
    animate(stepIndex, done) {
      this.resolve();
      done();
    },
  },
  {
    stepCount: 2,
    resolve(stepIndex) {
      box1.position.set(1, 0, 0);
      box1.visible = true;
      box2.visible = stepIndex >= 1;
      box2.position.set(-1, 0, 0);
      renderer.markDirty();
    },
    animate(stepIndex, done) {
      if (stepIndex === 0) {
        currentAnimation = playTimeline(
          [{ property: 'box1x', from: -1, to: 1, delay: 0, duration: 600 }],
          (vals) => {
            box1.position.x = vals.box1x;
            renderer.markDirty();
          },
          () => {
            box2.visible = false;
            currentAnimation = null;
            done();
          },
        );
      } else {
        box2.visible = true;
        box2.position.set(-1, 0, 0);
        renderer.markDirty();
        done();
      }
    },
  },
];

export const demoThreeScene = {
  title: 'Demo 3D',
  slides: slideData.map((s) => ({ stepCount: s.stepCount })),

  init(stage) {
    renderer = createThreeRenderer();
    threeCtx = renderer.init(stage);

    const geo = new THREE.BoxGeometry(1, 1, 1);

    box1 = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: colors.accentWarm }));
    threeCtx.scene.add(box1);

    box2 = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: colors.accent }));
    box2.visible = false;
    threeCtx.scene.add(box2);

    threeCtx.scene.background = new THREE.Color(colors.bg);

    return {};
  },

  destroy() {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    if (renderer) renderer.destroy();
    renderer = null;
    box1 = null;
    box2 = null;
    threeCtx = null;
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
