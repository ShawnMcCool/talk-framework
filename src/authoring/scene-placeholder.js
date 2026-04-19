// Builds a scene module that renders an error card. Used when a content
// scene fails to load or fails shape validation, so the rest of the deck
// stays navigable.

export function createErrorPlaceholderScene({ folder, index, reason }) {
  const title = `error: ${folder}`;
  let root = null;

  function init(stage) {
    root = document.createElement('div');
    root.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 48px;
      box-sizing: border-box;
      background: #1a1020;
      color: #ffb3b3;
      font: 14px monospace;
      text-align: center;
    `;

    const heading = document.createElement('div');
    heading.style.cssText = 'font-size: 24px; margin-bottom: 16px; color: #ff6b6b;';
    heading.textContent = `Scene ${String(index ?? '??').padStart(2, '0')} failed to load`;

    const folderLine = document.createElement('div');
    folderLine.style.cssText = 'font-size: 14px; margin-bottom: 24px; opacity: 0.7;';
    folderLine.textContent = folder;

    const reasonBox = document.createElement('pre');
    reasonBox.style.cssText = `
      max-width: 80%;
      white-space: pre-wrap;
      word-break: break-word;
      text-align: left;
      padding: 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,107,107,0.3);
      border-radius: 4px;
      color: #e8e8f8;
    `;
    reasonBox.textContent = reason;

    root.appendChild(heading);
    root.appendChild(folderLine);
    root.appendChild(reasonBox);
    stage.appendChild(root);
    return {};
  }

  function destroy() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
  }

  function noop() {}

  return {
    title,
    slides: [{ stepCount: 1 }],
    init,
    destroy,
    resolveToSlide: noop,
    animateToSlide: (ctx, slideIndex, stepIndex, done) => done && done(),
  };
}
