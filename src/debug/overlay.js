export function createDebugOverlay(getPosition, getDeck, opts = {}) {
  const resolveSource = opts.resolveSource || (() => null);
  let el = null;
  let pathEl = null;
  let statsEl = null;
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

    statsEl.textContent =
      `Scene ${pos.sceneIndex + 1}/${totalScenes}` +
      ` · Slide ${pos.slideIndex + 1}/${totalSlides}` +
      ` · Step ${pos.stepIndex + 1}/${totalSteps}`;

    const path = resolveSource(pos.sceneIndex);
    pathEl.textContent = path || '';
    pathEl.style.display = path ? 'block' : 'none';

    frameId = requestAnimationFrame(update);
  }

  function ensureEl() {
    if (el) return;
    el = document.createElement('div');
    el.style.cssText =
      'position:fixed;bottom:12px;left:12px;padding:6px 12px;' +
      'background:rgba(0,0,0,0.7);color:#5fb4a2;font-size:13px;' +
      'font-family:monospace;border-radius:4px;z-index:999;pointer-events:none;' +
      'line-height:1.4;';
    statsEl = document.createElement('div');
    pathEl = document.createElement('div');
    pathEl.style.cssText = 'color:#99aacc;font-size:11px;opacity:0.8;';
    el.appendChild(statsEl);
    el.appendChild(pathEl);
    document.body.appendChild(el);
  }

  return {
    toggle() {
      visible = !visible;
      if (visible) {
        ensureEl();
        el.style.display = 'block';
        update();
      } else {
        if (el) el.style.display = 'none';
        if (frameId) cancelAnimationFrame(frameId);
      }
    },

    /** Force an immediate re-read of position/deck. */
    refresh() {
      if (!visible) return;
      ensureEl();
      update();
    },

    isVisible() {
      return visible;
    },

    destroy() {
      if (frameId) cancelAnimationFrame(frameId);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      el = null;
    },
  };
}
