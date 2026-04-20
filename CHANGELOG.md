# Changelog

All notable changes to this project are recorded in this file. Version numbers follow [semver](https://semver.org/); dates are in ISO 8601.

## [Unreleased]

## [0.5.0] — 2026-04-20

### Added
- **Framework-version drift warning** (sub-project D). `talk lint` emits a `warn` diagnostic and `talk serve` prints a stderr warning when a deck's `talk.toml` declares a `framework_version` whose major.minor doesn't match the installed CLI. Pre-1.0 semantics: patch differences are ignored; declared versions may omit the patch (`"0.5"`). Non-fatal — the deck still loads. Logic is pure (`src/authoring/version-drift.lib.js`, 8 tests) and shared between the lint JS and a small `bin/talk-preflight.js` helper.

### Changed
- **HMR preserves state across content edits.** `content-loader-plugin.js` no longer broadcasts `ws.send({ type: 'full-reload' })` when a scene changes; it calls `server.reloadModule(mod)` so Vite propagates the update through the normal HMR pipeline. `main.js` now takes a namespace import of `virtual:content-manifest` and a dep-specific `import.meta.hot.accept('virtual:content-manifest', …)` handler that rebuilds `SCENE_SOURCES` + restarts the engine *without re-evaluating the module*, so the last-good cache, the error banner, and the diagnostics subscription survive every edit. Current-scene position is now followed by **folder name** (not numeric index) across the update, so mid-edit `talk add` / `talk move` / `talk rename` no longer slip the cursor.
- **Shipped talk.toml files bumped** (`templates/new-talk/`, `examples/*`, `fixtures/sample-talk/`, `test/fixtures/b-linter/*`) from `0.1` / `0.1.0` to `"0.5"` so they match this release and don't trigger the new drift warning.

### Docs
- `docs/architecture/authoring.md` and `docs/markdown-authoring.md` replaced BEAM-flavored examples with generic ones (`{{beam}}` → `{{accent}}` in example snippets; "Why the BEAM?" → "Why it matters"). `bin/talk-lint.js` scrubbed of a stale `(Phase 8)` comment. `todo.md` is now one sub-project long (D done; deferred polish + minor cleanups) and refreshed `§5 Default` to reflect post-D state.

## [0.4.0] — 2026-04-20

### Added
- Palette wiring in the authoring surface — markdown scenes can reference palette tokens (`{{accent}}`, `{{textMuted}}`, etc.) and the compiler substitutes values from `src/shared/colors.js` at scene-compile time. Box-diagram role colors (`role=accent`, `role=neutral`) resolve through the same palette. Authors get one color story across every component instead of per-component overrides.

### Removed
- **Sub-project C scope cut back.** C1 (palette wiring) shipped with this release; the rest of C (title-animation markdown bridge, box-diagram vocabulary expansion, chapter chrome, 3D/SVG declarative subset) has been deferred and will be replanned if demand surfaces. `todo.md` trimmed accordingly — D (framework-version drift warning) is now the default next pick.

### Internal
- Dropped the unused `sceneType` binding in `bin/talk-lint.js` (`registry.getByFrontmatterType(parsed.type) || registry.getByName('content-slide')` was assigned but never read). Refreshed the architecture docs to remove stale `SCENE_SOURCES` / `src/scenes/` references.

## [0.3.0] — 2026-04-19

### Changed (BREAKING)
- **Reveal-step semantics flipped.** A slide is now one reveal step by default — every block appears at once — instead of one step per block. Authors who want progressive reveal put `+++` on its own line where they want the break; leading, trailing, and consecutive `+++`s are elided; `+++` inside a fenced code block is literal text. This matches how authors think (write a slide → see a slide) and keeps the staged-reveal pattern available but explicit.
- **Scene-contract data shape.** A slide is now `Array<Array<Block>>` — outer = reveal steps, inner = blocks shown together. The runtime (`content-slide`'s `renderSlide`), the linter's per-block dispatch (`bin/talk-lint.js`), and the Vite plugin's `collectSceneDiagnostics` all updated for the extra nesting level. Any external code that iterated `slide.map(block => …)` now needs a second loop.

## [0.2.0] — 2026-04-19

### Added
- Syntax highlighting for fenced code blocks via `highlight.js` (core + 10 languages: bash, elixir, javascript, json, python, rust, sql, typescript, xml/html, yaml). Token colours map to the framework palette in `src/shared/colors.js` — no external theme CSS. The bundle is lazy-loaded so the linter and framework tests stay dependency-free.
- `examples/` directory — five runnable mini-decks (essentials, box-diagrams, 3d-scene, svg-scene, title-animation) covering every registered component. Each is served with `talk serve examples/<name>/`.
- Top-level `README.md` — public-facing overview: install, quick start, concepts (deck / scene / slide / step), authoring approach, CLI reference, dev-mode UX, and per-component documentation.

### Changed (BREAKING)
- Renamed the Three.js scene component from `three-scene` to `3d-scene`. Author-facing surface affected: the directory (`src/components/3d-scene/`), the registry descriptor (`name: '3d-scene'`, `matcher: { factoryExport: 'create3DScene' }`), the factory function (`create3DScene` — `createThreeScene` is gone), the example deck (`examples/3d-scene/`), and the typedefs (`Scene3DConfig`, `Scene3DSetupContext`, `Scene3DStepContext`, `Scene3DAnimateContext`). The renderer implementation file `src/rendering/three-scene.js` and its exported `createThreeRenderer` stay as-is — that layer is a thin Three.js wrapper and the old name reflects what it literally is.

### Fixed
- Root font-size now scales with the 16:9 stage, so all `rem`-based typography (content-slide, section-slide, code-fence, box-diagram, spacer, quote) fits the viewport proportionally instead of overflowing on small screens or leaving huge gutters on large ones. 1rem = 16px at the canonical 1920px stage width.
- Browser tab title now reflects the current deck's `talk.toml` title instead of the hardcoded legacy string. Multiple decks open in different tabs are distinguishable.
- Saved scene/slide/step position is scoped to the current deck. Loading a different deck starts fresh at scene 1 / slide 1 instead of restoring the prior deck's coordinates.
- `talk serve` no longer passes `--build` to `docker compose up`. The framework source is bind-mounted, so the built image was always shadowed; the flag just added latency on every startup. When a dependency is added or bumped in `package.json`, run `docker compose run --rm app npm install` to refresh the `node_modules` volume.
- `examples/svg-scene/` replaced with a memory-hierarchy bar chart (L1 / L2 / main memory drawn to linear scale). The previous three-dots-and-a-line didn't demonstrate anything the box-diagram component couldn't do.

### Repo hygiene
- Added LICENSE (MIT).
- `package.json` gained description, keywords, author, repository, homepage, bugs, and `engines` fields; dropped `"private": true`; renamed to `talk-framework` to avoid conflict with a squatted npm package.
- `.gitignore` now excludes AI/tool-specific state (`.claude/`, `.serena/`, `.superpowers/`) and the internal `docs/superpowers/plans/` directory (specs still ship).
- Added `.nvmrc` pinning Node 22.
- Removed the legacy `archive/` directory (pre-framework BEAM talk content, no longer maintained).
- Trimmed `todo.md` to reflect the post-B state.

## [0.1.0] — 2026-04-19

Initial public release. Two sub-projects have landed:

### Sub-project A — content-folder foundation

- `talk` CLI dispatcher with subcommands: `new`, `add`, `remove`, `rename`, `move`, `list`, `serve`, `lint`, `test`, `version`, `help`.
- Content folders are free-standing; each is marked by a `talk.toml` at its root. The CLI walks up from `$PWD` to find it.
- Structural edits (`add`, `remove`, `rename`, `move`) are atomic and support `--dry-run`.
- Numeric-prefixed scene directories (`01-welcome/`, `02-intro/`, …).
- Vite content-loader plugin exposes the mounted content folder via `virtual:content-manifest`.
- Bad scenes render as error-placeholder cards; the rest of the deck stays navigable.

### Sub-project B — component registry + content-aware linter + edge banner

- Component registry at `src/authoring/component-registry.js` with 12 descriptors: two scene types (`content-slide`, `section-slide`), six markdown-block built-ins (`heading`, `paragraph`, `bullet-list`, `quote`, `code-fence`, `spacer`), three JS factories (`three-scene`, `svg-scene`, `title-animation`), and the `box-diagram` DSL component.
- `box-diagram` shipped end-to-end: parser, validator with Levenshtein "did you mean" hints, DOM renderer, descriptor, bootstrap registration.
- `bin/talk-lint.js` rewritten to dispatch through the registry. Produces file:line:column diagnostics with fixed-width column alignment. Fixture-based integration tests cover clean + bad cases.
- Dev-mode edge banner surfaces diagnostics over the last-good render. HMR `talk:diagnostics` channel emitted from the Vite plugin. First-render failures still fall back to the full-screen placeholder.
- 242 tests passing.

### Infrastructure

- MIT license.
- Docker-based toolchain (`node:22-alpine`); host Node is optional for day-to-day use.
- jujutsu (`jj`) as the primary VCS; `.git/` exists for tooling compatibility only.
