import { validateScenesLib } from './scene-validation.lib.js';

/**
 * Run scene validation and log warnings. Never throws — a malformed
 * scene should be surfaced but shouldn't block the rest of the deck.
 */
export function validateScenes(sceneDefs) {
  const reports = validateScenesLib(sceneDefs);
  if (reports.length === 0) return;

  console.group('[beam-talk] scene validation warnings');
  for (const r of reports) {
    console.warn(`scene ${r.sceneIndex + 1} "${r.title}":`);
    for (const issue of r.issues) {
      console.warn(`  - ${issue}`);
    }
  }
  console.groupEnd();
}
