// src/components/section-slide/component.js
import { createSectionSlide } from './scene-factory.js';

export const component = {
  name: 'section-slide',
  kind: 'scene-type',
  matcher: { frontmatterType: 'section' },
  render(parsedScene) {
    return createSectionSlide(parsedScene.title, parsedScene.options);
  },
};
