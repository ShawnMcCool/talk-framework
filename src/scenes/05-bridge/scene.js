import { createSvgScene } from '../../svg-scenes/scene-factory.js';
import { colors } from '../../shared/colors.js';
import { cornerLoop } from '../../shared/corner-loop.js';

const VIEWBOX = { w: 1000, h: 600 };

export const bridgeScene = createSvgScene({
  title: 'These have names',
  slides: [{ stepCount: 2 }],
  viewBox: `0 0 ${VIEWBOX.w} ${VIEWBOX.h}`,

  setup({ html }) {
    // Title card content
    html.innerHTML = `
      <div style="
        width: 100%; height: 100%;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        text-align: center;
        font-family: -apple-system, sans-serif;
        color: ${colors.text};
        opacity: 0;
        transition: opacity 700ms ease;
      " data-title-card>
        <div style="
          font-size: 2.6rem;
          font-weight: 300;
          line-height: 1.4;
          max-width: 820px;
          letter-spacing: 0.01em;
        ">
          Two things just happened.<br>
          They have names.
        </div>
        <div style="
          margin-top: 2rem;
          font-size: 1.1rem;
          color: ${colors.textMuted};
          max-width: 640px;
          line-height: 1.7;
        ">
          <div>Six files all had to know the same secret.</div>
          <div>A condition grew out of a shortcut, not a requirement.</div>
        </div>
      </div>
    `;

    return {
      titleCard: html.querySelector('[data-title-card]'),
    };
  },

  resolveStep(objects, { stepIndex }) {
    // Always reveal title card + centered loop for this scene
    objects.titleCard.style.opacity = stepIndex >= 0 ? '1' : '0';
    if (stepIndex >= 1) {
      cornerLoop.show({ at: 'center', highlight: null, withQuestion: true });
    } else {
      cornerLoop.show({ at: 'corner', highlight: 'friction', withQuestion: false });
    }
  },

  animateStep(objects, { stepIndex, setTimeout, done }) {
    // Step 0: title card fades in from wherever we came (Fork scene has the cornerLoop in the corner)
    // Step 1: cornerLoop animates from corner to center, question mark appears.
    if (stepIndex === 0) {
      objects.titleCard.style.opacity = '1';
      // Ensure loop is still in corner
      cornerLoop.show({ at: 'corner', highlight: 'friction', withQuestion: false });
      setTimeout(done, 700);
    } else if (stepIndex === 1) {
      cornerLoop.animateTo({ at: 'center', highlight: null, withQuestion: true }, 800, done);
    } else {
      done();
    }
  },

  onDestroy() {
    // Leave cornerLoop visible; next act may want it.
  },
});
