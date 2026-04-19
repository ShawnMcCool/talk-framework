# todo — next steps for the talk framework

This file is the handoff for continuing work in a fresh session. `CLAUDE.md` is the north-star doc; this file is the *what's left* doc. `CHANGELOG.md` records what's already shipped.

---

## 1. What this project is

A reusable presentation framework. The framework lives in `src/`; presentations are free-standing content folders anywhere on disk, marked by a `talk.toml` at their root. Shipped as a `talk` CLI on PATH that dispatches into Docker. Three.js + vanilla JS + Vite under the hood.

Sub-projects A (content-folder foundation) and B (component registry + content-aware linter + dev-mode edge banner) are complete — see `CHANGELOG.md` for the full summary. Sub-project C is decomposed below; C1 (palette wiring) has shipped and C2–C4 are queued behind individual brainstorm cycles. 241 tests pass.

---

## 2. Open sub-projects

Each requires its own brainstorm → spec → plan → execute cycle.

### 2.1 Sub-project C2 — title-animation markdown bridge

**Status:** design needed. Depends on C1 (shipped).

Let authors write `scene.md` files that invoke a title-animation variant instead of hand-rolling a JS scene:

```markdown
---
title: Why BEAM?
type: title-animation
variant: typewriter
---
```

Open design questions:

- Which frontmatter keys does the markdown bridge expose? Just `variant:`, or also per-animation options (camera, shake, timing)?
- How are the six existing variants (typewriter, drop, zoom-punch, spin-lock, extrude, reverse-explode) named — short strings? Fully qualified?
- Can a variant be authored fully from markdown, or do complex animations stay JS-only?
- Does this establish a general pattern for other JS-factory markdown bridges (see C5)?

**Affected files:** `src/authoring/markdown-scene.js`, `src/authoring/markdown-scene.lib.js`, `src/components/title-animation/component.js`, `docs/markdown-authoring.md`.

### 2.2 Sub-project C3 — box-diagram vocabulary expansion

**Status:** design needed.

Two related extensions to the existing `box-diagram` fenced-block DSL:

- **Entity cards** — data-model rendering (typed fields, property lists), not just labeled boxes.
- **Cardinality arrows** — FK-style annotations (`1..n`, `0..1`) on flow lines.

Both live in `src/components/box-diagram/parse.lib.js` + `render.js`, share the test harness, and need a coherent syntax that doesn't make the simple-box case harder to type.

Open design questions:

- Does entity-card syntax coexist with plain `box` inside the same diagram, or is it a separate fenced-block type?
- Cardinality annotations — inline on the arrow line (`client --1..n--> order`), attached to the endpoints, or a separate declaration?
- How does the linter communicate structural errors specific to these new forms?

**Affected files:** `src/components/box-diagram/*.lib.js`, `src/components/box-diagram/render.js`, `docs/markdown-authoring.md`.

### 2.3 Sub-project C4 — chapter chrome

**Status:** design needed.

Deck-level concept — not a per-scene component. Render a persistent chapter title / slide-number footer across runs of related scenes (e.g., scenes 5–9 all tagged "BEAM internals").

Open design questions:

- Where does chapter metadata live? In `talk.toml`? Each scene's frontmatter? A dedicated `00-chapter/` sentinel?
- Does the chrome render in the engine's outer frame, as a per-scene HTML overlay, or as a new `ChapterLayer` concept?
- Does chapter membership affect navigation (e.g., "jump to next chapter")?

**Affected files:** `src/engine/`, likely new module. Possibly new CLI subcommand for scaffolding.

### 2.4 Sub-project C5 — 3D / SVG declarative subset (open decision)

**Status:** decision pending, no implementation until the decision is made.

Question: is a declarative markdown bridge for Three.js / SVG scenes worth building (e.g., `type: 3d-scene` with `preset: box-diagram`), or should those stay JS-only indefinitely?

Defer until C2 (title-animation bridge) ships. The value of this depends on how many authors reach for preset-ish Three.js scenes in practice — something we'll know better after C2.

### 2.5 Sub-project D — framework-version drift warning

**Status:** design needed; small scope.

`talk.toml` already has a `framework_version` field (validated by `src/authoring/talk-config.lib.js`). When `talk lint` or `talk serve` runs, the CLI should warn (not error) if the content's declared `framework_version` doesn't match the installed `talk` version. Migration tooling is explicitly deferred.

Open design questions:

