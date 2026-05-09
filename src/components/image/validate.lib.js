// Pure validator for image-row blocks. Produces diagnostics consumable by
// `talk lint` and the dev-mode error banner.
//
// Validations performed without a filesystem oracle:
//   - every image has a non-empty `src`
//   - every image's `src` extension is in the browser-renderable allow-list
//
// File-existence checks are gated on a caller-supplied oracle so the lib
// stays pure and testable.

const SUPPORTED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif',
]);

/**
 * @param {{ images: Array<{ src: string, alt: string }>, line?: number }} block
 * @param {{ exists?: (resolvedPath: string) => boolean, resolve?: (src: string) => string }} [oracle]
 * @returns {Array<{ severity: 'error'|'warn', message: string, line?: number }>}
 */
export function validateImageBlock(block, oracle = {}) {
  const issues = [];
  const line = block && block.line;
  const images = (block && block.images) || [];

  for (const image of images) {
    if (!image.src || typeof image.src !== 'string') {
      issues.push({ severity: 'error', message: 'image: missing src', line });
      continue;
    }
    const ext = extOf(image.src);
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      issues.push({
        severity: 'warn',
        message: `image: unsupported extension '${ext || '<none>'}' for ${image.src}`,
        line,
      });
    }
    if (typeof oracle.exists === 'function' && typeof oracle.resolve === 'function') {
      const resolved = oracle.resolve(image.src);
      if (!oracle.exists(resolved)) {
        issues.push({
          severity: 'error',
          message: `image: file not found: ${image.src}`,
          line,
        });
      }
    }
  }

  return issues;
}

function extOf(src) {
  const i = src.lastIndexOf('.');
  if (i < 0) return '';
  const dot = src.slice(i).toLowerCase();
  if (!/^\.[a-z0-9]+$/.test(dot)) return '';
  return dot;
}
