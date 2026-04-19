# talk

A reusable presentation framework. Decks are authored as free-standing folders of markdown (and optional JS) scenes. The framework renders them through a Three.js + vanilla JS + Vite stack.

**Status:** the framework itself is content-neutral — every piece of content lives outside `src/`. A presentation is any folder with a `talk.toml` at its root. See [`examples/`](examples/) for runnable reference decks and [`docs/markdown-authoring.md`](docs/markdown-authoring.md) for the full syntax reference.

## Install

Symlink the `talk` dispatcher onto your PATH:

```bash
ln -s "$PWD/talk" ~/.local/bin/talk
```

The dev server and tests run inside Docker, so Docker Compose is required. No host Node is needed for day-to-day use. When you bump a dependency in `package.json`, refresh the container's `node_modules` volume with:

```bash
docker compose run --rm app npm install
```

## Quick start

```bash
talk new my-talk        # scaffolds ./my-talk/ with a starter scene
cd my-talk
talk serve              # live-reloading dev server at http://localhost:3000
talk lint               # validate structure + content before sharing
```

## Concepts

A deck has three levels of structure. Authoring vocabulary uses these words consistently — the CLI, the linter, the dev overlays, and the URLs all speak in terms of **scene** / **slide** / **step**.

### Deck (presentation, talk)

A folder with a `talk.toml` at its root. `talk.toml` carries the title and `framework_version`; everything else lives in numbered scene subdirectories:

```
my-talk/
  talk.toml
  01-welcome/scene.md
  02-why-it-matters/scene.md
  03-architecture/scene.js
```

The deck is free-standing — it can live anywhere on disk, contain arbitrarily many scenes, and the framework has no knowledge of any specific deck. `talk <command> [path]` resolves the deck by walking up from `$PWD` (or the given path) to the nearest `talk.toml`.

### Scene

One folder, one scene module. Each scene directory is prefixed with a two-digit index (`01-`, `02-`, …) that determines ordering. Structural edits (`talk add/remove/rename/move`) renumber atomically.

A scene module exports the engine's contract:

```js
{
  title,                                   // palette + nav label
  slides: [{ stepCount }, ...],            // how many reveal steps per slide
  init(stage),                             // set up renderer + objects
  destroy(),                               // tear it all down
  resolveToSlide(ctx, slideIndex, stepIndex),  // jump instantly
  animateToSlide(ctx, slideIndex, stepIndex, done),  // animate and call done()
}
```

Scenes come in two flavours:

- **`scene.md`** — markdown-authored. A pure function turns the source into a scene module by selecting a scene-type component (`content-slide` by default, `section-slide` for `type: section` frontmatter) and compiling the body into blocks.
- **`scene.js`** — JS-authored. Use a factory from the components catalogue (`create3DScene`, `createSvgScene`, `createTitleScene`) to absorb the renderer / lifecycle / cancellation boilerplate.

Pick one or the other per folder — never both.

### Slide

One scene can contain one or many slides. In a content-slide, `---` on its own line separates slides:

```markdown
---
title: A two-slide scene
---

# First slide

- point one
- point two

---

# Second slide

- point three
```

In a JS scene, slides are declared explicitly: `slides: [{ stepCount: 3 }, { stepCount: 1 }]` means two slides, three reveal steps on the first, one on the second.

### Step

A slide reveals in one or more **steps**. By default a slide is a single step — every block shows at once. Put `+++` on its own line to split a slide into additional steps; step `0` shows the blocks before the first `+++`, step `1` adds the blocks up to the next `+++`, and so on. Arrow-key navigation cycles through every step of every slide of every scene in order.

```markdown
# Principles

A short intro paragraph.

+++

- bullet that lands on click
- another bullet
```

**Determinism:** `resolveToSlide(n)` must produce identical visual state whether reached by animating through slides `0..n` or jumping directly. Slide states are absolute, not deltas. The command palette's `Jump to Slide...` (e.g. `9.2.1` for scene 9, slide 2, step 1) depends on this.

## Authoring approach

1. **Scaffold** a deck with `talk new <name>`, or start from a copy of one of the runnable references in [`examples/`](examples/).
2. **Write markdown first.** Most slides are a heading, some bullets, maybe a quote — that's all markdown. Frontmatter (`title`, `type`, `accent`, `colors`) tunes the look. See [`docs/markdown-authoring.md`](docs/markdown-authoring.md) for the full grammar.
3. **Drop into JS only when you need to.** Dedicated 3D scenes, SVG diagrams, and dramatic title intros live in `scene.js` files that import a factory. The factories in `src/components/<name>/scene-factory.js` handle renderer setup, animation cancellation, and the two-step slide contract so you only write setup + per-step state.
4. **Lean on registered components.** `box-diagram` gives you flow diagrams without drawing them; `title-animation` gives you six letter-in animations for openers; `content-slide` handles every combination of headings, bullets, quotes, code, and spacers. The linter understands every registered component and will surface authoring mistakes with file/line context.
5. **Run `talk serve`** while you edit. The dev server reloads on every save and surfaces linter diagnostics as an edge banner over the last-good render, so a half-typed block doesn't blank the screen.
6. **Run `talk lint`** before sharing. Zero exit code means every block parses and every box-diagram reference resolves.