- What's the source of truth for the current CLI version? (`bin/talk-version`, `package.json`, a generated constant?)
- How is the comparison scoped — exact match, semver compatibility, major-version gate?
- Where does the warning render — stderr, the diagnostics stream, the error banner?

**Affected files:** `bin/talk-version`, new helper in `src/authoring/`, consumed by `bin/talk-lint.js` and `bin/talk-serve`.

---

## 3. Deferred polish

Shippable items surfaced by reviews. Most were tackled alongside sub-project C1 — the rest need more thought.

- **Full-reload wipes the last-good cache** — `content-loader-plugin.js` still sends `ws.send({ type: 'full-reload' })` alongside the `talk:diagnostics` emission. The "edge banner on last-good render" experience only partially works until this is replaced with virtual-module invalidation + `import.meta.hot.accept`. Needs HMR-semantics design before implementation.
- **`sceneType` dead binding in `bin/talk-lint.js`** — `registry.getByFrontmatterType(parsed.type) || registry.getByName('content-slide')` is assigned but never read. Either wire it into a new scene-type-level validate hook or delete it.

---

## 4. Minor cleanups

- **Remaining architecture docs** (`docs/architecture/*.md` other than `scenes.md`, `docs/markdown-authoring.md`) — audit for stale `SCENE_SOURCES` / `src/scenes/` references and talk-specific tokens.
- **Browser test harness** — today's 241 tests cover pure libs and CLI integration. End-to-end (markdown → rendered DOM parity) is manual. Worth building if rendering regressions start sneaking in. Needs design.
- **npm packaging** — make the framework installable as a real package. Not needed for local-first use; nice-to-have for distribution. Needs design (naming, layout, deps, release workflow).

---

## 5. Starting a fresh session

1. Read `CLAUDE.md` top to bottom.
2. Read this file top to bottom.
3. Run `talk test` (from the framework repo) — confirm 241 tests pass before editing anything.
4. Pick a sub-project from §2. Default: C2.
5. For each sub-project, walk through the full cycle:
   - **Brainstorm** (`superpowers:brainstorming`) — define author experience + decisions before mechanism.
   - **Spec** → `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.
   - **Plan** (`superpowers:writing-plans`) → new subagent-driven session.
   - **Execute** (`superpowers:subagent-driven-development`) — one subagent per task, spec review + code quality review between tasks.

---

## 6. Key files

- `README.md` — public-facing overview + CLI + component reference.
- `CLAUDE.md` — contributor north-star: paradigm, architecture, commit discipline.
- `CHANGELOG.md` — what's shipped, per version.
- `docs/superpowers/specs/` — per-sub-project design docs.
- `docs/architecture/` — per-layer design notes.
- `talk` + `bin/talk-*` — the CLI.
- `src/authoring/component-registry.js` — single source of truth for all registered components.
- `src/authoring/scene-diagnostics.lib.js` — shared block-walker consumed by the CLI linter and the Vite plugin.
- `src/authoring/content-loader-plugin.js` — Vite plugin exposing `virtual:content-manifest` and the `talk:diagnostics` HMR channel.
- `src/authoring/scene-placeholder.js` — runtime error card (first-render-fails fallback).
- `src/authoring/*.lib.js` — pure libs consumed by every subcommand.
- `templates/new-talk/` — what `talk new` copies.
- `fixtures/sample-talk/` — fixture used by CLI integration tests.
- `examples/` — runnable mini-decks, one per component cluster.

---

## 7. Constraints and quirks (short form — see CLAUDE.md for details)

- **Use `jj`, never `git`.** Colocated git+jj repo.
- **Docker-only runtime.** `talk test` runs the suite inside Docker. No host Node needed for day-to-day (a host Node is used by `talk new` and `talk version` as trivial exceptions). `talk serve` reuses the cached image — after adding or bumping a dep in `package.json`, run `docker compose run --rm app npm install` to update the `node_modules` volume.
- **Vite uses polling in Docker** (inotify isn't reliable through bind mounts).
- **TDD + pure-function separation.** Logic in `*.lib.js`, tests in `*.lib.test.js`.
- **No `.sh` suffixes** on scripts.
- **Scene `resolveToSlide(n)` must be deterministic** — identical visual state whether reached by animating through or jumping directly.
- **On-demand rendering for Three.js scenes** — call `renderer.markDirty()` after mutating objects; never assume a render loop.
- **Never hardcode hex colors** — import from `src/shared/colors.js`.
- **Small, focused commits. Never `--no-verify`. Never force-push.**
