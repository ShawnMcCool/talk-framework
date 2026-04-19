// JSDoc typedefs for talk's scene contract and factory configs.
//
// This file declares no runtime values — it exists purely so editors (VS Code,
// JetBrains, any TS-server-aware LSP) and LLMs can resolve the shapes that
// factories accept and scenes export. Reference types from other modules with
// /** @type {import('../types.js').SceneModule} */ etc.
//
// Matches the contract enforced at startup by `src/authoring/scene-validation.lib.js`.

// =============================================================================
// Scene contract (engine-facing)
// =============================================================================

/**
 * A scene module — the unit the engine drives. Every scene registered in
 * `main.js` must satisfy this shape; `validateScenesLib` checks it at startup.
 *
 * Determinism guarantee: `resolveToSlide(n)` must produce identical visual
 * state whether reached by animating through slides 0..n or jumping directly.
 * Slide states are absolute, not deltas.
 *
 * @typedef {Object} SceneModule
 * @property {string} title
 *   Palette + navigation label. Must be non-empty.
 * @property {SlideDef[]} slides
 *   Slide list. Each slide declares how many reveal steps it contains.
 * @property {(stage: HTMLElement) => any} init
 *   Create renderer + objects, return an opaque per-scene context passed back
 *   into the other methods.
 * @property {(ctx?: any) => void} destroy
 *   Tear down the renderer, cancel in-flight animations, remove DOM.
 * @property {(ctx: any, slideIndex: number, stepIndex: number) => void} resolveToSlide
 *   Instant (no-animation) render of an absolute (slide, step) position. Used
 *   for rapid-skip navigation, scene-jumps, and initial mount.
 * @property {(ctx: any, slideIndex: number, stepIndex: number, done: () => void) => void} animateToSlide
 *   Animated transition to the target position. Must call `done()` exactly
 *   once when the animation settles (including after cancellation).
 */

/**
 * @typedef {Object} SlideDef
 * @property {number} stepCount
 *   Number of discrete reveal steps (≥1). Step indices are 0..stepCount-1.
 */

/**
 * Engine-side position cursor. 0-indexed throughout.
 * @typedef {Object} Position
 * @property {number} sceneIndex
 * @property {number} slideIndex
 * @property {number} stepIndex
 */

// =============================================================================
// createThreeScene — src/three-scenes/scene-factory.js
// =============================================================================

/**
 * Configuration for `createThreeScene`. The factory handles renderer
 * lifecycle, background color, animation cancellation, and the optional tick
 * loop — user code supplies setup + the two state functions.
 *
 * @template Objects
 * @typedef {Object} ThreeSceneConfig
 * @property {string} title
 * @property {SlideDef[]} slides
 * @property {string | number} [background]
 *   Hex color (or THREE-compatible value) for `scene.background`. Defaults to
 *   `colors.bg`.
 * @property {(ctx: ThreeSetupContext) => Objects} setup
 *   Called once during `init`. Create meshes, lights, groups; return a handle
 *   that is passed to every subsequent callback.
 * @property {(objects: Objects, ctx: { markDirty: () => void }) => void | false} [onTick]
 *   Optional per-frame callback. If provided, a `requestAnimationFrame` loop
 *   is started automatically. Return `false` to stop the loop (rare).
 * @property {(objects: Objects, ctx: ThreeStepContext) => void} resolveStep
 *   Instant (no-animation) state application for `(slideIndex, stepIndex)`.
 *   Must be deterministic — see the determinism guarantee on `SceneModule`.
 * @property {(objects: Objects, ctx: ThreeAnimateContext) => void} animateStep
 *   Animated transition. Use the injected `playTimeline` + `setTimeout` so
 *   cancellation is wired up automatically. Always call `done()` when
 *   finished (including when cancelled — `playTimeline.resolve()` calls your
 *   done callback for you).
 * @property {(objects: Objects) => void} [onDestroy]
 *   Optional extra teardown beyond renderer cleanup (e.g. disposing
 *   geometries, removing event listeners you added).
 */

/**
 * @typedef {Object} ThreeSetupContext
 * @property {import('three').Scene} scene
 * @property {import('three').OrthographicCamera} camera
 *   Default camera created by `createThreeRenderer`. Replace via
 *   `renderer.setCamera(cam)` if you need a PerspectiveCamera.
 * @property {ThreeRendererHandle} renderer
 * @property {() => void} markDirty
 *   Request a re-render on the next frame. Call after mutating object
 *   properties; the renderer is on-demand, not always-on.
 */

/**
 * @typedef {Object} ThreeStepContext
 * @property {number} slideIndex
 * @property {number} stepIndex
 * @property {ThreeRendererHandle} renderer
 * @property {() => void} markDirty
 */

/**
 * Extends ThreeStepContext with cancellation-aware animation primitives.
 * @typedef {ThreeStepContext & {
 *   playTimeline: (tweens: TweenDef[], apply: (values: Record<string, number>) => void, done: () => void) => TimelineHandle,
 *   setTimeout: (fn: () => void, ms: number) => number,
 *   done: () => void,
 * }} ThreeAnimateContext
 */

/**
 * Renderer handle returned by `createThreeRenderer`.
 * @typedef {Object} ThreeRendererHandle
 * @property {(stage: HTMLElement) => { scene: import('three').Scene, camera: import('three').OrthographicCamera, renderer: import('three').WebGLRenderer, container: HTMLElement }} init
 * @property {() => void} destroy
 * @property {() => import('three').Scene} getScene
 * @property {() => import('three').OrthographicCamera} getCamera
 * @property {(cam: import('three').Camera) => void} setCamera
 * @property {() => void} markDirty
 */

