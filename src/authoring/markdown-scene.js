import { parseMarkdownScene } from './markdown-scene.lib.js';
import { createContentSlide } from '../components/content-slide/index.js';
import { createSectionSlide } from '../section-slides/scene-factory.js';
import { colors } from '../shared/colors.js';

/**
 * Compile a markdown source string into a scene module. See
 * `docs/markdown-authoring.md` for the full frontmatter + block syntax
 * reference, and `MarkdownFrontmatter` in `src/types.js` for the accepted
 * frontmatter keys.
 *
 * `{{tokenName}}` in the source is replaced at compile time with
 * `colors[tokenName]` from `src/shared/colors.js`.
 *
 * @param {string} source
 * @returns {import('../types.js').SceneModule}
 */
export function compileMarkdownScene(source) {
  const parsed = parseMarkdownScene(source, colors);

  switch (parsed.type) {
    case 'section':
      return createSectionSlide(parsed.title, parsed.options);
    case 'content':
      return createContentSlide(parsed.title, parsed.slides, parsed.options);
    default:
      throw new Error(`markdown scene: unknown type "${parsed.type}"`);
  }
}
