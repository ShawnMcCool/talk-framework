/**
 * Tiny persistence helper for dev session state (current position + overlay
 * visibility). Keys are namespaced under `beam-talk:` in localStorage.
 * Silently swallows any errors (private browsing, quota, etc.).
 */
const NS = 'beam-talk:';

function safeGet(key) {
  try { return localStorage.getItem(NS + key); } catch { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(NS + key, value); } catch { /* ignore */ }
}

export const sessionState = {
  getPosition() {
    const raw = safeGet('position');
    if (!raw) return null;
    try {
      const p = JSON.parse(raw);
      if (
        typeof p?.sceneIndex === 'number' &&
        typeof p?.slideIndex === 'number' &&
        typeof p?.stepIndex === 'number'
      ) return p;
    } catch { /* fall through */ }
    return null;
  },

  setPosition(position) {
    safeSet('position', JSON.stringify(position));
  },

  getFlag(name) {
    return safeGet(`flag:${name}`) === 'true';
  },

  setFlag(name, value) {
    safeSet(`flag:${name}`, value ? 'true' : 'false');
  },
};
