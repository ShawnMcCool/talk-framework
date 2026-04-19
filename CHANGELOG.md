# Changelog

All notable changes to this project are recorded in this file. Version numbers follow [semver](https://semver.org/); dates are in ISO 8601.

## [Unreleased]

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