// =============================================================================
// Animation — src/animation/timeline.js
// =============================================================================

/**
 * A single tween. Linear interpolation from `from` to `to` over `duration`
 * milliseconds, optionally delayed.
 *
 * @typedef {Object} TweenDef
 * @property {string} property
 *   Key the tween writes into the values object passed to `applyFn`.
 * @property {number} from
 * @property {number} to
 * @property {number} delay
 * @property {number} duration
 */

/**
 * Handle returned by `playTimeline`. Calling `resolve()` cancels the RAF
 * loop, snaps values to their final state (by applying values at `duration`),
 * and invokes the original `doneFn`.
 *
 * @typedef {Object} TimelineHandle
 * @property {() => void} resolve
 */

// =============================================================================
// Content slides — src/components/content-slide/scene-factory.js
// =============================================================================

/**
 * @typedef {Object} ContentSlideOptions
 * @property {Partial<Record<string, string>>} [colors]
 *   Override palette entries (see `src/shared/colors.js`). Merged with the
 *   default palette.
 */

/**
 * Block types accepted by `createContentSlide` and produced by the markdown
 * compiler. Each slide is an array of blocks; `stepCount` = blocks.length.
 * Step N reveals blocks 0..N.
 *
 * @typedef {HeadingBlock | TextBlock | BulletsBlock | CodeBlock | QuoteBlock | ColumnsBlock | SpacerBlock} ContentBlock
 */

/**
 * @typedef {Object} HeadingBlock
 * @property {'heading'} type
 * @property {string} text
 * @property {1 | 2 | 3} [level]
 * @property {string} [accent]
 *   Hex color override for this heading.
 */

/**
 * @typedef {Object} TextBlock
 * @property {'text'} type
 * @property {string} text
 *   HTML is passed through verbatim.
 * @property {boolean} [muted]
 *   Render in the muted style (smaller, `colors.textMuted`).
 */

/**
 * @typedef {Object} BulletsBlock
 * @property {'bullets'} type
 * @property {string[]} items
 * @property {string} [accent]
 */

/**
 * @typedef {Object} CodeBlock
 * @property {'code'} type
 * @property {string} code
 * @property {string} [language]
 */

/**
 * @typedef {Object} QuoteBlock
 * @property {'quote'} type
 * @property {string} text
 * @property {string} [attribution]
 */

/**
 * @typedef {Object} ColumnsBlock
 * @property {'columns'} type
 * @property {ContentBlock[]} left
 * @property {ContentBlock[]} right
 */

/**
 * @typedef {Object} SpacerBlock
 * @property {'spacer'} type
 * @property {'md' | 'lg'} [size]
 */

// =============================================================================
// Section slides — src/section-slides/scene-factory.js
// =============================================================================

/**
 * @typedef {Object} SectionSlideOptions
 * @property {string} [subtitle]
 * @property {string} [accent]
 *   Hex color for rules, glow, shimmer, subtitle text.
 * @property {string} [bg]
 * @property {string} [bgDark]
 *   Darker tone used as the center of the radial background gradient.
 * @property {string} [text]
 * @property {string} [fontSize]
 *   CSS size string for the title (default `'7rem'`).
 * @property {number} [letterStagger]
 *   ms between each letter's intro animation (default `50`).
 */

// =============================================================================
// Markdown authoring — src/authoring/markdown-scene.js
// =============================================================================

/**
 * Supported frontmatter keys for `compileMarkdownScene`.
 *
 * - `title` (required) routes to scene title.
 * - `type` chooses the factory (`'content'` → `createContentSlide`,
 *   `'section'` → `createSectionSlide`). Defaults to `'content'`.
 * - All other keys are forwarded as the `options` argument of the chosen
 *   factory — so only keys in `ContentSlideOptions` / `SectionSlideOptions`
 *   are meaningful. Unknown keys are silently ignored by the factory.
 *
 * `{{tokenName}}` in the source is replaced at compile time with
 * `colors[tokenName]` from `src/shared/colors.js`.
 *
 * @typedef {Object} MarkdownFrontmatter
 * @property {string} title
 * @property {'content' | 'section'} [type]
 * @property {string} [subtitle]
 * @property {string} [accent]
 * @property {string} [bg]
 * @property {string} [bgDark]
 * @property {string} [text]
 * @property {string} [fontSize]
 * @property {number} [letterStagger]
 * @property {Record<string, string>} [colors]
 */

/**
 * Result of `parseMarkdownScene` (before factory invocation).
 * @typedef {Object} ParsedMarkdownScene
 * @property {string} title
 * @property {'content' | 'section'} type
 * @property {Record<string, unknown>} options
 *   Forwarded to the chosen factory's options argument.
 * @property {ContentBlock[][]} slides
 *   One array of blocks per slide (for `content` type only; `section` ignores).
 */

// =============================================================================
// Validation — src/authoring/scene-validation.lib.js
// =============================================================================

/**
 * @typedef {Object} ValidationReport
 * @property {number} sceneIndex
 * @property {string} title
 * @property {string[]} issues
 */

// No runtime export. File is imported purely for its JSDoc @typedef side-effect.
export {};