See [`todo.md`](todo.md) for open sub-projects (markdown bridges for the JS factories, `[palette]` wire-up, framework-version drift warnings).

## CLI

Every subcommand that touches a presentation resolves the presentation root by walking up from `$PWD` (or the given `path`) to the nearest `talk.toml`. All structural edits support `--dry-run` for preview.

| Command | Purpose |
|---------|---------|
| `talk new <name> [--force] [--dry-run]` | Scaffold a new presentation at `./<name>/` with `talk.toml` and one starter scene. |
| `talk add <slug> [--after N \| --first] [--dry-run]` | Add a new empty scene. Defaults to appending. |
| `talk remove <N> [--dry-run]` | Delete scene `N`. Later scenes renumber to close the gap. |
| `talk rename <N> <new-slug> [--dry-run]` | Change scene `N`'s slug (number preserved). |
| `talk move <N> <before\|after\|first\|last> [<M>] [--dry-run]` | Reorder scenes atomically. |
| `talk list` | Print the scenes of the current presentation, one per line. |
| `talk serve [path]` | Live-reloading dev server on http://localhost:3000. |
| `talk lint [path]` | Validate structure and per-block content. Exits `1` on error. |
| `talk version` | Print the installed framework version. |
| `talk test` | Run the framework's own tests (framework repo only). |
| `talk help [<command>]` | Show usage. |

## Dev-mode UX

- Arrow keys step through slides and reveal steps.
- **Escape** opens the command palette. `Jump to Slide...` accepts `scene.slide.step` (e.g. `9.2`).
- **`o`** opens the current scene's source file in `$EDITOR` (falls back to clipboard).
- **`n`** / **`d`** toggle the navigation / debug overlays.
- A red edge banner appears when the dev server detects diagnostics; click to expand.

## Components

Every renderable element in a deck is registered in [`src/authoring/component-registry.js`](src/authoring/component-registry.js) and lives under [`src/components/<name>/`](src/components/). The registry distinguishes three **kinds**:

- **`scene-type`** — top-level scene dispatchers. Selected by the frontmatter `type:` field.
- **`markdown-block`** — author-level building blocks inside a content slide.
- **`js-factory`** — helpers that wrap renderer boilerplate for scenes authored in JS.

The linter and the runtime both dispatch through the registry, so adding a new component (see [`docs/architecture/authoring.md`](docs/architecture/authoring.md)) lights it up everywhere.

### Scene types

#### `content-slide`

Default scene type. Frontmatter `type: content` (or omitted). The body is a sequence of markdown blocks separated by blank lines; `---` on its own line starts a new slide.

```markdown
---
title: Why it matters
type: content
---

# Heading

- first point
- second point
```

See [`docs/markdown-authoring.md`](docs/markdown-authoring.md) for frontmatter keys (`accent`, `colors`, …) and the full block grammar.

#### `section-slide`

Large titled section break. Frontmatter `type: section`. Body is ignored; everything is driven by frontmatter.

```markdown
---
title: Part Two — Common pitfalls
type: section
subtitle: Where reviews go wrong, and how to recover
---
```

Frontmatter: `title` (required), `subtitle`, `accent`, `bg`, `bgDark`, `text`, `fontSize`, `letterStagger`.

### Markdown-block components

Authored inline inside a content slide. Multiple blocks in the same slide render together as one step unless separated by `+++`.

#### `heading`

```markdown
# H1 title
## H2 subheading
### H3 caption
```

Optional frontmatter `accent: "#aaccff"` tints H2 and bullets throughout the scene.

#### `paragraph`

Any non-block prose line. Prefix with `!muted ` to render as muted secondary text.

```markdown
A normal sentence.

!muted A muted aside in a smaller, quieter style.
```

#### `bullet-list`

Consecutive lines starting with `-` or `*`. A blank line ends the list.

```markdown
- first item
- second item
- third item
```

#### `quote`

Lines starting with `>`. A trailing line starting with `—` or `--` is captured as the attribution.

```markdown
> Make it work, make it beautiful, make it fast.
> — Joe Armstrong
```

