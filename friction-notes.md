# Framework friction notes

Running log of rough edges in the presentation authoring flow. Add to this as new items surface. Format: observation, impact, suggested fix.

Entries dated to the session they were first noted.

---

## 2026-04-17 — Seeded from framework exploration

### 1. Manual scene registration, no auto-discovery
- **Where:** `src/main.js` lines 18-25 (now 18-33)
- **Observation:** `SCENE_SOURCES` must be hand-maintained. Directory `NN-` prefix is cosmetic — actual order is the array. Easy to add a scene and forget to register it.
- **Impact:** During this session, 14 of the 20 scene directories were orphaned (not in `SCENE_SOURCES`) with no warning. The directory name misleads authors into thinking prefix drives order.
- **Suggested fix:** `import.meta.glob('./scenes/*/scene.{js,md}')` for auto-registration by directory order. Provide escape hatch for excluded/attic scenes.

### 2. Duplicate animation cancellation logic across hand-rolled scenes
- **Where:** `src/scenes/09-mailbox-execution/scene.js`, `src/scenes/10-execution-model/scene.js`, `src/scenes/demo-three/scene.js`
- **Observation:** Each manually tracks `currentAnimation`, calls `resolve()` on interrupt, and nulls it. Exactly what `createThreeScene` encapsulates.
- **Impact:** Bug risk — any scene that forgets this pattern leaks animations or double-fires `done`.
- **Suggested fix:** Done partially — `createTrackedTimeline()` now exists in `src/animation/tracked-timeline.js`. These three scenes should migrate to use it (Phase 4 of the Act 1 plan, still pending).

### 3. No factory for HTML/SVG scenes (now partially resolved)
- **Where:** (was) missing; (now) `src/svg-scenes/scene-factory.js`
- **Observation:** Until this session, animated vector scenes had no factory. Three.js was overpowered; content-slides couldn't render custom DOM.
- **Status:** `createSvgScene` now exists.
- **Remaining gap:** No dedicated renderer at the rendering layer (`src/rendering/svg-scene.js`). The new factory uses `html-scene` renderer as a container and mounts SVG manually.

### 4. Markdown parser has no `columns` block
- **Where:** `src/authoring/markdown-scene.lib.js`
- **Observation:** The `content-slides` factory supports a `columns` block (see `src/content-slides/scene-factory.js:133`), but the markdown parser never emits blocks of type `columns`. Authors must fall back to raw HTML for side-by-side layouts.
- **Impact:** Scene 4 (Fork) slide 13 ("two paths") uses hand-rolled HTML instead of a clean `:columns:` block. More fragile, less grep-able.
- **Suggested fix:** Add a `:columns:` / `:/columns:` directive to the markdown parser with a `|||` row separator, emitting `{ type: 'columns', left, right }` blocks.

### 5. Markdown text blocks wrap in `<p>` — can't contain block-level HTML
- **Where:** `src/content-slides/scene-factory.js` — text block renders as `<p>...</p>`
- **Observation:** When raw HTML contains a `<div>` inside what the parser considers a "paragraph," browsers auto-close the `<p>` before the `<div>`, producing unexpected DOM. Fine in practice but confusing.
- **Suggested fix:** Detect paragraphs whose first character is `<` and render them unwrapped (or use a different block type `raw-html`).

### 6. Manual RAF loop management in hand-rolled scenes
- **Where:** `src/scenes/10-execution-model/scene.js:88-117`, `src/scenes/09-mailbox-execution/scene.js:115-129`
- **Observation:** Scenes with continuous animation manually own `loopId` and cancel in `destroy()`. If you forget, it leaks.
- **Suggested fix:** Add `createAnimationLoop(tick)` utility returning `{ start(), stop() }` with automatic cleanup on scene tear-down.

### 7. No step-level grouping in markdown
- **Where:** `src/authoring/markdown-scene.lib.js`
- **Observation:** Step count equals block count. You can't express "show these three bullets as a single reveal step."
- **Suggested fix:** Add `:step:` separator or frontmatter `steps: [...]` mapping blocks to steps.

### 8. Color palette missing brightness/alpha variants
- **Where:** `src/shared/colors.js`
- **Observation:** 13 base tokens, no dimmed/lightened variants. When a subtle version is needed, scenes hardcode `rgba(...)` or apply inline `opacity:0.5` — bypassing the token system.
- **Suggested fix:** Add `accentDim`, `textDim`, etc., or a helper like `alpha(colors.accent, 0.5)` that returns a token-friendly string.

