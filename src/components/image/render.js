// src/components/image/render.js
import { resolveImageUrl } from './resolve-path.lib.js';

/**
 * Render an image-row block.
 *
 * Layout:
 *   - One image  → centered, capped at 70% slide width and full height.
 *   - 2+ images  → equal-width columns with consistent gap, all images
 *                  cap at full row height via object-fit: contain.
 *
 * Step-gated rows: when several image-row blocks across consecutive
 * `+++`-separated steps are merged into one figure (see scene-factory.js
 * `imageRunEnd`/`renderImageRun`), individual `<img>` visibility is
 * driven by the per-image `visibleFromStep` field added by the run
 * collector. A single block rendered through this function shows every
 * image at once.
 *
 * @param {{ images: Array<{ src: string, alt: string, visibleFromStep?: number }> }} data
 * @param {{ classPrefix: string, sceneFolder?: string, baseUrl?: string, currentStep?: number, animated?: boolean }} renderContext
 * @returns {HTMLElement}
 */
export function renderImageBlock(data, renderContext) {
  const id = renderContext.classPrefix;
  const sceneFolder = renderContext.sceneFolder || '';
  const baseUrl = renderContext.baseUrl ?? '/';

  const figure = document.createElement('figure');
  figure.className = `${id}-image-row`;
  figure.dataset.count = String(data.images.length);

  const currentStep = Number.isFinite(renderContext.currentStep)
    ? renderContext.currentStep
    : Infinity;
  const animated = renderContext.animated === true;

  for (const image of data.images) {
    const img = document.createElement('img');
    img.src = resolveImageUrl(image.src, sceneFolder, baseUrl);
    img.alt = image.alt || '';
    img.className = `${id}-image-item`;

    const hasStepGate = Number.isFinite(image.visibleFromStep);
    const stepVisible = !hasStepGate || image.visibleFromStep <= currentStep;
    if (hasStepGate) img.dataset.visibleFromStep = String(image.visibleFromStep);

    // Start hidden in every case so the slot doesn't render with a half-loaded
    // bitmap. Reveal once the image has decoded AND the step gate is satisfied.
    img.classList.add('hidden');

    const reveal = () => {
      if (!stepVisible) return;
      img.classList.remove('hidden');
      img.classList.add(animated ? 'visible' : 'instant');
      if (animated && hasStepGate) {
        const delay = Math.max(0, image.visibleFromStep) * 80;
        img.style.transitionDelay = `${delay}ms`;
      }
    };

    if (img.complete && img.naturalWidth > 0) reveal();
    else img.addEventListener('load', reveal, { once: true });

    figure.appendChild(img);
  }

  return figure;
}
