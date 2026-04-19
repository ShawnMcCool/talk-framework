// src/authoring/last-good-cache.js

/**
 * Per-scene DOM retention cache. Keyed by an opaque scene id (typically the
 * scene folder name). Each entry stores whatever the caller needs to re-mount
 * the previous successful render.
 */
export function createLastGoodCache() {
  const map = new Map();
  return {
    set(id, entry) { map.set(id, entry); },
    get(id) { return map.get(id); },
    has(id) { return map.has(id); },
    clear(id) { if (id) map.delete(id); else map.clear(); },
  };
}
