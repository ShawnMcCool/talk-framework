# todo — next steps for the talk framework

This file is the handoff for continuing work on `talk` in a fresh Claude Code session. Read it top to bottom before touching code. `CLAUDE.md` is the north-star doc; this file is the *what's left* doc.

---

## 1. What this project is

`talk` is a reusable presentation framework. The framework lives in `src/`; presentations are free-standing content folders anywhere on disk, marked by a `talk.toml` at their root. The framework is shipped as a `talk` CLI on PATH that dispatches into Docker. Three.js + vanilla JS + Vite under the hood.

The repo was originally called `beam-talk` (a 45-minute BEAM/Elixir talk, now in `archive/`). Renamed to `talk` after sub-project A. Don't delete `archive/`; don't reuse its content.

---

## 2. Sub-project A — done

Everything needed for the framework/content split is in place and tested (184 tests passing).

- `talk` CLI on PATH (symlink `$PWD/talk → ~/.local/bin/talk`)
- `talk new` scaffolds; `talk add / remove / rename / move / list / lint / serve / test / help / version` all work
- Structural edits are atomic and support `--dry-run`
- Content folder is marked by `talk.toml`; walk-up resolution from any subdirectory
- Scene directories are numeric-prefixed (`01-welcome`, `02-intro`, …)
- Vite content-loader plugin exposes the mounted content folder via `virtual:content-manifest`
- Bad scenes render as an error-placeholder card; rest of the deck stays navigable
- Pure libs under `src/authoring/` (scene-discovery, rename-planner, toml, talk-config) — all TDD-tested

Spec: `docs/superpowers/specs/2026-04-19-content-folder-foundation-design.md`
Plan: `docs/superpowers/plans/2026-04-19-content-folder-foundation.md`

Use these as a template for the next sub-project: brainstorm → spec → plan → execute.

---

## 2b. Sub-project B — done

The framework is now content-aware: every component registers a descriptor, the linter validates through the registry, and the dev-mode banner surfaces diagnostics on the last-good render.

- Component registry at `src/authoring/component-registry.js` — 12 descriptors registered (5 scene-type/js-factory + 6 markdown-block built-ins + box-diagram DSL).
- All components relocated to `src/components/<name>/` with `component.js`, `render.js`, and lib files as appropriate.
- Six markdown-block components extracted from content-slide's switch: heading, paragraph, bullet-list, quote, code-fence, spacer.
- `box-diagram` shipped end-to-end: `parse.lib.js` + `validate.lib.js` (cross-references, duplicates, Levenshtein "did you mean") + `render.js` DOM builder + registration. First component to exercise all three lifecycle hooks (parse, validate, render).
- `bin/talk-lint.js` rewritten around the registry; fixture-based integration tests cover clean + bad cases.
- Dev-mode edge banner on last-good render; `talk:diagnostics` HMR channel emits from the Vite plugin; first-render-fails still falls back to `src/authoring/scene-placeholder.js`.
- Test baseline grew from 184 to 242.

Spec: `docs/superpowers/specs/2026-04-19-sub-project-b-design.md`
Plan: `docs/superpowers/plans/2026-04-19-sub-project-b.md`

---

## 3. Open sub-projects

Ordered by recommended build order. Each should go through its own brainstorm → spec → plan → execute cycle.

### 3.1 Sub-project C — authoring surface (markdown bridges + new components)

**Status:** open. Depends on B.

Extend markdown-authored scenes beyond content + section slides:

- Add `type: title-animation` with a `variant:` field (typewriter / drop / zoom-punch / spin-lock / extrude / reverse-explode)
- For Three.js and SVG scenes: decide whether to support a narrow declarative subset (e.g. `type: three-scene` with `preset: box-diagram`) or keep them JS-only indefinitely
- Wire `[palette]` from `talk.toml` through to the runtime (the schema already accepts it; no code consumes it yet)

**From B's deferred scope:**
- **Entity cards** — box-diagram extensions for entity/type rendering (beyond simple box nodes).
- **Cardinality arrows** — FK-style arrow annotations (e.g. `1..n`, `0..1`) on box-diagram flow lines.
- **Chapter chrome** — deck-level chapter titles / slide-number footer that span multiple scenes.

**Affected files:** `src/authoring/markdown-scene.lib.js`, each component factory gets a markdown adapter.

### 3.2 Sub-project D — framework-version drift warning

**Status:** open. Small; can slot in between C, or be done alongside C.

