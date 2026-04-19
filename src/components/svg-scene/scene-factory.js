import { createHtmlRenderer } from '../../rendering/html-scene.js';
import { createTrackedTimeline } from '../../animation/tracked-timeline.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Factory for animated SVG+HTML scenes. Parallels `create3DScene` but uses
 * the HTML renderer as a container, mounts an <svg> root plus an HTML overlay
 * <div>, and auto-tracks animation cancellation.
 *
 * `playTimeline` and `setTimeout` injected into `animateStep` are tracked —
 * cancelled automatically on the next `animateStep` / `resolveToSlide` / destroy.
 *
 * @template Objects
 * @param {object} config
 * @param {string} config.title
 * @param {Array<{stepCount: number}>} config.slides
 * @param {string} [config.background]      Optional CSS background on container.
 * @param {string} [config.viewBox]         SVG viewBox (default "0 0 1000 600").
 * @param {(ctx: {svg: SVGSVGElement, html: HTMLDivElement, container: HTMLDivElement}) => Objects} config.setup
 * @param {(objects: Objects, ctx: {slideIndex: number, stepIndex: number}) => void} config.resolveStep
 * @param {(objects: Objects, ctx: {slideIndex: number, stepIndex: number, playTimeline, setTimeout, markDirty, done}) => void} config.animateStep
 * @param {(objects: Objects) => void} [config.onDestroy]
 */
export function createSvgScene(config) {
  const {
    title,
    slides,
    background = null,
    viewBox = '0 0 1000 600',
    setup,
    resolveStep,
    animateStep,
    onDestroy = null,
  } = config;

  let renderer = null;
  let container = null;
  let svg = null;
  let html = null;
  let objects = null;
  const tracker = createTrackedTimeline();

  // SVG is retained mode — `markDirty` is a no-op, present for API symmetry.
  function markDirty() {}

  return {
    title,
    slides: slides.map((s) => ({ stepCount: s.stepCount })),

    init(stage) {
      renderer = createHtmlRenderer();
      container = renderer.init(stage);
      if (background) container.style.background = background;

      svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', viewBox);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;';
      container.appendChild(svg);

      html = document.createElement('div');
      html.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;pointer-events:none;';
      container.appendChild(html);

      objects = setup({ svg, html, container });
      return {};
    },

    destroy() {
      tracker.cancelAll();
      if (onDestroy) {
        try { onDestroy(objects); } catch (err) { console.error(err); }
      }
      if (renderer) renderer.destroy();
      renderer = null;
      container = null;
      svg = null;
      html = null;
      objects = null;
    },

    resolveToSlide(_ctx, slideIndex, stepIndex) {
      tracker.cancelAll();
      resolveStep(objects, { slideIndex, stepIndex, markDirty });
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
        playTimeline: tracker.playTimeline,
        setTimeout: tracker.setTimeout,
        markDirty,
        done: finish,
      });
    },
  };
}