#### `code-fence`

Fenced code block with optional language label. The language becomes `data-language` on the rendered `<pre>`.

````markdown
```js
function greet(name) {
  return `hello, ${name}`;
}
```
````

If the info-string matches a registered custom component (e.g. `box-diagram`), the fence dispatches there instead. Otherwise the generic code-fence renders.

#### `spacer`

A vertical gap. Directive-style.

```markdown
:spacer:       # default (md)
:spacer lg:    # larger gap
```

#### `box-diagram`

A fenced code block with info-string `box-diagram`. Declare-then-connect DSL for simple flow diagrams — same editor-friendly pattern as Mermaid or Graphviz.

````markdown
```box-diagram
section: READ PATH
box client
box api   role=accent
box cache
box db    role=warm

client -- HTTP        --> api
api    -- check first --> cache
cache  -- fall through --> db
```
````

- `box <id> ["label"] [role=external|accent|warm] [subtitle="…"]` — the id is always required. A quoted string overrides the display label.
- `<src> -- <label> --> <dst>` — arrow label is everything between `--` and `-->`, trimmed.
- Optional `section: TITLE` on its own line sets a small-caps header.
- The linter flags undeclared arrow endpoints, duplicate node ids, and empty diagrams, with "did you mean 'api'?" hints on typos.

### JS factory components

Imported in `scene.js`. Each factory absorbs the renderer / lifecycle / cancellation boilerplate so authors only write the interesting bits. See [`examples/3d-scene/`](examples/3d-scene/), [`examples/svg-scene/`](examples/svg-scene/), [`examples/title-animation/`](examples/title-animation/) for runnable references.

#### `3d-scene`

Three.js scene with background colour, on-demand rendering, and auto-cancelled animations.

```js
import { create3DScene } from '/@fs/app/src/components/3d-scene/scene-factory.js';

export const myScene = create3DScene({
  title: 'My 3D scene',
  slides: [{ stepCount: 3 }],
  setup({ scene, camera }) { /* build objects; return handle */ },
  onTick(objects, { markDirty }) { /* optional per-frame update */ },
  resolveStep(objects, { slideIndex, stepIndex }) { /* absolute state */ },
  animateStep(objects, { stepIndex, playTimeline, markDirty, done }) {
    // playTimeline + setTimeout are auto-cancelled on the next transition.
    // Always call done() when the step finishes.
  },
});
```

`onTick` runs every frame until it returns `false`. `markDirty` requests a repaint; Three.js scenes don't run a continuous loop unless `onTick` is supplied.

#### `svg-scene`

Retained-mode SVG scene with an HTML overlay `<div>` for non-SVG chrome.

```js
import { createSvgScene } from '/@fs/app/src/components/svg-scene/scene-factory.js';

export const myScene = createSvgScene({
  title: 'My SVG scene',
  slides: [{ stepCount: 2 }],
  viewBox: '0 0 1000 600',
  setup({ svg, html, container }) { /* build elements; return handle */ },
  resolveStep(objects, { slideIndex, stepIndex }) { /* absolute state */ },
  animateStep(objects, { stepIndex, playTimeline, setTimeout, done }) { /* … */ },
});
```

SVG is retained-mode, so there's no `markDirty` loop — mutations are visible immediately.

#### `title-animation`

Dramatic title intro. The factory handles camera framing, intro overlay, and the two-step slide contract; the author picks an animation variant.

```js
import {
  createTitleScene,
  typewriterAnimation,
} from '/@fs/app/src/components/title-animation/index.js';

export const opener = createTitleScene(
  'Opener',
  typewriterAnimation('HELLO, TALK'),
);
```

Variants: `typewriterAnimation`, `dropAnimation`, `zoomPunchAnimation`, `spinLockAnimation`, `extrudeAnimation`, `reverseExplodeAnimation`. Each takes the title text plus optional `textOpts` to tune letter size, colour, or bevel.

## Version control

The repo is a colocated git + jj checkout. Always use `jj`; the `.git` directory exists only for tooling compatibility. See [`CLAUDE.md`](CLAUDE.md) for common jj operations and the mental-model differences from git.

## See also

- [`CLAUDE.md`](CLAUDE.md) — paradigm, patterns, and contributor guidance.
- [`docs/markdown-authoring.md`](docs/markdown-authoring.md) — complete markdown syntax reference.
- [`docs/architecture/`](docs/architecture/) — per-layer design notes (engine, rendering, animation, authoring, scenes).
- [`examples/`](examples/) — runnable mini-decks, one per component cluster.
- [`todo.md`](todo.md) — open sub-projects and their scope.
