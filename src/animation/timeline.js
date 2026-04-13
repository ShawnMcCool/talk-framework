import { createTimeline, timelineValuesAt, timelineDuration } from './timeline.lib.js';

export function playTimeline(tweenDefs, applyFn, doneFn) {
  const timeline = createTimeline(tweenDefs);
  const duration = timelineDuration(timeline);
  const startTime = performance.now();
  let frameId = null;

  function tick(now) {
    const elapsed = now - startTime;
    const values = timelineValuesAt(timeline, elapsed);
    applyFn(values);

    if (elapsed < duration) {
      frameId = requestAnimationFrame(tick);
    } else {
      doneFn();
    }
  }

  frameId = requestAnimationFrame(tick);

  return {
    resolve() {
      if (frameId) cancelAnimationFrame(frameId);
      const finalValues = timelineValuesAt(timeline, duration);
      applyFn(finalValues);
      doneFn();
    },
  };
}
