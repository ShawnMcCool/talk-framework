import { createThreeRenderer } from '../../rendering/three-scene.js';
import { colors } from '../../shared/colors.js';
import { disposeGroup } from '../three-scene/scene-helpers.js';
import { createFramingCamera, setupResize } from './camera.js';
import { createIntro } from './intro.js';
import { getTextBounds } from './text.js';
import { createCameraShake } from './effects.js';
import * as THREE from 'three';

/**
 * Factory for title animation scenes.
 *
 * Each animation provides:
 *   - label: string shown on intro slide
 *   - createContent(scene, opts): creates 3D objects, returns { group, ... }
 *   - setStart(content): position objects at animation start state
 *   - setEnd(content): position objects at animation end state
 *   - animate(content, { shake, renderer, done }): run the animation
 *
 * The factory handles: renderer, camera framing, intro overlay,
 * scene lifecycle, cleanup, and the 2-step slide contract.
 */
export function createTitleScene(title, animation, { colors: colorOverrides } = {}) {
  const sceneColors = { ...colors, ...colorOverrides };
  let renderer = null;
  let animFrameId = null;
  let cleanupResize = null;
  let intro = null;
  let content = null;
  let shake = null;
  let cancelAnim = null;

  function stopAnimation() {
    if (cancelAnim) { cancelAnim(); cancelAnim = null; }
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  }

  return {
    title,
    slides: [{ stepCount: 2 }],

    init(stage) {
      renderer = createThreeRenderer();
      const { scene, container } = renderer.init(stage);

      // Let animation create its content
      content = animation.createContent(scene, { colors: sceneColors });

      // Position at end state to measure bounds for camera framing
      animation.setEnd(content);
      const bounds = getTextBounds(content.group);

      // Frame the camera on the visual center (text stands on its feet)
      const camera = createFramingCamera({
        targetWidth: bounds.width,
        targetHeight: bounds.height,
        targetY: content.group.position.y + bounds.height / 2,
        aspect: container.clientWidth / container.clientHeight,
        padding: 0.2,
        lowAngle: animation.lowAngle ?? 1.5,
        fov: animation.fov ?? 50,
      });
      renderer.setCamera(camera);
      cleanupResize = setupResize(camera, container, renderer);

      shake = createCameraShake(camera);
      intro = createIntro(container);

      renderer.markDirty();

      return { scene, camera, container };
    },

    destroy() {
      stopAnimation();
      if (cleanupResize) cleanupResize();
      if (intro) intro.dispose();
      if (shake) shake.reset();
      if (content && content.group) {
        if (content.group.parent) content.group.parent.remove(content.group);
        disposeGroup(content.group);
      }
      if (content && content.dispose) content.dispose();
      if (renderer) renderer.destroy();
      renderer = null; cleanupResize = null; intro = null;
      content = null; shake = null; cancelAnim = null;
    },

    resolveToSlide(ctx, slideIndex, stepIndex) {
      stopAnimation();
      if (stepIndex === 0) {
        animation.setStart(content);
        intro.show(animation.label);
      } else {
        animation.setEnd(content);
        intro.hide();
      }
      if (shake) shake.reset();
      renderer.markDirty();
    },

    animateToSlide(ctx, slideIndex, stepIndex, done) {
      stopAnimation();

      if (stepIndex === 0) {
        animation.setStart(content);
        intro.show(animation.label);
        if (shake) shake.reset();
        renderer.markDirty();
        done();
        return;
      }

      // Step 1: run the animation
      intro.hide();
      animation.setStart(content);
      renderer.markDirty();

      let lastTime = null;

      function tick(now) {
        if (!lastTime) { lastTime = now; animFrameId = requestAnimationFrame(tick); return; }
        const dt = Math.min((now - lastTime) / 1000, 0.033);
        lastTime = now;

        const finished = animation.tick(content, dt, {
          shake,
          renderer,
        });

        shake.update(dt);
        renderer.markDirty();

        if (finished) {
          animFrameId = null;
          shake.reset();
          renderer.markDirty();
          done();
        } else {
          animFrameId = requestAnimationFrame(tick);
        }
      }

      cancelAnim = () => {
        if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
      };

      animFrameId = requestAnimationFrame(tick);
    },
  };
}
