import { playTimeline as rawPlayTimeline } from './timeline.js';

/**
 * Timeline + setTimeout tracker. All animations started via the returned
 * `playTimeline` and `setTimeout` are tracked; `cancelAll()` cancels every
 * in-flight timeline (snapping to final values + calling doneFn) and clears
 * every pending timeout.
 *
 * Use this in hand-rolled scenes. `createThreeScene` and `createSvgScene`
 * already own an instance internally.
 */
export function createTrackedTimeline() {
  let activeTimeline = null;
  const activeTimeouts = new Set();

  function playTimeline(tweenDefs, applyFn, doneFn) {
    const handle = rawPlayTimeline(tweenDefs, applyFn, () => {
      if (activeTimeline === handle) activeTimeline = null;
      doneFn();
    });
    activeTimeline = handle;
    return handle;
  }

  function setTimeoutTracked(fn, ms) {
    const id = globalThis.setTimeout(() => {
      activeTimeouts.delete(id);
      fn();
    }, ms);
    activeTimeouts.add(id);
    return id;
  }

  function cancelAll() {
    if (activeTimeline) {
      try { activeTimeline.resolve(); } catch (_) {}
      activeTimeline = null;
    }
    for (const id of activeTimeouts) clearTimeout(id);
    activeTimeouts.clear();
  }

  return {
    playTimeline,
    setTimeout: setTimeoutTracked,
    cancelAll,
  };
}
