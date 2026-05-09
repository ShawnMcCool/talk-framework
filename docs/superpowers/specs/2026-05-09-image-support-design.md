# Image support — single images, image rows, step-gated reveal

Date: 2026-05-09
Status: Design approved, ready for implementation planning.

## Context

Today the markdown authoring surface covers headings, paragraphs, bullets, quotes, code fences, spacers, and `box-diagram`. Authors can build a deck of words and structured diagrams, but cannot drop a screenshot, a logo, a photograph, or a sequence of comparison shots into a slide. This is the most common gap surfaced from real-world authoring use.

This spec adds an `image` markdown-block component: a single inline rule for the common case (one centered image), an automatic row layout for the side-by-side case (multiple images, evenly spaced and centered), and step-gated reveal for the build-up-a-row case — all expressed in standard markdown syntax (`![alt](src)`) without requiring authors to learn a new fenced DSL.

## Non-goals

- **Author-facing sizing knobs.** No `width=`, `height=`, alignment, or column overrides in v1. Defaults handle the cases the brief calls out; richer controls earn their place when a deck genuinely demonstrates the need.
- **Visible captions.** `alt` is honored as accessible text on the rendered `<img>` but not displayed. Authors who want a visible caption write a paragraph beneath — already a solved authoring problem.
- **Image transformations.** No build-time resizing, format conversion, or responsive-srcset generation. The browser displays the asset as-shipped.
- **Image-in-bullet / inline-with-text.** A paragraph that mixes prose and images (`Look at this ![](a.png) right there`) stays a regular paragraph with an inline image — the auto-row rule applies only to image-only paragraphs.
- **Lazy-loading or asset bundling beyond what Vite already does.** Dev-server serves the file from disk; production builds will follow whatever bundling story the framework gains later, when it gains one.
- **Fenced `images` DSL.** Considered and rejected — the markdown-only path covers every case in the brief and one syntax is better than two.

## Author experience

```markdown
---
title: A walk through the system
---

# Single hero image — centered, sized to fit

![architecture diagram](architecture.png)

---

# Three shots side-by-side

![client](client.png)
![api](api.png)
![database](database.png)

---

# Build a row, image by image

![client](client.png)
+++
![api](api.png)
+++
![database](database.png)
```

Three rules cover the surface:

1. **Image-only paragraph, one image** → centered single image, scaled to fit the slide content area.
2. **Image-only paragraph, multiple images** → centered row, equal-width columns with consistent gap, all visible at the same step.
3. **Image-only paragraphs separated only by `+++`, with no other blocks between them** → merged into a single row whose images become visible one per step. (If any non-image block appears between two `+++` markers in the run, the merge stops; remaining image blocks render as their own rows.)

Path resolution:

- `![](diagram.png)` — bare path, resolved relative to the scene's directory.
- `![](/images/logo.png)` — leading slash, resolved relative to the content folder root (the directory containing `talk.toml`).

The linter validates that every referenced image file exists at lint time and uses an extension the browser can render (`.png .jpg .jpeg .gif .webp .svg .avif`). Missing files produce a `path:line` error; unsupported extensions produce a warning.

## Architecture

A new component under `src/components/image/`, registered via the existing component-registry pattern.

```
src/components/image/
  component.js          ← descriptor: { name: 'image', kind: 'markdown-block', matcher, parse, render, validate }
  parse.lib.js          ← pure: paragraph token → { type: 'image-row', images: [{ src, alt, step }] } | null
  parse.lib.test.js
  resolve-path.lib.js   ← pure: (src, sceneDir, contentRoot) → resolved file path
  resolve-path.lib.test.js
  validate.lib.js       ← pure: parsed block + filesystem oracle → diagnostics
  validate.lib.test.js
  render.js             ← data → DOM (single vs row, per-image visible-from-step)
```

The compile pipeline gains one rule, applied during the existing block-walk that produces a slide's block sequence:

> When walking a slide's reveal-step chunks, identify any contiguous run of chunks where each chunk contains exactly one paragraph and that paragraph contains only image inline tokens (and whitespace). Collapse the run into a single `image-row` block; for each image in the merged block, record the step index of the chunk it came from. A single chunk in the run is a degenerate "row of one with one step" — i.e. a centered single image visible from step 0.

This means the same `image-row` block type covers all three rules: single image, all-at-once row, step-gated row. The renderer branches on `images.length` (1 vs n) for layout, and on `images[i].step` for visibility.

Path resolution is a pure function (`resolve-path.lib.js`): given a `src` string, the scene directory, and the content root, return the absolute on-disk path. Bare paths resolve from the scene directory; leading-slash paths resolve from the content root. The linter and the Vite content-loader plugin both consume this function — the linter to check existence at lint time, the plugin to map paths to URLs the dev server serves.

