# Sub-project A — Content-folder foundation

Date: 2026-04-19
Status: Design approved, ready for implementation planning.

## Context

`beam-talk` is being rebuilt as a reusable presentation framework, per the paradigm in `CLAUDE.md` and the gap list in `todo.md`. Today the framework and the content live in one repo, with a single hand-registered placeholder scene. This sub-project separates them into:

- a framework repo that exposes a `talk` CLI,
- free-standing content folders (the presentations themselves), each of which may live in its own repo.

This is the foundation all other sub-projects sit on: content-aware linting (B), version-contract drift warnings (D), and the extended authoring surface (C) all assume this separation is in place.

## Non-goals

The following are explicitly out of scope for this design and handled by later sub-projects:

- **Content-aware validation** (which frontmatter keys each component accepts, which variants exist, etc.) — sub-project B.
- **In-browser error overlay** for invalid content — sub-project B. This design ships the minimum runtime robustness needed to not crash on malformed content; B layers on rich messages.
- **Framework-version drift warning** — sub-project D. The config field that enables it (`framework_version`) is defined here, but the check is implemented later.
- **Markdown bridges** for Three.js / SVG / title animations — sub-project C.
- **Migration tooling** for content authored against older framework versions — deferred indefinitely.

## Author experience (happy path)

```
$ talk new my-elixir-talk
  created my-elixir-talk/
    talk.toml
    01-welcome/scene.md

$ cd my-elixir-talk
$ jj git init && jj bookmark set main          # optional — authors may version their talks
$ talk serve
  serving http://localhost:3000
  watching . (10 scenes)
  hot reload: on

  # author edits 01-welcome/scene.md in vim; browser updates.
  # author runs `talk add intro` in another terminal; new scene appears.
  # author runs `talk move 3 after 6`; deck reorders; browser reloads.
  # half-typed edit; rest of the deck stays navigable, bad scene shows a placeholder.
```

The author never touches a top-level `content/` folder, never edits a manifest file, never hand-renames a scene directory.

## Architecture

Three components, well-separated:

**Framework repo** (`beam-talk`). Contains the renderer, engine, components, linter, the `talk` script on disk, starter templates, and all tests.

**`talk` CLI** (shell script on PATH). A single shell script, installed by symlinking `<framework>/talk` into `~/.local/bin/talk` or equivalent. It's the author's only entry point. Subcommands delegate to internal scripts inside the framework repo for actual work.

**Content folder** (free-standing). A directory anywhere on disk containing a `talk.toml` marker and one or more numbered scene directories. Self-contained: it knows nothing about the framework beyond the declared `framework_version` string. May be its own git/jj repo.

```
<framework-repo>/                         <content-folder>/
  talk                 ← symlinked to       talk.toml
                         ~/.local/bin/      01-welcome/
  templates/                                  scene.md
    new-talk/                               02-intro/
      talk.toml                               scene.md
      01-welcome/                           03-…/
        scene.md                            …
  src/
    …framework code…
  docker-compose.yml
  vite.config.js
  …etc…
```

## Install model

V1 install:

```
git clone git@github.com:<user>/beam-talk ~/src/beam-talk
ln -s ~/src/beam-talk/talk ~/.local/bin/talk          # or wherever PATH points
```

That's the complete install. `talk version` then prints the framework's version. Docker is the only additional runtime requirement (unchanged from today).

Later evolution (not part of v1):

- Package as an installable binary or npm package.
- Release channel with versioned updates via `talk upgrade`.

These are flagged as open but explicitly deferred.

## Content folder shape

A content folder is any directory containing a `talk.toml` file at its root.

```
my-elixir-talk/
  talk.toml            # config + "this is a talk" marker
  01-welcome/          # numeric prefix = deck order
    scene.md           # or scene.js (never both)
  02-intro/
    scene.md
  03-architecture/
    scene.md
  …
```

### `talk.toml` schema (v1)

```toml
title = "my-elixir-talk"
author = ""
framework_version = "0.1"

[palette]
# Override framework default palette tokens here.
# Any token from the framework's default palette can be overridden.
# Examples:
# accent = "#a3d9ff"
# bg     = "#0a0a10"
```

