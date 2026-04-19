# Authoring layer

**Path:** `src/authoring/`

## Purpose

Compile markdown scene files into `SceneModule`s and validate the scene
registry at startup. This is the glue between content (markdown) and the
generic factories (`createContentSlide` / `createSectionSlide`).

## Pipeline

```
*.md?raw  ──►  parseMarkdownScene (lib)  ──►  compileMarkdownScene  ──►  SceneModule
                 │                              │
                 │ frontmatter → options        │ options.type →
                 │ body        → slides/blocks  │   'section' → createSectionSlide
                 │                              │   'content' → createContentSlide
                 └── pure (tested headless)     └── imports the factories
```

The parser (`markdown-scene.lib.js`) is pure and DOM-free; its tests run in
Node. The compiler (`markdown-scene.js`) is thin: frontmatter `type` picks
the factory, everything else is forwarded as options.

## What the parser accepts

Block-level grammar is intentionally small. See
`docs/markdown-authoring.md` for the complete block + frontmatter reference,
and `ContentBlock` in `src/types.js` for the produced shape.

Notable nuances:
- `---` separates slides; inside a fenced code block it is ignored.
- A paragraph starting with `!muted ` gets `{ muted: true }` on the text
  block.
- `:directive:` or `:directive size:` produces `{ type: directive, size }` —
  currently only `spacer` is rendered; unknown directives are emitted but
  ignored by the factory.
- Unknown frontmatter keys are **silently forwarded** to the factory, which
  silently ignores unknown options. Typos won't warn today.
- `{{tokenName}}` is interpolated before parsing, from the `colors` map
  passed by `compileMarkdownScene`.

## Validation

`validateScenes(sceneDefs)` is run once at startup from `main.js`. It
checks every registered scene against `SceneModule` (title, required
methods, `slides` shape). It **logs**, it does not throw — a broken scene
surfaces as a console warning without killing the deck.

## Invariants

- **Parser has no imports from rendering / factories.** Keeps it testable.
- **`compileMarkdownScene` returns a fully-formed `SceneModule`.** The rest
  of the app cannot tell a markdown-authored scene from a hand-rolled one.

## Component registry

**Path:** `src/authoring/component-registry.js`

The registry is the single inventory of every component the framework
knows about. Lint-time validation and runtime rendering both look up
components through it, so a component registered once is automatically
available in both contexts.

### Descriptor shape

A registered component is a plain object with these fields:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | string | yes | Globally unique identifier. |
| `kind` | `'scene-type'` \| `'markdown-block'` \| `'js-factory'` | yes | Categorizes how the component is resolved. |
| `matcher` | object | yes | Tells the registry how to index this component for lookup (see below). |
| `parse(input, context)` | function | no | Normalizes raw content into the `data` shape the renderer/validator expects. |
| `validate(data, context)` | function | no | Returns an array of diagnostic records. |
| `render(data, renderContext)` | function | no | Returns a DOM node (for `markdown-block` components). |

**Matcher shapes** — exactly one key is set per component:

| Matcher key | Kind | Matched by |
| --- | --- | --- |
| `{ frontmatterType: string }` | `scene-type` | `type:` frontmatter value (e.g. `"content"`, `"section"`). |
| `{ blockType: string }` | `markdown-block` | Block type emitted by the markdown splitter (e.g. `"heading"`, `"bullets"`). |
| `{ infoString: string }` | `markdown-block` | Fenced-code info-string — the word after the opening ` ``` ` (e.g. `"box-diagram"`). |
| `{ factoryExport: string }` | `js-factory` | Named export used for scene-level component resolution. |

### The three kinds

**`scene-type`** — top-level scene dispatcher. Selected when `compileMarkdownScene` reads
the `type:` frontmatter key (default `"content"`). Current components: `content-slide`,
`section-slide`.

**`markdown-block`** — one of the author-level building blocks inside a content slide.
Looked up by block type or info-string. Current components: `heading`, `paragraph`,
`bullet-list`, `quote`, `code-fence`, `spacer`, `box-diagram`.

**`js-factory`** — a JS helper that wraps renderer/lifecycle boilerplate. Scenes authored
in JS call these directly; the registry entry exists primarily for tooling discovery.
Current components: `three-scene`, `svg-scene`, `title-animation`.

### Dispatch at runtime and lint-time

Both paths use the same two lookups:

```javascript
registry.getByInfoString(block.language)  // fenced code blocks
registry.getByBlockType(block.type)        // everything else
```

- **Lint-time:** `bin/talk-lint.js` walks every scene's blocks and calls these lookups to
  find the component that validates each block. Diagnostics are aggregated and reported as
  `file:line` errors.
- **Runtime:** `content-slide/scene-factory.js` calls the same lookups in its `renderBlock`
  function to dispatch rendering.
- **HMR diagnostics:** the Vite plugin (`content-loader-plugin.js`) re-runs the lint
  pipeline when a `scene.md` changes and emits `talk:diagnostics` events to the dev-mode
  banner in the browser.

### How to add a new component

1. Create `src/components/<name>/`.
2. Write `component.js` exporting a `component` object with the descriptor fields above.
3. In `src/authoring/component-registry.js`, add:
   ```javascript
   import { component as <aliasedName> } from '../components/<name>/component.js';
   ```
   and at the bottom:
   ```javascript
   registry.register(<aliasedName>);
   ```
4. Add a bootstrap test in `src/authoring/component-registry.test.js`.
5. For `markdown-block` components, rendering logic lives in a sibling `render.js`. For DSL
   components (e.g. `box-diagram`), add `parse.lib.js` / `validate.lib.js` with TDD test
   coverage following the pure-function pattern (`*.lib.js` / `*.lib.test.js`).

## Common pitfalls

- **Typoed frontmatter key** (`acent: "#ff0"`). No warning; factory just
  uses its default.
- **Missing `title` frontmatter.** Throws — this is the one hard failure.
- **`---` inside a quoted block.** It will still split the slide because
  the split happens at the line level (fenced code is the only context
  that protects it).
- **HTML in markdown.** Passed through verbatim, which is great for
  custom color spans (`<span style="color:{{beam}}">…</span>`) but means
  an unclosed tag leaks into the rest of the slide.
