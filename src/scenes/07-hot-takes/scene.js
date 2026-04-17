import { createSectionSlide } from '../../section-slides/index.js';
import { colors } from '../../shared/colors.js';

/** @type {import('../../types.js').SceneModule} */
export const hotTakesScene = createSectionSlide('Hot Takes', {
  subtitle: 'opinions may vary',
  accent: colors.accentWarm,
});