`talk.toml` already has a `framework_version` field (typed string, validated by `src/authoring/talk-config.lib.js`). When `talk lint` or `talk serve` runs, the CLI should warn if the content's declared `framework_version` doesn't match the installed `talk` version.

Warning, not error — "results may vary" rather than a hard block. Migration tooling is **explicitly deferred** (aspirational only). Just the drift warning.

**Affected files:** `bin/talk-version` as the source of truth for the current CLI version, new helper in `src/authoring/`, consumed by `bin/talk-lint.js` and `bin/talk-serve`.

---

## 4. Minor cleanups not tied to a sub-project

Do these as the mood strikes or when touching nearby code.

- **`docs/architecture/*.md` and `docs/markdown-authoring.md`** — audit for stale `src/scenes/` path references and any BEAM-specific tokens (`{{beam}}`). The framework itself is now content-neutral.
- **`src/shared/colors.js`** — still carries the framework default palette with names that may be talk-specific. Decide: keep as the single default palette, or allow content folders to fully replace it via their `[palette]` table (C handles this).
- **Browser test harness** — today's 242 tests cover pure libs and CLI integration. End-to-end (markdown → rendered DOM parity) is manual. Not urgent; worth it if we see rendering regressions sneak in.
- **Package as an npm lib** (`npm install talk`) — makes content folders fully portable into their own repos. Not needed for local-first use; nice-to-have for distribution.

---

## 5. Starting a fresh session

1. Read `CLAUDE.md` top to bottom.
2. Read this `todo.md` top to bottom.
3. Run `talk test` (from the framework repo) and confirm 242 tests pass before editing anything.
4. Pick a sub-project from §3. Default: C.
5. For each sub-project, walk through the full cycle:
   - **Brainstorm** (superpowers:brainstorming) — define author experience + decisions before mechanism
   - **Spec** → `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
   - **Plan** (superpowers:writing-plans) → `docs/superpowers/plans/…`
   - **Execute** (superpowers:subagent-driven-development) — one subagent per task, spec review + code quality review between tasks

---

## 6. Key files

- `CLAUDE.md` — north-star doc (paradigm, architecture, component catalogue, commit discipline)
- `docs/superpowers/specs/2026-04-19-content-folder-foundation-design.md` — A's design
- `docs/superpowers/plans/2026-04-19-content-folder-foundation.md` — A's task-by-task plan (template for B/C/D)
- `talk` + `bin/talk-*` — the CLI
- `src/authoring/content-loader-plugin.js` — Vite plugin that exposes `virtual:content-manifest` and the `talk:diagnostics` HMR channel
- `src/authoring/scene-placeholder.js` — minimal runtime error card (first-render-fails fallback; B added the dev-mode edge banner as a separate surface on top of the last-good cache)
- `src/authoring/component-registry.js` — single source of truth for all registered components
- `src/authoring/*.lib.js` — pure libs consumed by every subcommand
- `templates/new-talk/` — what `talk new` copies
- `fixtures/sample-talk/` — fixture used by CLI integration tests

---

## 7. Constraints and quirks (short form — see CLAUDE.md for details)

- **Use `jj`, never `git`.** Colocated git+jj repo.
- **Docker-only runtime.** `talk test` runs the suite inside Docker. No host Node needed for day-to-day (a host Node is used by `talk new` and `talk version` as trivial exceptions).
- **Vite uses polling in Docker** (inotify isn't reliable through bind mounts).
- **TDD + pure-function separation.** Logic in `*.lib.js`, tests in `*.lib.test.js`.
- **No `.sh` suffixes** on scripts.
- **Scene `resolveToSlide(n)` must be deterministic** — identical visual state whether reached by animating through or jumping directly.
- **On-demand rendering for Three.js scenes** — call `renderer.markDirty()` after mutating objects; never assume a render loop.
- **Never hardcode hex colors** — import from `src/shared/colors.js`.
- **Small, focused commits. Never `--no-verify`. Never force-push.**

---

## 8. Decisions still open

Flag these before building.

- **Palette sourcing at runtime** — framework default only, or content folder can override via `[palette]` in `talk.toml`? Schema already accepts it; just not wired through. Good candidate for C.
- **Declarative subset for Three.js / SVG scenes** — is a `preset:`-based markdown bridge worth building, or should those stay JS-only? Depends on how many Three.js scenes a typical content folder actually has.
- **npm packaging** — make `talk` installable as a real package, or keep the symlinked-script distribution model? Symlink works fine for single-author use; packaging matters if you want content repos to install the framework elsewhere.
