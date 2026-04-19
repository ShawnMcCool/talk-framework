# todo — next steps for the talk framework

This file is the handoff for continuing work in a fresh session. `CLAUDE.md` is the north-star doc; this file is the *what's left* doc. `CHANGELOG.md` records what's already shipped.

---

## 1. What this project is

A reusable presentation framework. The framework lives in `src/`; presentations are free-standing content folders anywhere on disk, marked by a `talk.toml` at their root. Shipped as a `talk` CLI on PATH that dispatches into Docker. Three.js + vanilla JS + Vite under the hood.

Sub-projects A (content-folder foundation) and B (component registry + content-aware linter + dev-mode edge banner) are complete — see `CHANGELOG.md` for the full summary. 242 tests pass.

---

## 2. Open sub-projects

Ordered by recommended build order. Each should go through its own brainstorm → spec → plan → execute cycle.

### 2.1 Sub-project C — authoring surface (markdown bridges + new components)

**Status:** open. Depends on B.

Extend markdown-authored scenes beyond content + section slides:

- Add `type: title-animation` with a `variant:` field (typewriter / drop / zoom-punch / spin-lock / extrude / reverse-explode).
- For Three.js and SVG scenes: decide whether to support a narrow declarative subset (e.g. `type: three-scene` with `preset: box-diagram`) or keep them JS-only indefinitely.
- Wire `[palette]` from `talk.toml` through to the runtime (the schema already accepts it; no code consumes it yet).

**From B's deferred scope:**

- **Entity cards** — box-diagram extensions for entity/type rendering (beyond simple box nodes).
- **Cardinality arrows** — FK-style arrow annotations (e.g. `1..n`, `0..1`) on box-diagram flow lines.
- **Chapter chrome** — deck-level chapter titles / slide-number footer that span multiple scenes.

**Affected files:** `src/authoring/markdown-scene.lib.js`, each component factory gets a markdown adapter.

### 2.2 Sub-project D — framework-version drift warning

**Status:** open. Small; can slot in alongside C.

`talk.toml` already has a `framework_version` field (validated by `src/authoring/talk-config.lib.js`). When `talk lint` or `talk serve` runs, the CLI should warn if the content's declared `framework_version` doesn't match the installed `talk` version.

Warning, not error — "results may vary" rather than a hard block. Migration tooling is **explicitly deferred** (aspirational only). Just the drift warning.

**Affected files:** `bin/talk-version` as the source of truth for the current CLI version, new helper in `src/authoring/`, consumed by `bin/talk-lint.js` and `bin/talk-serve`.

---

## 3. Deferred polish

Items surfaced by reviews during B that don't block any sub-project. Tackle as mood strikes.

- **`mountErrorBanner` has no `dispose()`** — latent stacking risk if the banner is ever hoisted into `setup()` or if HMR re-evaluates main.js's top-level state.
- **`c.border` in box-diagram render falls to `#888` always** — `defaultColors` has no `border` key. Either add one to `src/shared/colors.js` or swap the lookup to `c.textMuted`.
- **`ROLE_COLORS` constant in `src/components/box-diagram/render.js` is unused** — plan-prescribed scaffolding for future non-linear layouts. Delete in a cleanup commit.
- **`blockStartLine: 1` hardcoded in talk-lint's built-in branch** — latent debt: swap to `block.line || 1` once any Phase-4 built-in block gains a `validate`.
- **Full-reload wipes the last-good cache** — `content-loader-plugin.js` still sends `ws.send({ type: 'full-reload' })` alongside the `talk:diagnostics` emission. The "edge banner on last-good render" experience only partially works until this is replaced with virtual-module invalidation + `import.meta.hot.accept`.
- **Linter + Vite plugin duplicate block-walking logic** — consolidation target; extract a shared `walkSceneDiagnostics` helper.

---

## 4. Minor cleanups

- **`docs/architecture/*.md` and `docs/markdown-authoring.md`** — audit for stale `src/scenes/` path references or talk-specific tokens.
- **`src/shared/colors.js`** — framework default palette. Decide whether content folders should override via `[palette]` in `talk.toml` (C handles this).
- **Browser test harness** — today's 242 tests cover pure libs and CLI integration. End-to-end (markdown → rendered DOM parity) is manual. Worth building if rendering regressions start sneaking in.
- **npm packaging** — make the framework installable as a real package. Not needed for local-first use; nice-to-have for distribution.

---

## 5. Starting a fresh session

1. Read `CLAUDE.md` top to bottom.
2. Read this file top to bottom.
3. Run `talk test` (from the framework repo) — confirm 242 tests pass before editing anything.
4. Pick a sub-project from §2. Default: C.
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

---

## 8. Decisions still open

- **Palette sourcing at runtime** — framework default only, or content folder can override via `[palette]` in `talk.toml`? Schema already accepts it; just not wired through. Good candidate for C.
- **Declarative subset for Three.js / SVG scenes** — is a `preset:`-based markdown bridge worth building, or should those stay JS-only? Depends on how many Three.js scenes a typical content folder actually has.
- **npm packaging** — make `talk-framework` installable as a real package, or keep the symlinked-script distribution model? Symlink works fine for single-author use; packaging matters if you want content repos to install the framework elsewhere.
