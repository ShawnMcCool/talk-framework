import { createHtmlRenderer } from '../../rendering/html-scene.js';
import { colors } from '../../shared/colors.js';

const renderer = createHtmlRenderer();

const slideContents = [
  {
    steps: [
      { type: 'click' },
      { type: 'click' },
    ],
    resolve(container, stepIndex) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:${colors.bg};">
          <h1 style="color:${colors.text};font-size:4rem;font-family:sans-serif;">Demo Scene</h1>
          ${stepIndex >= 1 ? `<p style="color:${colors.textMuted};font-size:1.5rem;margin-top:1rem;font-family:sans-serif;">Slide 1 — Step 2 revealed</p>` : ''}
        </div>`;
    },
  },
  {
    steps: [
      { type: 'click' },
      { type: 'click' },
    ],
    resolve(container, stepIndex) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:${colors.bg};">
          <h1 style="color:${colors.accentWarm};font-size:3rem;font-family:sans-serif;">Second Slide</h1>
          ${stepIndex >= 1 ? `<p style="color:${colors.accent};font-size:1.5rem;margin-top:1rem;font-family:sans-serif;">With a second step</p>` : ''}
        </div>`;
    },
  },
  {
    steps: [
      { type: 'click' },
    ],
    resolve(container, stepIndex) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:${colors.bg};">
          <h1 style="color:${colors.failure};font-size:3rem;font-family:sans-serif;">Last Slide</h1>
        </div>`;
    },
  },
];

export const demoHtmlScene = {
  title: 'Demo',
  slides: slideContents.map((s) => ({ stepCount: s.steps.length })),

  init(stage) {
    const container = renderer.init(stage);
    return { container };
  },

  destroy() {
    renderer.destroy();
  },

  resolveToSlide(ctx, slideIndex, stepIndex) {
    slideContents[slideIndex].resolve(ctx.container, stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    slideContents[slideIndex].resolve(ctx.container, stepIndex);
    done();
  },
};
