// Resolve an image src declared in scene markdown into the URL the browser
// should request.
//
// Two src forms are accepted:
//   - bare path        ("diagram.png")          → scene-relative
//   - leading slash    ("/images/logo.png")     → content-root relative
//
// In both dev and production we expose the content folder under a stable
// `<base>content/` URL prefix (dev: served by the content-loader plugin's
// middleware; prod: copied verbatim into dist by the same plugin's
// closeBundle hook). That means the resolver only has to compute a URL —
// it never touches the filesystem.

/**
 * @param {string} src — the raw markdown src ("diagram.png" or "/foo.png").
 * @param {string} sceneFolder — the scene's folder name relative to content
 *   root (e.g. "01-principles"). Empty string for content-root scenes.
 * @param {string} baseUrl — Vite's runtime base (e.g. "/talk/" or "./").
 *   Pass `import.meta.env.BASE_URL` from the renderer.
 * @returns {string} the resolved URL.
 */
export function resolveImageUrl(src, sceneFolder, baseUrl) {
  if (typeof src !== 'string' || src === '') {
    throw new Error('resolveImageUrl: src must be a non-empty string');
  }
  const base = normalizeBase(baseUrl);
  if (src.startsWith('/')) {
    return `${base}content${src}`;
  }
  const folder = sceneFolder ? `${sceneFolder}/` : '';
  return `${base}content/${folder}${src}`;
}

function normalizeBase(baseUrl) {
  if (!baseUrl) return '/';
  if (baseUrl === './') return '';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}
