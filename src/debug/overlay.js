export function createDebugOverlay(getPosition, getDeck) {
  let el = null;
  let visible = false;
  let frameId = null;

  function update() {
    if (!visible || !el) return;
    const pos = getPosition();
    const deck = getDeck();
    const scene = deck.scenes[pos.sceneIndex];
    const totalScenes = deck.scenes.length;
    const totalSlides = scene ? scene.slides.length : 0;
    const slide = scene ? scene.slides[pos.slideIndex] : null;
    const totalSteps = slide ? slide.stepCount : 0;

    el.textContent =
      `Scene ${pos.sceneIndex + 1}/${totalScenes}` +
      ` | Slide ${pos.slideIndex + 1}/${totalSlides}` +
      ` | Step ${pos.stepIndex + 1}/${totalSteps}`;

    frameId = requestAnimationFrame(update);
  }

  return {
    toggle() {
      visible = !visible;
      if (visible) {
        if (!el) {
          el = document.createElement('div');
          el.style.cssText =
            'position:fixed;bottom:12px;left:12px;padding:6px 12px;' +
            'background:rgba(0,0,0,0.7);color:#5fb4a2;font-size:13px;' +
            'font-family:monospace;border-radius:4px;z-index:999;pointer-events:none;';
          document.body.appendChild(el);
        }
        el.style.display = 'block';
        update();
      } else {
        if (el) el.style.display = 'none';
        if (frameId) cancelAnimationFrame(frameId);
      }
    },

    destroy() {
      if (frameId) cancelAnimationFrame(frameId);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    },
  };
}
