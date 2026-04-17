import { parseMarkdownScene } from './markdown-scene.lib.js';
import { createContentSlide } from '../content-slides/index.js';
import { createSectionSlide } from '../section-slides/scene-factory.js';
import { colors } from '../shared/colors.js';

/**
 * Compile a markdown source string into a scene module.
 *
 * Supported frontmatter:
 *   title (required) — scene title for palette + navigation
 *   type  — "content" (default) | "section"
 *   accent, subtitle, fontSize, letterStagger, colors.* — forwarded to factory
 *
 * The body uses standard markdown with a few conventions:
 *   ---       — slide separator
 *   # / ## / ### — headings (level 1/2/3)
 *   - / *     — bullet list (whole list = one block)
 *   > quote   — blockquote (trailing "— attribution" line is captured)
 *   ```lang   — fenced code block
 *   :spacer:  — visual spacer (also :spacer lg:)
 *   !muted ...paragraph — render paragraph in muted style
 *
 * {{name}} tokens in the source are replaced with colors[name] at compile time,
 * so markdown authors can reference named palette colors without hardcoding hex.
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