- `title` — required, string. Shown in the browser tab and the dev HUD. Default on scaffold: the folder name.
- `author` — optional, string. Scaffold-emitted as an empty string.
- `framework_version` — required, string. Declares which framework contract the content was authored against. Sub-project D uses this for drift warnings; in v1, the field is parsed but not enforced beyond type-checking.
- `[palette]` — optional table. Per-token overrides against the framework's default palette. Unknown keys are ignored for v1 and become lint warnings in B.

No other top-level tables in v1. Everything per-scene lives in that scene's frontmatter.

### Scene directory conventions

- Directory name: `<nn>-<slug>`. `nn` is a zero-padded two-digit integer used only for sort order; `slug` is lowercase with hyphens.
- Numbers must be contiguous starting from `01`. Gaps and duplicates are structural errors (lint failure, runtime warning).
- Each directory contains exactly one of `scene.md` or `scene.js`. Having both is an error.
- Directories without either are warnings, not errors — the author may have scaffolded a placeholder.

Auxiliary files (images, data) may live in a scene directory and are served by Vite on paths relative to the scene.

## The `talk` CLI

### Command surface (v1)

| Command | Purpose |
|---|---|
| `talk new <name>` | Scaffold a new content folder at `./<name>/` |
| `talk add <slug>` | Append a new scene (`--after N` / `--first` to position) |
| `talk remove <N>` | Delete a scene and renumber everything after it |
| `talk rename <N> <new-slug>` | Change a scene's slug; number is preserved |
| `talk move <N> after <M>` | Reorder; also `before`, `first`, `last` |
| `talk serve [path]` | Run the live-reloading dev server against `path` (default: `.`) |
| `talk lint [path]` | Validate `path`; exit non-zero on error |
| `talk test` | Run framework tests (inside the framework repo only) |
| `talk list` | List top-level scene directories of the current talk |
| `talk version` | Print the installed framework version |
| `talk help [subcommand]` | Show usage |

Rules that hold across the surface:

- **Path resolution.** All path-taking commands default to `.`. The resolver walks up the directory tree until it finds a `talk.toml`. `talk serve` run inside `my-elixir-talk/03-architecture/` works and knows which talk it's in.
- **`talk.toml` is the "this is a talk" marker.** Any command other than `new` and `version` errors with a clear message if no marker is found.
- **Identifiers.** Commands referencing existing scenes take scene numbers (the current numeric prefix). Commands creating new scenes take a slug.
- **`--dry-run`.** Available on every command that writes (`new`, `add`, `remove`, `rename`, `move`). Prints the intended effect — including per-folder rename pairs — and exits without touching the filesystem.
- **Good help.** `talk` with no args prints a usage summary. `talk <subcommand> --help` shows the subcommand's flags and at least one worked example.
- **Failure mode.** Structural commands (`add`, `remove`, `move`, `rename`) either fully succeed or make no changes. Dry-run is the safe preview; the real operation is atomic.

### Dry-run output example

```
$ talk move 3 after 6 --dry-run
  03-architecture → 06-architecture
  04-demo         → 03-demo
  05-tradeoffs    → 04-tradeoffs
  06-outro        → 05-outro
  (no filesystem changes; re-run without --dry-run to apply)
```

## Scene discovery and update model

**Strategy: rescan + reload on any filesystem change.** Also known as Strategy A from the brainstorm.

At `talk serve` startup the framework:

1. Reads `talk.toml`.
2. Scans the current folder for `<nn>-<slug>/` directories matching the naming convention.
3. Sorts by `nn`.
4. For each directory, loads `scene.md` or `scene.js` into a scene module.
5. Validates shape (current `scene-validation.lib.js`).
6. Starts the engine.
7. Watches the content folder.

When the file watcher fires for *any* change inside the content folder (file edit, add, remove, rename), the framework rescans from step 2 and triggers an HMR re-setup: the engine and all scene instances are torn down, the new deck is built, the browser is instructed to reload. The browser's last position (scene/slide/step) is restored from session state, clamped to the new deck shape.

### Why full rescan

- One code path for every change. Easier to make robust than surgical updates.
- Position preservation via session state matches what the current HMR handler already does — no new infrastructure.
- The "don't crash on bad content" property reduces to: rescan must not throw on malformed content, and any scene that fails to load becomes a placeholder slot in the deck.

### Error handling scope for A (minimum viable)

This sub-project ships the minimum runtime robustness required to not crash. Sub-project B elaborates this into rich, authoring-quality errors.

