// Pure parser/serializer for the `?p=…` query parameter that mirrors the
// engine's current position into the URL.
//
// Format: `?p=<folder>[.<slide>[.<step>]]` — slide/step are 1-indexed in
// the URL (matching the `Jump to Slide (scene.slide)` palette command),
// 0-indexed in the returned/accepted shape (matching the engine).
//
// Folder name (not numeric scene index) keeps shared links stable when
// scenes are reordered or renumbered, mirroring the framework's existing
// HMR position-preservation convention.

const PARAM = 'p';

/**
 * Parse a URL search string into a position. Returns null when the `p`
 * param is missing, empty, or its slide/step components are not positive
 * integers. The folder is returned verbatim; callers resolve it to a
 * scene index against the current deck.
 *
 * @param {string} search — typically `window.location.search`.
 * @returns {{ folder: string, slideIndex: number, stepIndex: number } | null}
 */
export function parseQuery(search) {
  if (typeof search !== 'string') return null;
  const trimmed = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(trimmed);
  const raw = params.get(PARAM);
  if (!raw) return null;

  const parts = raw.split('.');
  const folder = parts[0];
  if (!folder) return null;

  const slideOne = parts.length >= 2 ? Number(parts[1]) : 1;
  const stepOne = parts.length >= 3 ? Number(parts[2]) : 1;
  if (!Number.isInteger(slideOne) || slideOne < 1) return null;
  if (!Number.isInteger(stepOne) || stepOne < 1) return null;

  return {
    folder,
    slideIndex: slideOne - 1,
    stepIndex: stepOne - 1,
  };
}

/**
 * Build a `?p=…` query string from a (folder, slideIndex, stepIndex)
 * triple. Trailing default segments are omitted so canonical URLs stay
 * short: `?p=04-images` for slide 1 step 1, `?p=04-images.2` for slide 2
 * step 1, `?p=04-images.2.3` for slide 2 step 3.
 *
 * Returns an empty string when folder is missing — the caller should fall
 * back to clearing the query (`location.pathname`) in that case.
 *
 * @param {{ folder?: string, slideIndex?: number, stepIndex?: number }} pos
 * @returns {string}
 */
export function buildQuery({ folder, slideIndex = 0, stepIndex = 0 } = {}) {
  if (!folder || typeof folder !== 'string') return '';
  const slideOne = Math.max(1, (slideIndex | 0) + 1);
  const stepOne = Math.max(1, (stepIndex | 0) + 1);

  const parts = [folder];
  if (slideOne > 1 || stepOne > 1) parts.push(String(slideOne));
  if (stepOne > 1) parts.push(String(stepOne));

  const params = new URLSearchParams();
  params.set(PARAM, parts.join('.'));
  return `?${params.toString()}`;
}
