/**
 * Tiny persistence helper for dev session state (current position + overlay
 * visibility). Keys are namespaced under `talk:` in localStorage.
 * Silently swallows any errors (private browsing, quota, etc.).
 *
 * `getPosition` / `setPosition` are scoped to a `deckId` (typically the
 * deck's talk.toml title). The saved position is returned only when the
 * caller's deckId matches the saved deckId — loading a different deck
 * resets navigation to scene 1 / slide 1 instead of carrying over stale
 * coordinates from the previous deck.
 */
const NS = 'talk:';

function safeGet(key) {
  try { return localStorage.getItem(NS + key); } catch { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(NS + key, value); } catch { /* ignore */ }
}

export const sessionState = {
  getPosition(deckId) {
    if (!deckId) return null;
    const raw = safeGet('position');
    if (!raw) return null;
    try {
      const p = JSON.parse(raw);
      if (
        p?.deckId === deckId &&
        typeof p?.sceneIndex === 'number' &&
        typeof p?.slideIndex === 'number' &&
        typeof p?.stepIndex === 'number'
      ) {
        return { sceneIndex: p.sceneIndex, slideIndex: p.slideIndex, stepIndex: p.stepIndex };
      }
    } catch { /* fall through */ }
    return null;
  },

  setPosition(deckId, position) {
    if (!deckId) return;
    safeSet('position', JSON.stringify({ deckId, ...position }));
  },

  getFlag(name) {
    return safeGet(`flag:${name}`) === 'true';
  },

  setFlag(name, value) {
    safeSet(`flag:${name}`, value ? 'true' : 'false');
  },
};
