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

## 3. Open sub-projects

Ordered by recommended build order. Each should go through its own brainstorm → spec → plan → execute cycle.

### 3.1 Sub-project B — component registry + content-aware linter + in-browser error overlay

**Status:** open. Highest-value next step.

**What it is.** Today `talk lint` does structural checks (numbering, duplicates, both `scene.md` + `scene.js` present) plus `talk.toml` schema validation. It does *not* know what a content-slide is, whether a frontmatter key is recognized, whether a title-animation variant exists, etc.

B introduces a **component registry**: each component (content-slide, section-slide, three-scene, svg-scene, title-animation) contributes a name, a detector (how to recognize uses of it in content), and a validator (what "valid" looks like). The linter and the runtime both consume this single registry.

The runtime side replaces the current minimal error-placeholder card (`src/authoring/scene-placeholder.js`) with a **rich in-browser error overlay** that shows file/line/component context when content fails to parse. This is the mechanism that makes "edit mid-keystroke without crashing the dev server" work robustly — the content-aware validator becomes the runtime error boundary.

**Why it matters.** The user explicitly asked for: "server should handle errors gracefully… we shouldn't crash the whole dev server, we should just inform the user that a component is wrong in some useful way." A minimal version of that ships in A; B makes it production-quality.

**Scope to agree on when starting.**
- Does `box-diagram` become a first-class component as part of B, or is it deferred to C? CLAUDE.md name-checks it but it doesn't exist.
- Error format for CLI output: `<file>:<line>:<col> <component> <issue>` (clickable in modern terminals) — proposed, not final.
- Overlay UX: full-screen error, or overlay-on-top-of-last-good-render so the author keeps their place in the deck?

**Affected files.**
- `bin/talk-lint.js` → rewritten around the registry
- `src/authoring/scene-placeholder.js` → replaced by richer overlay module
- Each component dir (`src/content-slides/`, etc.) gains a `validator.js`
- New `src/authoring/component-registry.js` as the single source of truth

### 3.2 Sub-project C — authoring surface (markdown bridges + new components)

**Status:** open. Depends on B.

Extend markdown-authored scenes beyond content + section slides:

- Add `type: title-animation` with a `variant:` field (typewriter / drop / zoom-punch / spin-lock / extrude / reverse-explode)
- For Three.js and SVG scenes: decide whether to support a narrow declarative subset (e.g. `type: three-scene` with `preset: box-diagram`) or keep them JS-only indefinitely
- Wire `[palette]` from `talk.toml` through to the runtime (the schema already accepts it; no code consumes it yet)

**Open question:** is `box-diagram` worth promoting to first-class? If yes, C is the place to build it.

**Affected files:** `src/authoring/markdown-scene.lib.js`, each component factory gets a markdown adapter.

### 3.3 Sub-project D — framework-version drift warning

**Status:** open. Small; can slot in between B and C, or be done alongside B.

`talk.toml` already has a `framework_version` field (typed string, validated by `src/authoring/talk-config.lib.js`). When `talk lint` or `talk serve` runs, the CLI should warn if the content's declared `framework_version` doesn't match the installed `talk` version.

Warning, not error — "results may vary" rather than a hard block. Migration tooling is **explicitly deferred** (aspirational only). Just the drift warning.

**Affected files:** `bin/talk-version` as the source of truth for the current CLI version, new helper in `src/authoring/`, consumed by `bin/talk-lint.js` and `bin/talk-serve`.

---

## 4. Minor cleanups not tied to a sub-project

Do these as the mood strikes or when touching nearby code.

- **`docs/architecture/*.md` and `docs/markdown-authoring.md`** — audit for stale `src/scenes/` path references and any BEAM-specific tokens (`{{beam}}`). The framework itself is now content-neutral.
- **`src/shared/colors.js`** — still carries the framework default palette with names that may be talk-specific. Decide: keep as the single default palette, or allow content folders to fully replace it via their `[palette]` table (C handles this).
- **Browser test harness** — today's 184 tests cover pure libs and CLI integration. End-to-end (markdown → rendered DOM parity) is manual. Not urgent; worth it if we see rendering regressions sneak in.
- **Package as an npm lib** (`npm install talk`) — makes content folders fully portable into their own repos. Not needed for local-first use; nice-to-have for distribution.

---

## 5. Starting a fresh session

1. Read `CLAUDE.md` top to bottom.
2. Read this `todo.md` top to bottom.
3. Run `talk test` (from the framework repo) and confirm 184 tests pass before editing anything.
4. Pick a sub-project from §3. Default: B.
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
- `src/authoring/content-loader-plugin.js` — Vite plugin that exposes `virtual:content-manifest` (hook point for B's error overlay)
- `src/authoring/scene-placeholder.js` — minimal runtime error card; B replaces with a richer overlay
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

- **`box-diagram` as a first-class component** — CLAUDE.md name-checks it as the canonical "component with content-aware validation" example. Not implemented. Decide during B or C.
- **Palette sourcing at runtime** — framework default only, or content folder can override via `[palette]` in `talk.toml`? Schema already accepts it; just not wired through. Good candidate for C.
- **Declarative subset for Three.js / SVG scenes** — is a `preset:`-based markdown bridge worth building, or should those stay JS-only? Depends on how many Three.js scenes a typical content folder actually has.
- **npm packaging** — make `talk` installable as a real package, or keep the symlinked-script distribution model? Symlink works fine for single-author use; packaging matters if you want content repos to install the framework elsewhere.
