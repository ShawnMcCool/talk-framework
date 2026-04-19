# Changelog

All notable changes to this project are recorded in this file. Version numbers follow [semver](https://semver.org/); dates are in ISO 8601.

## [Unreleased]

### Added
- Syntax highlighting for fenced code blocks via `highlight.js` (core + 10 languages: bash, elixir, javascript, json, python, rust, sql, typescript, xml/html, yaml). Token colours map to the framework palette in `src/shared/colors.js` — no external theme CSS. Unknown languages fall through to plain `<pre><code>` as before.

### Changed (BREAKING)
- Renamed the Three.js scene component from `three-scene` to `3d-scene`. Author-facing surface affected: the directory (`src/components/3d-scene/`), the registry descriptor (`name: '3d-scene'`, `matcher: { factoryExport: 'create3DScene' }`), the factory function (`create3DScene` — `createThreeScene` is gone), the example deck (`examples/3d-scene/`), and the typedefs (`Scene3DConfig`, `Scene3DSetupContext`, `Scene3DStepContext`, `Scene3DAnimateContext`). The renderer implementation file `src/rendering/three-scene.js` and its exported `createThreeRenderer` stay as-is — that layer is a thin Three.js wrapper and the old name reflects what it literally is.

### Fixed
- Saved scene/slide/step position is now scoped to the current deck (via `talk.toml`'s `title`). Loading a different deck starts fresh at scene 1 / slide 1 instead of restoring the prior deck's coordinates.
- `talk serve` no longer passes `--build` to `docker compose up`. The framework source is bind-mounted, so the built image was always shadowed; the flag just added latency on every startup. When a dependency is added or bumped in `package.json`, run `docker compose run --rm app npm install` to refresh the `node_modules` volume.

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
