// Extract intrinsic dimensions from an SVG file's text.
//
// Used at content-load time to emit `width` / `height` HTML attributes on
// `<img>` elements so the browser can compute the implicit aspect ratio
// before decode and reserve a correctly-shaped layout slot. Eliminates the
// "everything jumps when the image arrives" reflow on slide entry.
//
// Resolution order:
//   1. `viewBox="x y w h"` on the root <svg> — preferred, since this is
//      the aspect ratio the SVG was designed against.
//   2. `width` / `height` on the root <svg>, numeric only (`px` is stripped;
//      `%`, `em`, etc. are not honored — those don't yield a fixed ratio).
//
// Returns `null` when neither produces two finite positive numbers, or when
// the input doesn't begin with an `<svg>` element.

/**
 * @param {string} text — SVG file contents.
 * @returns {{ width: number, height: number } | null}
 */
export function parseSvgDimensions(text) {
  if (typeof text !== 'string') return null;
  const start = text.indexOf('<svg');
  if (start < 0) return null;
  const end = text.indexOf('>', start);
  if (end < 0) return null;
  const tag = text.slice(start, end);

  const viewBox = matchAttr(tag, 'viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/);
    if (parts.length === 4) {
      const w = Number(parts[2]);
      const h = Number(parts[3]);
      if (isPositiveFinite(w) && isPositiveFinite(h)) {
        return { width: w, height: h };
      }
    }
  }

  const wAttr = matchAttr(tag, 'width');
  const hAttr = matchAttr(tag, 'height');
  if (wAttr && hAttr) {
    const w = parseLength(wAttr);
    const h = parseLength(hAttr);
    if (isPositiveFinite(w) && isPositiveFinite(h)) {
      return { width: w, height: h };
    }
  }

  return null;
}

function matchAttr(tag, name) {
  const re = new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"|\\s${name}\\s*=\\s*'([^']*)'`, 'i');
  const m = tag.match(re);
  if (!m) return null;
  return m[1] !== undefined ? m[1] : m[2];
}

function parseLength(value) {
  const trimmed = String(value).trim();
  if (trimmed.endsWith('px')) return Number(trimmed.slice(0, -2));
  if (/[a-z%]/i.test(trimmed)) return NaN;
  return Number(trimmed);
}

function isPositiveFinite(n) {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}
