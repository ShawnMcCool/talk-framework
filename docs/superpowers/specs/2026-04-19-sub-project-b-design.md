# Sub-project B — Component registry, content-aware linter, in-browser error overlay

Date: 2026-04-19
Status: Design approved, ready for implementation planning.

## Context

Sub-project A shipped the framework/content split: a `talk` CLI on PATH, free-standing content folders marked by `talk.toml`, structural lint + atomic edits, and a minimal full-screen error-placeholder card for scenes that fail to load. A's lint is structural only — it doesn't know what a content-slide is, whether a frontmatter key is recognized, whether a fenced-block info-string is meaningful.

B introduces the **component** as a first-class concept. Every visual element the framework can render — headings, bullets, quotes, code fences, spacers, paragraphs, box diagrams, future block types — is a **component** with a uniform descriptor: a name, a kind, a matcher, and `parse` / `validate` / `render` functions. A central **registry** (bootstrapped in code for now, user-extensible later) is the single source of truth the linter and the runtime both consume.

On the runtime side, B replaces the minimal full-screen error card with an **edge banner on last-good render**: author keeps their visual place in the deck while fixing, banner updates live as diagnostics change, expand state persists across updates, dismisses itself when the content is clean.

`box-diagram` — a new fenced-block component for sketching systems architecture — is built in this sub-project as the canonical non-built-in component. Its inclusion proves the registry handles third-party-style additions cleanly, not just built-ins retrofitted.

## Non-goals

- **Entity-card vocabulary** (data-model diagrams, FK arrows, cardinality labels from the box-diagram spec) — defers to sub-project C along with the broader authoring-surface extensions.
- **Chapter label / slide-number chrome** (deck-level chrome described in the box-diagram visual spec) — defers to C.
- **Framework-version drift warning** — stays in sub-project D, kept small and standalone.
- **User-extensible registry** (content folders registering their own components) — future work, explicitly scoped out so we don't design the plugin API under pressure.
- **Migration tooling** for decks authored before the refactor — there are no such decks in the wild yet beyond `archive/`, which is frozen.
- **Full CommonMark compliance** — the existing slide-subset markdown parser is kept as-is; this sub-project formalizes its output as components, not the input syntax.

## Author experience

Today, a half-typed edit that breaks parsing shows the full-screen placeholder with a stack-trace-like reason. B delivers a much tighter loop:

```
$ talk serve
  serving http://localhost:3000
  watching . (10 scenes)

  # author edits 05-sketch/scene.md, adds a box-diagram block.
  # mid-keystroke, types `api --SQL-> databas` (missing trailing `->`).
  # browser: last-good render stays visible; thin red banner at bottom:
  #   ⚠  1 error — 05-sketch/scene.md:17:3
  # click expands: "box-diagram: arrow terminator '--SQL->' invalid; expected '-->'"
  # author fixes → banner flashes "all good" → fades away.

$ talk lint
  error  05-sketch/scene.md:17:3  box-diagram  arrow references undeclared node 'apii'
  hint                                         did you mean 'api'?
  warn   07-queue/scene.md:4:1    box-diagram  section header missing on stacked diagrams
  lint: 1 error(s), 1 warning(s)
```

The same diagnostic records drive both surfaces. Warnings don't fail the CLI.

## Architecture

Three layers, well-bounded:

**Component** — a folder under `src/components/<name>/` with a `component.js` descriptor and purpose-specific pure libs (`parse.lib.js`, `validate.lib.js`, plus tests). The descriptor is the only thing the registry sees.

**Registry** — `src/authoring/component-registry.js` bootstraps by statically importing each component's descriptor and exposing lookup functions. Kept dumb on purpose: it's a Map with a few helpers, not a framework in its own right.

**Consumers** — `bin/talk-lint.js` walks scenes, dispatches to the registry, prints diagnostics. The Vite content-loader plugin (`src/authoring/content-loader-plugin.js`) and the runtime dev middleware dispatch to the same registry at build/render time, exposing diagnostics to the browser via a small HMR-adjacent channel. A new `src/authoring/error-banner.js` renders the banner on top of the last-good scene output.

