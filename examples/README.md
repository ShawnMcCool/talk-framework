# examples

Runnable mini-decks that demonstrate each of the framework's registered components. Each subdirectory is a self-contained content folder — its own `talk.toml`, its own numbered scenes — and can be served independently.

## How to run

From the repo root:

```bash
talk serve examples/<deck>/
```

The dev server starts on http://localhost:3000. Use the arrow keys to step through slides. Press `Escape` for the command palette and `n` / `d` to toggle the nav / debug overlays.

## Catalogue

| Deck | Components shown | Run |
|------|-----------------|-----|
| `essentials/` | content-slide, section-slide, heading, paragraph, bullet-list, quote, code-fence, spacer | `talk serve examples/essentials/` |
| `box-diagrams/` | box-diagram (simple flow, section header, roles + subtitles) | `talk serve examples/box-diagrams/` |
| `three-scene/` | three-scene (JS factory — rotating cube with step-driven state) | `talk serve examples/three-scene/` |
| `svg-scene/` | svg-scene (JS factory — memory-hierarchy bar chart drawn to scale) | `talk serve examples/svg-scene/` |
| `title-animation/` | title-animation (JS factory — typewriter variant) | `talk serve examples/title-animation/` |

## Lint checks

Each deck should lint cleanly:

```bash
cd examples/<deck>/ && talk lint
```

Expected: `lint: ok`.

## Notes on the JS scenes

The `three-scene/`, `svg-scene/`, and `title-animation/` examples use a `/@fs/app/src/...` import prefix. This is Vite's dev-server escape hatch for importing files outside the content root: the framework sits at `/app` inside Docker; the content folder is mounted at `/content`. The `/@fs/` prefix lets a scene's JS code reach back into the framework for factories like `createThreeScene` and `createSvgScene`. It works during `talk serve` but not in a production bundle — which is the right scope for examples.

Sub-project C will add markdown bridges (`type: three-scene` with frontmatter parameters) so simple 3D / SVG / title scenes can be authored without writing JS. Until then, these examples show the JS-authored path directly.

## See also

- `docs/markdown-authoring.md` — full syntax reference for markdown-authored scenes.
- `docs/architecture/authoring.md` — how the component registry fits together.
- `docs/examples/minimal-markdown.md` and `docs/examples/minimal-three.js` — smallest possible reference stubs (not runnable as standalone decks).
- `templates/new-talk/` — the scaffold `talk new` copies.
