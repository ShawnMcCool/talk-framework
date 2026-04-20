# todo — next steps for the talk framework

This file is the handoff for continuing work in a fresh session. `CLAUDE.md` is the north-star doc; this file is the *what's left* doc. `CHANGELOG.md` records what's already shipped.

---

## 1. What this project is

A reusable presentation framework. The framework lives in `src/`; presentations are free-standing content folders anywhere on disk, marked by a `talk.toml` at their root. Shipped as a `talk` CLI on PATH that dispatches into Docker. Three.js + vanilla JS + Vite under the hood.

Sub-projects A (content-folder foundation) and B (component registry + content-aware linter + dev-mode edge banner) are complete — see `CHANGELOG.md` for the full summary. C1 (palette wiring) shipped in 0.4.0. The rest of sub-project C (title-animation markdown bridge, box-diagram vocabulary expansion, chapter chrome, 3D/SVG declarative subset) is deferred and will be replanned when demand surfaces. 241 tests pass.

---

## 2. Open sub-projects

Each requires its own brainstorm → spec → plan → execute cycle.

### 2.1 Sub-project D — framework-version drift warning

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
4. Pick a sub-project from §2. Default: D.
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
