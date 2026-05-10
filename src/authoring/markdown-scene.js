import { parseMarkdownScene, resolveSceneOptions } from './markdown-scene.lib.js';
import { createContentSlide } from '../components/content-slide/index.js';
import { createSectionSlide } from '../components/section-slide/scene-factory.js';
import { colors as defaultColors } from '../shared/colors.js';

/**
 * Compile a markdown source string into a scene module. See
 * `docs/markdown-authoring.md` for the full frontmatter + block syntax
 * reference, and `MarkdownFrontmatter` in `src/types.js` for the accepted
 * frontmatter keys.
 *
 * `{{tokenName}}` in the source is replaced at compile time with a lookup
 * against the deck palette, which is `src/shared/colors.js` merged with the
 * caller-supplied `palette` (`[palette]` from `talk.toml`). Per-scene
 * frontmatter overrides still win over the deck palette.
 *
 * `sceneFolder` and `baseUrl` are runtime metadata used by the image
 * renderer to construct asset URLs. Both default to safe values for
 * environments where they aren't known (tests, SSR previews).
 *
 * @param {string} source
 * @param {{ palette?: Record<string, string>, sceneFolder?: string, baseUrl?: string, imageDimensions?: Record<string, { width: number, height: number }> }} [opts]
 * @returns {import('../types.js').SceneModule}
 */
export function compileMarkdownScene(source, { palette = {}, sceneFolder = '', baseUrl = '/', imageDimensions = {} } = {}) {
  const deckColors = { ...defaultColors, ...palette };
  const parsed = parseMarkdownScene(source, deckColors);
  const { kind, title, factoryArgs } = resolveSceneOptions(parsed, palette);

  switch (kind) {
    case 'section': return createSectionSlide(title, factoryArgs);
    case 'content': return createContentSlide(title, parsed.slides, { ...factoryArgs, sceneFolder, baseUrl, imageDimensions });
    default: throw new Error(`markdown scene: unknown kind "${kind}"`);
  }
}