```
src/
  components/
    heading/               ← new: extracted from markdown-scene.lib.js
      component.js
      render.js
    bullet-list/
    quote/
    code-fence/
    paragraph/
    spacer/
    box-diagram/           ← new component
      component.js
      parse.lib.js
      parse.lib.test.js
      validate.lib.js
      validate.lib.test.js
      render.js
    content-slide/         ← scene-type, now a block-sequence container
      component.js
      render.js
    section-slide/
      component.js
      render.js
    three-scene/           ← js-factory kind, unchanged behavior
      component.js
    svg-scene/
    title-animation/
  authoring/
    component-registry.js  ← central bootstrap + lookup
    markdown-scene.lib.js  ← refactored into block-splitter + dispatcher
    error-banner.js        ← replaces scene-placeholder in dev mode
    scene-placeholder.js   ← retained as first-render fallback only
    …
```

**Kinds.** The registry models three:

| kind             | matcher                      | examples                                 |
| ---------------- | ---------------------------- | ---------------------------------------- |
| `scene-type`     | frontmatter `type:` value    | `content-slide`, `section-slide`         |
| `markdown-block` | markdown AST block pattern   | heading, bullet-list, quote, code-fence, paragraph, spacer, box-diagram |
| `js-factory`     | module-export shape check    | `three-scene`, `svg-scene`, `title-animation` |

## Descriptor shape

```js
// src/components/box-diagram/component.js
import { parseBoxDiagram } from './parse.lib.js';
import { validateBoxDiagram } from './validate.lib.js';
import { renderBoxDiagram } from './render.js';

export const component = {
  name: 'box-diagram',
  kind: 'markdown-block',

  // How this component's usage is recognized in content.
  matcher: { infoString: 'box-diagram' },

  // Pure: source string + context → parsed data, or { error } diagnostic.
  parse(source, context) { return parseBoxDiagram(source, context); },

  // Pure: parsed data + context → array of diagnostics.
  validate(data, context) { return validateBoxDiagram(data, context); },

  // DOM producer: parsed data + render context → DOM node(s).
  render(data, renderContext) { return renderBoxDiagram(data, renderContext); },
};
```

**Matcher variants per kind:**

| kind             | matcher                                     |
| ---------------- | ------------------------------------------- |
| `scene-type`     | `{ frontmatterType: 'content' }`            |
| `markdown-block` | `{ blockType: 'heading' }` (built-in, matches splitter token type) or `{ infoString: 'box-diagram' }` (custom, matches fenced-code info string) |
| `js-factory`     | `{ factoryExport: 'createThreeScene' }` (identifies which scene modules this validator applies to — the factory call result is what we validate, not the factory function itself) |

**Responsibilities per kind.**

**Built-in `markdown-block`** components (heading, bullet-list, quote, code-fence, paragraph, spacer) — the block splitter already recognizes these natively and hands the component a pre-shaped payload. Their `parse` is a pass-through of that payload (or omitted; registry treats `undefined` as pass-through). `validate` is trivial or absent. Real work is in `render`.

**Custom `markdown-block`** components (box-diagram, future additions) — the splitter recognizes the fenced code block by info-string and hands over the raw block body as a string. The component's `parse` does the real work of turning that string into structured data.

**`js-factory`** components (`three-scene`, `svg-scene`, `title-animation`) — no `parse`; the content IS the exported JS module (produced by calling the factory). `validate` checks the resulting module has the required shape: `title` string, `slides` array, `init`/`destroy`/`resolveToSlide`/`animateToSlide` functions. No `render` on the descriptor — the scene module provides its own lifecycle.

**`scene-type`** components (`content-slide`, `section-slide`) — `parse` consumes frontmatter + body, invokes the splitter, and produces a structured scene record. `validate` iterates over child blocks and aggregates their diagnostics. `render` is a container/router: for each block, look up the `markdown-block` component in the registry, call its render, append to the stage.

## Diagnostic record

