/**
 * Creates an HTML overlay for intro text before an animation.
 */
export function createIntro(container) {
  const el = document.createElement('div');
  el.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-family: sans-serif; font-size: 1.8rem; font-weight: 300;
    color: rgba(255,255,255,0.5); letter-spacing: 0.15em;
    text-transform: uppercase; pointer-events: none; z-index: 5;
  `;
  el.textContent = '';
  el.style.opacity = '0';
  container.appendChild(el);

  return {
    show(text) {
      el.textContent = text;
      el.style.opacity = '1';
    },
    hide() {
      el.style.opacity = '0';
    },
    dispose() {
      if (el.parentNode) el.parentNode.removeChild(el);
    },
  };
}
