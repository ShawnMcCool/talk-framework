// src/components/content-slide/component.js
import { createContentSlide } from './scene-factory.js';

/**
 * Content-slide scene type. The default for markdown scenes unless
 * `type:` in frontmatter says otherwise. Consumes a parsed scene
 * (title, slides, options) and returns a scene module.
 *
 * Validation is a no-op in B's scope — per-block diagnostics flow
 * from each block component. Composition happens at scene-type level.
 */
export const component = {
  name: 'content-slide',
  kind: 'scene-type',
  matcher: { frontmatterType: 'content' },
  render(parsedScene) {
    return createContentSlide(parsedScene.title, parsedScene.slides, parsedScene.options);
  },
};