- **`talk.toml` missing or malformed:** fatal at `talk serve` startup. Clear terminal error, no browser page served.
- **Scene folder fails to load** (parse error, missing file, contract violation): the scene becomes a placeholder slot. The placeholder renders a simple error card in the browser showing the scene number + one-line reason. Navigation to neighbouring scenes still works. No uncaught exceptions reach the engine loop.
- **Structural errors** (gap in numbering, duplicate number, folder with both `scene.md` and `scene.js`): the runtime warns once at startup and skips the offending directory. Sub-project B turns these into first-class lint errors with file/line context.

Sub-project B replaces the "simple error card" with a richer overlay and adds file/line/component-level context. The placeholder mechanism introduced here is the hook B attaches to.

## Framework repo layout (delta from today)

```
<framework-repo>/
  talk                       # NEW — single-file shell script, entry point for the CLI
  bin/                       # NEW — internal scripts the `talk` wrapper calls
    talk-new                 #         (each subcommand is a file here)
    talk-add
    talk-remove
    talk-rename
    talk-move
    talk-serve
    talk-lint
    talk-list
    talk-version
    talk-help
  templates/                 # NEW
    new-talk/                # what `talk new` copies
      talk.toml
      01-welcome/
        scene.md
  docker-compose.yml         # existing, parameterized to mount a content folder
  vite.config.js             # existing, parameterized via CONTENT_DIR env var
  src/                       # framework code (unchanged by this sub-project)
  test/                      # framework tests (unchanged)
```

Each `bin/talk-*` script is small and focused. The top-level `talk` wrapper dispatches to them and handles global concerns (argument parsing, `--help`, error formatting).

Why many files rather than one monolithic script: this is the same discipline that applies everywhere in the framework — small files with one responsibility each. Also makes subcommands independently testable.

## Docker + Vite integration

No dramatic changes to the current Docker/Vite setup. The changes are:

- `docker-compose.yml` reads `CONTENT_DIR` from the environment and bind-mounts that path to a known location inside the container (e.g. `/content`).
- `vite.config.js` reads the content-folder location from the environment and passes it to a small framework-side module that owns scene discovery.
- Framework-side discovery module: pure function on (content path, file listing) → array of scene module descriptors. Testable without Vite.

The `talk serve` script sets `CONTENT_DIR` to the resolved content folder path and invokes `docker compose up`.

## Testing strategy

Matches the project's `*.lib.js` + `*.lib.test.js` discipline.

**Pure units** (unit-tested headlessly):

- **Scene discovery.** Given a directory listing, return a sorted array of scene descriptors. Input: list of directory names. Output: `[{ index, slug, path, kind: 'md'|'js' }, ...]` or a list of structural errors.
- **Rename planning.** Given current scenes and a structural command (move/remove/add), return the list of `{from, to}` rename pairs. Input: current state + command. Output: rename plan. Dry-run prints the same plan the real command executes.
- **TOML parsing and validation.** Given a config string, return the parsed config or a typed error.

**CLI integration** (shell-level tests that run the `talk` binary against fixture directories):

- `talk new` scaffolds the expected structure.
- `talk move 3 after 6` on a 7-scene fixture produces the expected final layout.
- `talk move` with `--dry-run` prints the plan and leaves the fixture unchanged.
- `talk lint` exits 1 on a fixture with a known structural error.

**End-to-end / runtime** (manual for now; automation in later sub-projects):

- `talk serve` against a fixture renders the deck.
- File watcher changes trigger re-scan + reload; browser position is preserved.
- A scene with intentional breakage becomes a placeholder, not a crash.

## Decisions deferred to other sub-projects

| Decision | Owner |
|---|---|
| Component-aware lint rules (which frontmatter keys are valid for each component, etc.) | B |
| In-browser error overlay with file/line/component context | B |
| Framework-version drift warning behavior | D |
| Markdown bridges for Three.js / SVG / title-animation components | C |
| "Box-diagram" and other new components | C |

## Open questions acknowledged but not blocking

- **Framework distribution beyond symlink** — npm package, Homebrew tap, standalone binary. All deferred; the symlinked shell script is sufficient for the single-author use case we're designing for today.
- **Template variants** — e.g. `talk new <name> --template slides-only` vs a default starter. V1 ships one template.
- **Multi-talk workflows** — whether `talk list` should also list presentations under some discovery root. V1 scope: `talk list` operates on the talk identified by the current working directory.
