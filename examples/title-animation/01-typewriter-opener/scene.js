// Typewriter opener — a title-animation scene built with `createTitleScene`.
//
// Step 0: intro label is visible; the title waits offscreen.
// Step 1: letters stomp down one at a time (typewriter effect).
//
// The framework ships six animation variants in
// src/components/title-animation/animations/:
//   - typewriterAnimation       (letters drop + stomp, below)
//   - dropAnimation             (letters fall in sequence)
//   - zoomPunchAnimation        (text zooms in with impact)
//   - spinLockAnimation         (letters spin into place)
//   - extrudeAnimation          (letters extrude from flat)
//   - reverseExplodeAnimation   (letters reassemble from scattered state)
//
// To swap variants, change the import + the second argument to
// `createTitleScene` below.

import {
  createTitleScene,
  typewriterAnimation,
} from '/@fs/app/src/components/title-animation/index.js';

export const opener = createTitleScene(
  'Typewriter opener',
  typewriterAnimation('HELLO, TALK'),
);
