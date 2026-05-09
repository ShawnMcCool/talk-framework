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
    if (Number.isFinite(image.visibleFromStep)) {
      img.dataset.visibleFromStep = String(image.visibleFromStep);
      const visible = image.visibleFromStep <= currentStep;
      img.classList.add(animated
        ? (visible ? 'visible' : 'hidden')
        : (visible ? 'instant' : 'hidden'));
      if (animated && visible) {
        const delay = Math.max(0, image.visibleFromStep) * 80;
        img.style.transitionDelay = `${delay}ms`;
      }
    }
    figure.appendChild(img);
  }

  return figure;
}
