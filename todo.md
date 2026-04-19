# todo — framework/content paradigm

This file is the handoff for closing the gap between the project's **target paradigm** and what the code actually does today. It is written so a fresh Claude Code session can pick up the work without any prior conversation context. Read top to bottom before touching code.

---

## 1. What this project is

`talk` is a **reusable presentation framework**. The framework is separate from any specific presentation. Presentations live in their own top-level content folders and are chosen at runtime.

The repository was originally named `beam-talk` — it started as a 45-minute technical talk on BEAM / Elixir architecture, now archived to `archive/`. The repo now contains only the framework and a placeholder scene.

The framework is a single-page web app: Three.js + vanilla JS + Vite, dev-served out of Docker.

---

## 2. The paradigm (target state)

Five ideas. All of CLAUDE.md's top half restates these; the doc and this file should stay aligned.

### 2.1 Framework vs content separation

Everything under `src/` is framework code. No presentation content lives in the framework. A presentation is a folder somewhere else in the repo (or potentially outside it) that the framework runs against.

### 2.2 Parameterized content folder

The content folder is chosen at run time. It has a top-level, arbitrary name. The dev server and linter take the folder as an argument:

```bash
talk serve ~/src/my-elixir-talk
talk lint  ~/src/my-elixir-talk
```

Multiple presentations can coexist in the repo side-by-side. The framework has no knowledge of any specific presentation.

### 2.3 Reusable components, human-readable authoring

The framework exposes a catalogue of components. Authors compose presentations from these components, specified in a human-readable way — markdown frontmatter + block syntax wherever possible, with fall-through to JS factories for custom behavior.

Components that exist as factories today:

| Component | Factory | Markdown-authored today? |
|-----------|---------|--------------------------|
| Content slide | `src/content-slides/scene-factory.js` | Yes |
| Section slide | `src/section-slides/scene-factory.js` | Yes |
| Three.js scene | `src/three-scenes/scene-factory.js` | No — JS only |
| SVG scene | `src/svg-scenes/scene-factory.js` | No — JS only |
| Title animation | `src/title-animations/scene-factory.js` | No — JS only |

### 2.4 Component-aware linter

The framework supplies a linter that **understands every component it exposes**. For each component reference in content, the linter validates that the content is fully parseable by the framework's understanding of that component.

Example: if a `box-diagram` component exists, the linter identifies uses of it in content and validates each use is structurally complete and renderable. Missing required fields, unknown attributes, malformed children — all should produce actionable, path + line errors.

This is the **critical unique piece** of the paradigm. A generic markdown parser is not enough; the linter needs to know which components exist and what each one's valid content shape is.

### 2.5 Author workflow

1. Edit files in the content folder.
2. Run `./lint <content-dir>` to verify everything is parseable.
3. Run `./dev <content-dir>`; changes hot-reload in the browser.

The dev server should also run the linter at startup so authors never accidentally work against an invalid content folder.

---

## 3. Current state (April 2026)

Snapshot of what's actually in the repo right now. Verify with `git log` and `ls` before trusting specifics — things drift.

### 3.1 Layout

```
/home/shawn/src/talk/
├── CLAUDE.md              # Describes paradigm (see §2) + current-state gap list
├── dev                    # Wraps `docker compose up --build`
├── dev-check              # Probes every JS module for Vite import errors
├── test                   # Run tests (inside container)
├── docker-compose.yml     # Vite dev server in a container
├── Dockerfile
├── vite.config.js         # Polling watcher, HMR on :3000, openInEditor plugin
├── index.html
├── package.json
├── archive/               # Prior BEAM/Elixir talk content (do not delete, do not reuse)
│   ├── act-1.md, talk-concept.md, system-design.md, friction-notes.md
│   └── scenes/            # All prior scenes + `_attic/`
├── docs/
│   ├── architecture/      # engine.md, rendering.md, animation.md, authoring.md, scenes.md
│   ├── markdown-authoring.md
│   └── examples/          # minimal-markdown.md, minimal-three.js
├── src/
│   ├── main.js            # Entry point. Currently imports ONE placeholder scene.
│   ├── engine/            # Framework: deck/position/navigation
│   ├── rendering/         # Framework: renderer lifecycle
│   ├── animation/         # Framework: tween + timeline
│   ├── commands/          # Framework: command palette
│   ├── authoring/         # Framework: markdown compiler + validation + dev middleware
│   ├── content-slides/    # Framework: component factory + markdown bridge
│   ├── section-slides/    # Framework: component factory + markdown bridge
│   ├── three-scenes/      # Framework: component factory (Three.js)
│   ├── svg-scenes/        # Framework: component factory (SVG)
│   ├── title-animations/  # Framework: component factory + animation variants
│   ├── shared/            # Framework: colors, session state
│   ├── debug/             # Framework: debug + nav overlays
│   ├── types.js           # Framework: JSDoc typedefs
│   └── scenes/            # CONTENT (lives under src/ today; target is top-level)
│       └── placeholder/
│           └── scene.md   # "Ready to author" placeholder
└── todo.md                # This file
```

