// Title slide — the deck's cover, built with the title-animation factory.
//
// `zoomPunchAnimation` zooms each letter in with impact; the framework
// also ships `typewriterAnimation`, `dropAnimation`, `spinLockAnimation`,
// `extrudeAnimation`, and `reverseExplodeAnimation` — swap the import
// and the second argument to try them.
//
// `@talk-framework/...` is a Vite path alias defined in the framework's
// vite.config.js — it works in both `talk serve` and production builds.

import {
  createTitleScene,
  zoomPunchAnimation,
} from '@talk-framework/components/title-animation/index.js';

export const opener = createTitleScene(
  'TALK',
  zoomPunchAnimation('TALK'),
);