Single shape. Same record flows to the CLI printer and the browser banner.

```js
{
  severity: 'error' | 'warn',
  component: 'box-diagram',
  file: '05-sketch/scene.md',           // relative to content root
  line: 17,
  column: 3,
  message: "arrow references undeclared node 'apii'",
  hint: "did you mean 'api'?",          // optional
  span: {                                // optional, richer highlight
    start: { line: 17, column: 3 },
    end:   { line: 17, column: 26 }
  },
}
```

Severity is just `error` / `warn`. Warnings do not fail `talk lint`; errors do. CLI renders as fixed-width columns with relative paths (clickable in modern terminals).

## Edge banner on last-good render (dev mode)

**Baseline.** Baseline is **per-scene**. When any given scene renders successfully, the framework retains that scene's resulting DOM and the context that produced it. Subsequent failed compilations of that scene do not tear this down; the banner renders on top of it. Each scene has its own last-good baseline.

**Banner element.** A slim red bar pinned to the bottom edge of the viewport, styled to stay out of the way. Collapsed summary: `⚠  N errors, M warnings — <first file>:<line>:<col>`. One-line height.

**Expansion.** Click anywhere on the banner to expand into a scrollable list of all current diagnostics, each with file/line/col, component, message, and hint. Click again (or press Escape) to collapse.

**Live update.** When the diagnostic set changes (file saved, compilation re-run), the banner re-renders in place — no dismount, no flash. If expanded, stays expanded through the update; if collapsed, stays collapsed.

**Clear path.** When all diagnostics clear on the next compile, banner flashes "all good" for ~1s then fades out. Next error re-materializes it.

**First-render-fails fallback.** No last-good baseline exists yet → render the existing full-screen error-placeholder card (current behavior, `src/authoring/scene-placeholder.js`). Once the author's next edit produces a successful render, the baseline is established and subsequent failures switch to banner mode.

**Prod/presented mode.** Banner logic is dev-only. Presented decks fall back to full-screen placeholder for a failed scene, exactly as today — no silent masking during a live talk.

## box-diagram authoring syntax (v1)

Fenced code block with info-string `box-diagram`. Zero disruption to markdown editors (same pattern as Mermaid/Graphviz/Kroki).

**One block = one diagram.** When a slide wants two diagrams stacked, the author writes two adjacent blocks; the framework auto-inserts the horizontal divider rule.

**Block body** is declare-then-connect:

```
box <short-id> [<"display label">]  [role=<role>]  [subtitle="…"]
…
<src-id>  --  <arrow-label>  -->  <dst-id>
```

- Short ID is **always required**. It IS the default display. A quoted label overrides the display without changing the reference. Parser rule: one bareword = both ID and display; bareword + quoted string = ID + override.
- `role` is one of `external` (default, neutral border), `accent` (cyan), `warm` (amber). Reused across the deck to teach color-role mapping.
- `subtitle` is optional, named (not positional), muted second line under the box label.
- Arrow label: everything between ` -- ` and ` --> `, trimmed. No quoting. Literal `-->` forbidden inside labels (rare-enough constraint).
- Roles, labels, and IDs are case-sensitive.
- Fan-out and fan-in use multiple flow lines referencing the same node IDs.
- Bidirectional relationships are two flow lines (spec rule — no double-arrow glyph).
- Optional `section: "TITLE"` on its own line sets the small-caps header above the diagram. Omit when the slide has only one diagram.

**Example scene:**

````markdown
---
title: Three boxes
---

# Three boxes, one table.

```box-diagram
section: THE SYSTEM
box client                              subtitle="browser / app"
box api         "My Blah API"           role=accent
box database                            role=warm

client -- POST /purchase --> api
api    -- SQL             --> database
```
````

**Out of scope in B (deferred to C):** `entity` declarations, FK/cardinality arrows, deck-level chapter/slide-number chrome, any `[palette]` wire-up.

## Linter

`bin/talk-lint.js` rewrites around the registry. Pipeline:

