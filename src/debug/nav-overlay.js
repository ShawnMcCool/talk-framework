/**
 * Toggleable navigation overlay (top-left).
 * Lists all scenes, highlights current, expands current scene's slides/steps
 * with clickable jump links. Shows current position.
 */
export function createNavOverlay(getPosition, getDeck, opts = {}) {
  const onJump = opts.onJump || (() => {});
  let el = null;
  let visible = false;
  let frameId = null;

  function ensureEl() {
    if (el) return;
    el = document.createElement('div');
    el.style.cssText = [
      'position: fixed',
      'top: 12px',
      'left: 12px',
      'max-height: calc(100vh - 24px)',
      'padding: 8px 10px',
      'background: rgba(0,0,0,0.82)',
      'color: #e8e8f8',
      'font-family: -apple-system, sans-serif',
      'font-size: 12px',
      'line-height: 1.4',
      'border-radius: 6px',
      'z-index: 998',
      'overflow-y: auto',
      'backdrop-filter: blur(6px)',
      'min-width: 180px',
      'max-width: 260px',
    ].join(';');

    el.addEventListener('click', (e) => {
      const target = e.target.closest('[data-nav]');
      if (!target) return;
      const scene = parseInt(target.dataset.scene, 10);
      const slide = target.dataset.slide !== undefined ? parseInt(target.dataset.slide, 10) : 0;
      const step = target.dataset.step !== undefined ? parseInt(target.dataset.step, 10) : 0;
      onJump(scene, slide, step);
    });

    document.body.appendChild(el);
  }

  function render() {
    if (!visible || !el) return;
    const pos = getPosition();
    const deck = getDeck();
    const scenes = deck.scenes;

    const header = `
      <div style="color:#99aacc; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:6px;">
        Scene ${pos.sceneIndex + 1}/${scenes.length}
        · Slide ${pos.slideIndex + 1}/${scenes[pos.sceneIndex]?.slides.length || 0}
        · Step ${pos.stepIndex + 1}/${scenes[pos.sceneIndex]?.slides[pos.slideIndex]?.stepCount || 0}
      </div>
    `;

    const rows = scenes.map((scene, sIdx) => {
      const isCurrent = sIdx === pos.sceneIndex;
      const titleColor = isCurrent ? '#aaccff' : '#e8e8f8';
      const title = `
        <div data-nav data-scene="${sIdx}" data-slide="0" data-step="0"
             style="cursor:pointer; padding:2px 4px; border-radius:3px; color:${titleColor}; ${isCurrent ? 'font-weight:600;' : ''}"
             onmouseover="this.style.background='rgba(255,255,255,0.06)'"
             onmouseout="this.style.background=''">
          ${sIdx + 1}. ${scene.title || '(untitled)'}
        </div>
      `;

      if (!isCurrent) return title;

      // Expand current scene: show slide/step dots
      const slides = scene.slides.map((slide, slIdx) => {
        const steps = Array.from({ length: slide.stepCount }, (_, stIdx) => {
          const isHere = slIdx === pos.slideIndex && stIdx === pos.stepIndex;
          const bg = isHere ? '#aaccff' : 'rgba(153,170,204,0.35)';
          return `<span data-nav data-scene="${sIdx}" data-slide="${slIdx}" data-step="${stIdx}"
            style="display:inline-block; width:10px; height:10px; margin:0 2px; border-radius:50%;
                   background:${bg}; cursor:pointer;"
            title="Slide ${slIdx+1}.${stIdx+1}"></span>`;
        }).join('');
        return `<div style="padding:1px 8px 1px 18px;">${steps}</div>`;
      }).join('');

      return title + slides;
    }).join('');

    el.innerHTML = header + rows;
    frameId = requestAnimationFrame(render);
  }

  return {
    toggle() {
      visible = !visible;
      if (visible) {
        ensureEl();
        el.style.display = 'block';
        render();
      } else {
        if (el) el.style.display = 'none';
        if (frameId) cancelAnimationFrame(frameId);
      }
    },
    /** Force an immediate re-read of position/deck. */
    refresh() {
      if (!visible) return;
      ensureEl();
      render();
    },
    isVisible() { return visible; },
    destroy() {
      if (frameId) cancelAnimationFrame(frameId);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      el = null;
    },
  };
}
