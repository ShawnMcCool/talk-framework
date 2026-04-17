import * as THREE from 'three';
import { createThreeRenderer } from '../rendering/three-scene.js';
import { createTrackedTimeline } from '../animation/tracked-timeline.js';
import { colors as defaultColors } from '../shared/colors.js';

/**
 * Factory that wraps the Three.js scene boilerplate:
 *   - renderer create/destroy
 *   - background color
 *   - animation cancellation (playTimeline + setTimeout)
 *   - optional per-frame tick loop
 *
 * `playTimeline` and `setTimeout` injected into `animateStep` are tracked —
 * they're cancelled automatically on the next `animateStep` call or on
 * destroy. See `docs/architecture/animation.md` for the cancellation model.
 *
 * See `src/types.js` for the full shape of every context argument.
 *
 * @template Objects
 * @param {import('../types.js').ThreeSceneConfig<Objects>} config
 * @returns {import('../types.js').SceneModule}
 */
export function createThreeScene(config) {
  const {
    title,
    slides,
    background = defaultColors.bg,
    setup,
    onTick = null,
    resolveStep,
    animateStep,
    onDestroy = null,
  } = config;

  let renderer = null;
  let threeCtx = null;
  let objects = null;
  let loopId = null;
  const tracker = createTrackedTimeline();

  function markDirty() {
    if (renderer) renderer.markDirty();
  }

  function startLoop() {
    if (!onTick) return;
    function tick() {
      const keepGoing = onTick(objects, { markDirty });
      markDirty();
      if (keepGoing === false) { loopId = null; return; }
      loopId = requestAnimationFrame(tick);
    }
    loopId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (loopId) cancelAnimationFrame(loopId);
    loopId = null;
  }

  return {
    title,
    slides: slides.map((s) => ({ stepCount: s.stepCount })),

    init(stage) {
      renderer = createThreeRenderer();
      threeCtx = renderer.init(stage);
      threeCtx.scene.background = new THREE.Color(background);

      objects = setup({
        scene: threeCtx.scene,
        camera: threeCtx.camera,
        renderer,
        markDirty,
      });

      startLoop();
      return {};
    },

    destroy() {
      stopLoop();
      tracker.cancelAll();
      if (onDestroy) {
        try { onDestroy(objects); } catch (err) { console.error(err); }
      }
      if (renderer) renderer.destroy();
      renderer = null;
      threeCtx = null;
      objects = null;
    },

    resolveToSlide(_ctx, slideIndex, stepIndex) {
      tracker.cancelAll();
      resolveStep(objects, {
        slideIndex,
        stepIndex,
        renderer,
        markDirty,
      });
      markDirty();
    },

    animateToSlide(_ctx, slideIndex, stepIndex, done) {
      tracker.cancelAll();
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        done();
      };
      animateStep(objects, {
        slideIndex,
        stepIndex,
        renderer,
        markDirty,
        playTimeline: tracker.playTimeline,
        setTimeout: tracker.setTimeout,
        done: finish,
      });
    },
  };
}
