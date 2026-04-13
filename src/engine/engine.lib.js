export function createDeck(sceneDefs) {
  return {
    scenes: sceneDefs.map(({ title, slides }) => ({
      title,
      slides: slides.map(({ stepCount }) => ({ stepCount })),
    })),
  };
}

export function createPosition() {
  return { sceneIndex: 0, slideIndex: 0, stepIndex: 0 };
}

export function next(pos, deck) {
  const { sceneIndex, slideIndex, stepIndex } = pos;
  const scene = deck.scenes[sceneIndex];
  const slide = scene.slides[slideIndex];

  // Can advance step within current slide?
  if (stepIndex < slide.stepCount - 1) {
    return { sceneIndex, slideIndex, stepIndex: stepIndex + 1 };
  }

  // Can advance to next slide in current scene?
  if (slideIndex < scene.slides.length - 1) {
    return { sceneIndex, slideIndex: slideIndex + 1, stepIndex: 0 };
  }

  // Can advance to next scene?
  if (sceneIndex < deck.scenes.length - 1) {
    return { sceneIndex: sceneIndex + 1, slideIndex: 0, stepIndex: 0 };
  }

  // At end of deck — stay
  return pos;
}

export function prev(pos, deck) {
  const { sceneIndex, slideIndex, stepIndex } = pos;

  // Can go back a step?
  if (stepIndex > 0) {
    return { sceneIndex, slideIndex, stepIndex: stepIndex - 1 };
  }

  // Can go to previous slide in current scene?
  if (slideIndex > 0) {
    const prevSlide = deck.scenes[sceneIndex].slides[slideIndex - 1];
    return { sceneIndex, slideIndex: slideIndex - 1, stepIndex: prevSlide.stepCount - 1 };
  }

  // Can go to previous scene?
  if (sceneIndex > 0) {
    const prevScene = deck.scenes[sceneIndex - 1];
    const lastSlideIndex = prevScene.slides.length - 1;
    const lastStep = prevScene.slides[lastSlideIndex].stepCount - 1;
    return { sceneIndex: sceneIndex - 1, slideIndex: lastSlideIndex, stepIndex: lastStep };
  }

  // At start — stay
  return pos;
}

export function goToScene(sceneIndex, deck) {
  const clamped = Math.max(0, Math.min(sceneIndex, deck.scenes.length - 1));
  return { sceneIndex: clamped, slideIndex: 0, stepIndex: 0 };
}

export function isRapidInput(timestamps, threshold = 200) {
  if (timestamps.length < 3) return false;
  const last3 = timestamps.slice(-3);
  return (last3[1] - last3[0]) <= threshold && (last3[2] - last3[1]) <= threshold;
}

export function sceneChanged(fromPos, toPos) {
  return fromPos.sceneIndex !== toPos.sceneIndex;
}