### 9. Silent frontmatter typos
- **Where:** `src/authoring/markdown-scene.lib.js:33-80` (parser)
- **Observation:** A typo like `acccent:` is silently accepted and forwarded; the factory ignores unknown keys. No warning.
- **Suggested fix:** Schema validation in `scene-validation.lib.js` that warns on unknown frontmatter keys per `type`.

### 10. 0-indexed vs 1-indexed positions are confusing
- **Where:** `src/engine/engine.js`, `src/commands/palette.js`, `src/debug/overlay.js`
- **Observation:** Engine tracks 0-indexed scene/slide/step internally. Palette's "Jump to Slide" accepts 1-indexed `scene.slide.step`. Debug overlay mixes both.
- **Suggested fix:** Document the convention clearly; consider a `Position` type with explicit `toUserFormat()` / `fromUserFormat()`.

---

## 2026-04-17 — Observed during Act 1 implementation

### 11. Test discovery glob was silently non-recursive
- **Where:** `package.json` `scripts.test` (previously `node --test src/**/*.test.js`)
- **Observation:** Bash glob `src/**/*.test.js` without `shopt -s globstar` matches two directory levels, not arbitrary depth. Tests under `src/scenes/02-cycle/graph.lib.test.js` (three levels deep) were silently skipped.
- **Impact:** Added 17 graph tests that passed locally but the overall test count didn't change — would have been easy to miss.
- **Status:** Fixed in this session — switched to `node --test` (default recursive discovery).

### 12. Moving scene directories breaks relative imports
- **Where:** Any scene file with `../../title-animations/...` imports
- **Observation:** Moving `src/scenes/01-drop/` → `src/scenes/_attic/drop/` broke all 6 moved scenes' imports (now need `../../../`). Vite caught them but the error was a generic "Failed to resolve import" that didn't immediately flag the relocation as the cause.
- **Impact:** Had to manually fix 6 scene files after the move.
- **Suggested fix:** Path aliases in vite config (`@/title-animations`, `@/shared`, etc.) so scene files are portable across directory depths.

### 13. `cornerLoop.animateTo` uses untracked `setTimeout`
- **Where:** `src/shared/corner-loop.js` `animateTo()`
- **Observation:** The completion callback fires via a plain `setTimeout`, not tracked by any scene's tracker. If a scene animates the cornerLoop then is destroyed before the timeout fires, `done` fires against a destroyed scene.
- **Impact:** Edge case for rapid-skip; unlikely to surface but real.
- **Suggested fix:** Accept an optional tracker instance, or expose the handle so callers can cancel.

### 14. No cross-scene lifecycle for persistent overlays
- **Where:** `src/shared/corner-loop.js` (module-level singleton)
- **Observation:** The cornerLoop state is global. No engine-level hook to tell scenes "you're entering Act 1" vs "leaving Act 1" — each scene's `init()` must remember to call `show()` with the right args, and must not accidentally `hide()` before the next scene initializes.
- **Impact:** Correctness is by convention, not enforcement.
- **Suggested fix:** Introduce "act" grouping in `SCENE_SOURCES` with lifecycle hooks (`onActEnter`, `onActLeave`), OR give the engine a notion of shared scene-graph nodes that the director can share across scenes.

### 15. `!muted` prefix applies only to text blocks
- **Where:** `src/authoring/markdown-scene.lib.js` paragraph parser
- **Observation:** Only `text` blocks support the `!muted` marker. Quote, heading, code blocks ignore it. Not documented.
- **Suggested fix:** Document explicitly; consider a general `!dim` / `!muted` CSS class applicable to any block.

### 16. `validateScenes` runs at scene import time, throws into the app
- **Where:** `src/main.js:74` calls `validateScenes(sceneDefs)` inside `setup()`
- **Observation:** If a scene has a malformed shape (e.g., missing `init`), the error surfaces at runtime, inside the setup function, halting the app. No dev-check time surfacing.
- **Suggested fix:** Wire validateScenes into `dev-check` so scene-shape errors fail the preflight, not the runtime.

### 17. Engine's keydown handler stole keys from focused inputs
- **Where:** `src/engine/engine.js` `handleKeyDown`
- **Observation:** Engine listened for arrow keys at document level with no guard — arrow keys inside the palette input both navigated the palette list AND advanced slides simultaneously.
- **Status:** Fixed in this session — handler now bails out when the event target is an `INPUT`, `TEXTAREA`, or contenteditable.
- **Remaining:** The `main.js` authoring keybinding and this engine guard are the same pattern in two places. A shared `isInteractiveTarget(el)` helper would DRY it up.
