export function lerp(from, to, t) {
  return from + (to - from) * t;
}

export function tweenValueAt(tween, elapsed) {
  const { from, to, delay, duration } = tween;
  const localTime = elapsed - delay;
  if (localTime <= 0) return from;
  if (localTime >= duration) return to;
  return lerp(from, to, localTime / duration);
}

export function createTimeline(tweens) {
  return { tweens };
}

export function timelineDuration(timeline) {
  return Math.max(...timeline.tweens.map(t => t.delay + t.duration));
}

export function timelineValuesAt(timeline, elapsed) {
  return Object.fromEntries(
    timeline.tweens.map(tween => [tween.property, tweenValueAt(tween, elapsed)])
  );
}

export function timelineResolve(timeline) {
  return timelineValuesAt(timeline, timelineDuration(timeline));
}
