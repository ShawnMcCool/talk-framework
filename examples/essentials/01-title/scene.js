// Title slide — the deck's cover, built with the title-animation factory.
//
// `zoomPunchAnimation` zooms each letter in with impact; the framework
// also ships `typewriterAnimation`, `dropAnimation`, `spinLockAnimation`,
// `extrudeAnimation`, and `reverseExplodeAnimation` — swap the import
// and the second argument to try them.
//
// `/@fs/` is Vite's dev-server escape hatch for importing the framework
// from a content folder. Dev-only; that's the right scope for examples.

import {
  createTitleScene,
  zoomPunchAnimation,
} from '/@fs/app/src/components/title-animation/index.js';

export const opener = createTitleScene(
  'TALK',
  zoomPunchAnimation('TALK'),
);