The Vite content-loader plugin (`src/authoring/content-loader-plugin.js`) already has access to scene paths and the content root. It rewrites resolved image paths to URLs the dev server can serve directly from disk — no new asset-pipeline machinery. Production-build path handling rides whatever Vite already does for static assets referenced from emitted HTML/CSS.

## Component descriptor

The descriptor follows the established `markdown-block` shape:

```javascript
// src/components/image/component.js
import { parseImageBlock } from './parse.lib.js';
import { validateImageBlock } from './validate.lib.js';
import { renderImageBlock } from './render.js';

export const component = {
  name: 'image',
  kind: 'markdown-block',
  matcher: { blockType: 'image-row' },
  parse: parseImageBlock,
  validate: validateImageBlock,
  render: renderImageBlock,
};
```

Two integration touchpoints (both already exist for other components, just need the new wiring):

- `src/authoring/component-registry.js` — register the descriptor.
- The markdown compile pipeline — invoke the image-row detection rule during block-walking, before generic paragraph emission.

## Renderer output

```html
<figure class="cs-image-row" data-count="3">
  <img src="<resolved-url>" alt="..." data-visible-from="0" />
  <img src="<resolved-url>" alt="..." data-visible-from="1" />
  <img src="<resolved-url>" alt="..." data-visible-from="2" />
</figure>
```

CSS (in the content-slide stylesheet, alongside the other block styles):

- `.cs-image-row` — flex container, `justify-content: center`, `align-items: center`, gap between children, `max-width` and `max-height` bounded by slide content area.
- `.cs-image-row[data-count="1"] img` — `max-width: 70%`, `max-height: 100%`, `object-fit: contain`.
- `.cs-image-row[data-count]:not([data-count="1"]) img` — `flex: 1 1 0`, `min-width: 0`, `max-height: 100%`, `object-fit: contain`. Even-width columns; tall images get cropped vertically by `object-fit` rather than overflowing.
- `img[data-visible-from]` — opacity and transform driven by a class the existing step machinery already toggles. Same mechanism the other reveal-aware blocks use; no new wiring.

## Linter behavior

The image component contributes one validator and a small set of diagnostics:

- **error** `image: file not found` — `src` resolved to a path that doesn't exist on disk. Reported at the line/column of the image token.
- **warning** `image: unsupported extension` — `src` resolves but the extension isn't in the allow-list (`.png .jpg .jpeg .gif .webp .svg .avif`). The file is left in place; the browser may or may not render it.
- **error** `image: missing src` — `![alt]()` with an empty path. (markdown-it would typically produce no image token here, but defend against it.)

`alt` is never required; an empty alt is valid and signals decorative use. No diagnostic for it.

The linter validator receives a filesystem oracle (a small interface — `exists(path: string): boolean`) so the test suite can drive validation without touching disk. The CLI wires up the real oracle.

## Test strategy

Pure-function libs get TDD coverage:

- `parse.lib.test.js` — image-only paragraph detection (one image, multiple, mixed-with-text negative case), `+++`-merge run detection (full run, broken run, single-chunk degenerate, run with non-image block in the middle).
- `resolve-path.lib.test.js` — bare-path resolution, leading-slash resolution, path normalization, traversal-attempt rejection (`../../../etc/passwd` style).
- `validate.lib.test.js` — file-not-found, unsupported-extension, missing-src, all-good cases, with mocked filesystem oracle.

Integration coverage:

- A small fixture deck under `fixtures/sample-talk/` (or a new fixture) exercises a single-image scene, a row-of-three scene, and a step-gated-row scene; the existing CLI integration tests assert lint passes and the generated block tree matches expected shape.
- The renderer is exercised via the existing render-snapshot pattern if one exists for other blocks, or via DOM assertion on a small jsdom test if not. (Match whatever the existing block components do.)

End-to-end browser rendering is verified manually until a browser test harness lands (see `todo.md` §3).

## Migration

No existing decks reference images via the framework. Adding the component is purely additive — no changes to existing scenes, no compatibility shims.

## Risk and open questions

- **Image dimensions vs. slide layout.** A very tall image in a row could push other slide content. The `max-height: 100%` cap mitigates this, but real-world authoring will reveal cases the defaults don't handle. Plan: ship the defaults, see what breaks, add knobs only when a real deck demands them.
- **Path resolution edge cases.** Symlinks, paths with `..`, paths with spaces or unicode. The `resolve-path.lib.js` tests should cover the obvious traversal-rejection case; further hardening can wait for a concrete bug report.
- **Vite asset URLs in production builds.** Dev server serves from disk; production may need explicit `assetsInclude` or similar plugin tweaks. Defer concrete production-build verification until the framework grows a production-build story (it doesn't have one today beyond `vite build` defaults).

## Out of scope, will revisit

- Author-facing sizing/alignment overrides.
- Visible captions as a first-class block.
- Image transformations (resizing, format conversion, srcset).
- Animated transitions on image reveal beyond the existing step-fade pattern.
- Image components inside box-diagrams or other compound blocks.
