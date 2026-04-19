// Shared walker for per-block diagnostics over a parsed markdown scene.
// Consumed by `bin/talk-lint.js` (CLI) and
// `src/authoring/content-loader-plugin.js` (dev HMR channel) so both surfaces
// see identical diagnostics.

/**
 * Walk a parsed markdown scene and collect diagnostics from every registered
 * component that opts into validation. Fenced code blocks with a known
 * info-string dispatch to custom parse/validate; every other block dispatches
 * to the built-in block-type matcher.
 *
 * @param {import('../types.js').ParsedMarkdownScene} parsed
 * @param {{
 *   file: string,
 *   registry: {
 *     getByInfoString(lang: string): object | null,
 *     getByBlockType(type: string): object | null,
 *   },
 * }} opts
 * @returns {Array<object>} diagnostic records
 */
export function walkSceneDiagnostics(parsed, { file, registry }) {
  const diagnostics = [];

  for (const slide of parsed.slides) {
    for (const step of slide) {
      for (const block of step) {
        if (block.type === 'code' && block.language) {
          const custom = registry.getByInfoString(block.language);
          if (custom && custom.validate) {
            const ctx = { file, blockStartLine: block.line || 1 };
            const data = custom.parse ? custom.parse(block.code, ctx) : block.code;
            for (const d of custom.validate(data, ctx)) diagnostics.push(d);
          }
          continue;
        }

        const builtin = registry.getByBlockType(block.type);
        if (builtin && builtin.validate) {
          const ctx = { file, blockStartLine: block.line || 1 };
          for (const d of builtin.validate(block, ctx)) diagnostics.push(d);
        }
      }
    }
  }

  return diagnostics;
}