### 3.2 Entry point behavior

`src/main.js` imports **one scene** (the placeholder) and builds a `SCENE_SOURCES` array by hand:

```javascript
import placeholderMd from './scenes/placeholder/scene.md?raw';
// ...
const placeholderScene = compileMarkdownScene(placeholderMd);
const SCENE_SOURCES = [
  { scene: placeholderScene, path: 'src/scenes/placeholder/scene.md', act: null },
];
```

`SCENE_SOURCES` defines deck order. Each entry pairs the scene module with its source path so the dev HUD can surface it and the "open in editor" shortcut works.

### 3.3 Dev server

- `./dev` → `docker compose up --build "$@"` (Docker only; no host tooling)
- Vite polls files every 200 ms (Docker bind mounts don't propagate inotify reliably)
- HMR on `:3000`. `import.meta.hot.accept()` in `main.js` does `teardown(); setup()` on any code change, including `.md?raw` content changes.
- `./dev-check` probes every JS file under `src/` via HTTP to catch Vite import errors. Runs against an existing server on `:3000` or spins up a temporary one. Not content-aware.

### 3.4 Linter (today)

`src/authoring/scene-validation.lib.js` — pure function. Validates each scene in the `SCENE_SOURCES` array for:

- `title` is a non-empty string
- `slides` is a non-empty array
- Each slide has `stepCount: number >= 1`
- Required methods exist: `init()`, `destroy()`, `resolveToSlide()`, `animateToSlide()`

Returns an array of `{ sceneIndex, title, issues: [...] }`. Called from `src/authoring/scene-validation.js` which logs warnings (never throws). Runs at `setup()` time in `main.js`.

**This is shape validation only. No component-aware parseability.** No "is this bullet list valid", no "is this frontmatter field recognized", no "does this title-animation variant exist".

### 3.5 Markdown authoring surface

`src/authoring/markdown-scene.js` + `markdown-scene.lib.js`. Supports:

- Frontmatter: `title` (required), `type` (`content` | `section`, default `content`), plus forwarded options (`subtitle`, `accent`, `bg`, `bgDark`, `text`, `fontSize`, `letterStagger`, nested `colors` map). **Unknown keys pass through silently — no typo warnings.**
- Block syntax: `#`/`##`/`###` headings, `-`/`*` bullets, fenced code, `>` quotes (optional `— attribution` trailing line), `:spacer:` / `:spacer lg:`, `!muted paragraph`, plain paragraphs, raw HTML passthrough.
- Slide separator: `---` on its own line (not inside code fences).
- Token interpolation: `{{tokenName}}` → `colors[tokenName]` at compile time.

Bridges to `createContentSlide` (for `type: content`) and `createSectionSlide` (for `type: section`). Does **not** bridge to Three.js, SVG, or title-animation factories.

### 3.6 Authoring aids

- `Escape` → command palette (jump to scene / slide / step, reset scene, open source, toggle overlays)
- `o` → open current scene source in `$EDITOR` (Vite middleware at `/__open-source`)
- `d` → toggle debug overlay
- `n` → toggle nav overlay

---

## 4. The gap — prioritized backlog

Ordered foundational-first. Items are roughly independent unless a **Blocked by:** line says otherwise. Each item has a short rationale and a suggested approach, not a spec — adapt as you learn more.

### 4.0 Sub-project decomposition

The remaining paradigm-to-reality gap has been decomposed into four sub-projects,
each with its own spec and plan under `docs/superpowers/`:

| Sub-project | Scope | Status |
|-------------|-------|--------|
| A | Content-folder foundation — `talk` CLI, content-folder separation, rescan+reload | **done** |
| B | Component registry + content-aware linter + in-browser error overlay | open |
| C | Markdown bridges for Three.js / SVG / title-animation, new components | open |
| D | Framework-version drift warning | open |

### 4.1 Parameterize the content folder — **done** (see sub-project A spec + plan)

**Why it's first:** unlocks everything else. Until content lives outside `src/` and the framework reads it from an argument, none of the other paradigm claims can hold up.

**Suggested approach:**

1. Create a top-level `content/` directory (convention, not requirement) and move `src/scenes/placeholder/` to `content/placeholder/` (or similar sample folder).
2. Accept a content-folder path as a CLI argument to `./dev` and `./lint`. Pass it to the Vite container via an environment variable — e.g. `CONTENT_DIR=content/placeholder`.
3. Plumb `CONTENT_DIR` into Vite. Options:
   - **Virtual module** — a Vite plugin that exposes `virtual:content-manifest` by scanning `CONTENT_DIR` at load time. Cleanest.
   - **Alias** — `resolve.alias: { '~content': path.resolve(process.env.CONTENT_DIR) }` plus a literal `import.meta.glob('~content/**/*.{md,js}')`. Simpler but glob patterns still need literal prefixes in Vite.
4. `main.js` imports the manifest, iterates, builds `SCENE_SOURCES` dynamically.
5. Default: if no content folder is passed, error out with a helpful message.

**Affected files:** `dev`, `dev-check`, `vite.config.js`, `src/main.js`, new plugin under `src/authoring/` (e.g. `content-manifest-plugin.js`).

### 4.2 Auto-discover scenes from the content folder — **done** (see sub-project A spec + plan)

**Why:** the paradigm promises that authors drop a folder in and it appears in the deck. Manual `SCENE_SOURCES` registration is the opposite of that.

**Blocked by:** 4.1 (needs `CONTENT_DIR` to know where to scan).

**Suggested approach:**

1. Content folder structure: `<content-dir>/<nn>-<slug>/scene.{md,js}`. The `nn-` prefix is the sorting hint; the manifest sorts by directory name.
2. For each directory found, the manifest resolves to either the markdown source (compiled via `compileMarkdownScene`) or the JS scene module (used as-is).
3. Source path carried alongside each scene so the "open in editor" shortcut keeps working.
4. Remove the hand-written `SCENE_SOURCES` list in `main.js`.

**Affected files:** whichever plugin / module came out of 4.1; `src/main.js`.

### 4.3 `./lint` script and content-aware validation

**Why:** the paradigm claims a linter that understands components. Today there's shape validation and nothing content-aware.

**Blocked by:** 4.1 (linter needs to know which content folder to validate).

**Suggested approach:**

1. New script at repo root: `./lint`. Runs the linter in the container against the given content folder. Exit non-zero on any error.
2. Design a **component registry**: each component (content-slide, section-slide, three-scene, svg-scene, title-animation) contributes (a) a name, (b) how to recognize uses in content, (c) a validator for those uses. Single source of truth that the linter and the runtime both read from.
3. First pass of validators:
   - **Content slide frontmatter** — reject unknown keys, type-check values.
   - **Section slide frontmatter** — same.
   - **Markdown block shape** — detect unclosed code fences, malformed frontmatter, bullets at wrong indent, etc.
   - **JS scene contract** — reuse existing `validateScenesLib` as a starting point.
   - **Title-animation variant names** — if a JS scene uses `createTitleScene({ animation: '...' })`, validate the variant exists.
4. Error format: `<file>:<line>:<col> <component> <issue>`. Must be clickable in modern terminals.
5. Wire the linter into dev-server startup so the user sees errors immediately.

**Affected files:** new `lint` script, new `src/authoring/lint.js` (or similar), `src/authoring/scene-validation.lib.js` (refactor into registry), each component directory gains a `validator.js`.

### 4.4 Markdown bridges for Three.js, SVG, title animations

**Why:** paradigm promises human-readable authoring wherever possible. Forcing JS for every animated title defeats it.

**Suggested approach:**

- Add a `type:` in frontmatter beyond `content` / `section` — e.g. `type: title-animation` with a `variant:` field. Bridge to `createTitleScene`.
- For Three.js and SVG scenes, a markdown bridge is harder because their content is imperative. Consider a narrower "declarative" subset: e.g. `type: three-scene` with a `preset: box-diagram` referencing a parameterized pre-built scene. Don't try to express arbitrary Three.js in markdown.
- Explicit decision to make: do we want a "box diagram" as a first-class component? CLAUDE.md name-checks it. Answer informs what markdown bridges are even worth building.

**Affected files:** `src/authoring/markdown-scene.lib.js`, each component's factory gets a markdown adapter.

### 4.5 Remove archival / talk-specific leftovers

**Why:** the framework should carry no talk-specific content.

**Check and, if appropriate, edit:**

- `docs/architecture/scenes.md` — might still reference `src/scenes/...` paths by convention.
- `docs/markdown-authoring.md` — examples may use BEAM-specific tokens like `{{beam}}`.
- `docs/examples/minimal-markdown.md`, `docs/examples/minimal-three.js` — ensure neutral.
- `src/shared/colors.js` — inspect; may still carry talk-specific palette names. Decide whether to keep as the framework's default palette or allow the content folder to supply its own palette. (Paradigm arguably says the latter.)

### 4.6 Nice-to-haves (after the core is solid)

- **Content folder has its own palette** (`palette.js` or palette frontmatter) that overrides the framework default.
- **Per-presentation config file** at the root of a content folder: `presentation.json` or similar. Title, theme, author, etc.
- **Browser test harness** for markdown → render parity (today there's unit-level testing of libs but not end-to-end).
- **Package the framework** so it can be consumed by a content folder in a separate repo (`npm install talk`).

---

## 5. Key files — quick map

Read these first when starting a session:

- `CLAUDE.md` — paradigm + current-state summary (north-star doc)
- `todo.md` — this file (handoff)
- `src/main.js` — entry point; scene registration happens here
- `src/authoring/markdown-scene.lib.js` — markdown compiler (pure)
- `src/authoring/scene-validation.lib.js` — current (shape-only) linter
- `src/engine/engine.js` + `engine.lib.js` — deck/navigation/HMR seams
- `vite.config.js` — HMR, polling, `openInEditorPlugin`
- `dev`, `dev-check`, `test` — all Docker-based; no host deps
- `docs/architecture/*.md` — per-layer one-pagers; check for drift after big changes

---

## 6. Constraints and quirks

- **Docker-only.** Nothing is installed on the host. Always run commands via `./dev`, `./test`, `./dev-check`. Vite runs at `http://localhost:3000` inside the `app-1` container.
- **Polling watcher.** Don't trust inotify. If HMR looks flaky, check that `watch.usePolling` is still `true` in `vite.config.js`.
- **Scripts are extensionless.** Never add `.sh`.
- **TDD + pure-function separation.** Logic in `*.lib.js`, tests in `*.lib.test.js`, side effects elsewhere. Match existing style.
- **Determinism guarantee in scenes.** `resolveToSlide(n)` must produce identical visual state whether reached by animation or direct jump. Don't accidentally make slide state a delta.
- **On-demand rendering.** Three.js scenes don't animate continuously; call `renderer.markDirty()` after mutating objects.
- **Colors.** Import from `src/shared/colors.js`. Never hardcode hex values.
- **Commit hygiene.** Small, focused commits. No force-pushes, no `--no-verify`. See recent `git log` for message style.

---

## 7. How to start a fresh session

1. `git status` and `git log --oneline -10` to catch up on drift.
2. Read `CLAUDE.md` top to bottom.
3. Read this `todo.md` top to bottom.
4. Pick one item from §4. Start with 4.1 if it's not done; otherwise go in order.
5. Before editing, sanity-check by running `./dev-check` — the framework should boot cleanly. If it doesn't, fix that first.
6. Use the plan mode / ExitPlanMode workflow for non-trivial items (anything in §4.1–§4.4 qualifies).

---

## 8. Decisions still open

Flag these to the user before building them:

- **Does a `box-diagram` component exist?** CLAUDE.md uses it as the illustrative example for the linter. It isn't implemented yet. Decide whether it's the first content-aware component to build or just a rhetorical example.
- **Is the framework eventually packaged as an npm library** consumed by content repos elsewhere? If yes, some choices (directory structure, package name, public API surface) get more consequential earlier.
- **Content-folder conventions:** require `presentation.json` / a manifest file, or infer everything from directory structure? Leaning toward "pure directory convention, no manifest file" for simplicity, but that's not a final decision.
- **Palette sourcing:** framework default always, or content folder can supply its own? Paradigm arguably prefers the latter.