1. Walk scenes via `discoverScenes`.
2. For each scene, resolve its scene-type component from frontmatter `type:` (default `content-slide`).
3. Call the scene-type's `parse`. This splits the body into typed blocks and delegates each block's `parse` to the matching `markdown-block` component via the registry.
4. Aggregate diagnostics from scene-type `validate` (which calls each block's `validate`).
5. Also lint `talk.toml` (unchanged from A).
6. Print diagnostics in fixed-width columns; exit 1 iff any `error` severity.

## Runtime dispatch

The Vite content-loader plugin and the runtime renderer consume the same registry. On hot reload, the compile-and-render cycle emits diagnostics into an HMR-adjacent channel the banner subscribes to.

**Pipeline** on a single scene re-render:

1. Parse scene via scene-type component.
2. Validate — collect diagnostics.
3. If diagnostics contain errors: banner receives the new set; last-good DOM stays mounted; **skip** re-render.
4. If no errors: swap the stage to the new render; if warnings exist, they appear in the banner but don't block. Mark this render as the new baseline.

## Migration of existing built-ins

`markdown-scene.lib.js` is split in two: the block-boundary splitter stays (finds fence starts/ends, blank-line-separated blocks, etc.); the **per-block-type shaping logic** moves out into each component's `parse.lib.js`. The splitter's job is only to identify block boundaries and dispatch to the registry — not to shape block-specific fields. This keeps the promise that adding a new `markdown-block` component means touching only that component's folder and the registry bootstrap.

Each `{ type: 'heading' | 'bullets' | 'quote' | 'code' | 'text' | 'spacer' }` token becomes an input to the corresponding registered `markdown-block` component:

| current token           | new component (folder)            |
| ----------------------- | --------------------------------- |
| `{ type: 'heading' }`   | `src/components/heading/`         |
| `{ type: 'bullets' }`   | `src/components/bullet-list/`     |
| `{ type: 'quote' }`     | `src/components/quote/`           |
| `{ type: 'code' }`      | `src/components/code-fence/`      |
| `{ type: 'text' }`      | `src/components/paragraph/`       |
| `{ type: 'spacer' }`    | `src/components/spacer/`          |

`content-slide` becomes the block-sequence container; `section-slide` is unchanged behaviorally, just relocated under `src/components/section-slide/`. JS factories (`three-scene`, `svg-scene`, `title-animation`) relocate under `src/components/<name>/` with a minimal `component.js` that declares `kind: 'js-factory'` and a structural validator.

Existing tests move with their libs and keep passing (no behavioral change for built-ins).

## Testing strategy

- **Per-component pure libs** (`parse.lib.js`, `validate.lib.js`) get TDD'd .lib.test.js files. Reds before greens.
- **Registry** gets a unit test ensuring each registered descriptor has a valid shape.
- **Linter integration** gets fixture-based tests: a fixture scene folder with intentional errors → golden diagnostics.
- **box-diagram** parser gets exhaustive tests: all grammar productions (box with/without display/subtitle/role; flow lines; fan-out; multi-block slides; bad-input diagnostics).
- **Banner** gets a minimal integration test (jsdom or a Vite test page) covering: appear on error, update in place, preserve expand state, dismiss on clear.
- Full suite: `talk test` stays green. Target is 184 + net new tests at parity or better.

## Open decisions

None. All design questions resolved in the brainstorming session on 2026-04-19.

## Success criteria

- `talk lint` on a fixture with known errors produces the exact expected diagnostic list (CLI + diagnostic-record parity).
- A half-typed edit in a box-diagram block does not tear down the dev-server render; the banner appears within one HMR cycle; the last-good render stays visible.
- Adding a new fictional `markdown-block` component (e.g. a stub `hello-world` one) is a 30-line exercise: create folder, write descriptor with three functions, append one import to the registry bootstrap — no other framework file touched.
- All pre-existing built-ins (heading, bullets, etc.) pass the existing sample-talk fixture's visual regression (or equivalent end-to-end navigation test) unchanged.
- `talk test` reports no regression in A's 184 tests and adds coverage for the new components, registry, linter pipeline, and banner.
