# Authoring layer

**Path:** `src/authoring/`

## Purpose

Compile markdown scene files into `SceneModule`s and validate the scene
registry at startup. This is the glue between content (markdown) and the
generic factories (`createContentSlide` / `createSectionSlide`).

## Pipeline

```
*.md?raw  ──►  parseMarkdownScene (lib)  ──►  compileMarkdownScene  ──►  SceneModule
                 │                              │
                 │ frontmatter → options        │ options.type →
                 │ body        → slides/blocks  │   'section' → createSectionSlide
                 │                              │   'content' → createContentSlide
                 └── pure (tested headless)     └── imports the factories
```

The parser (`markdown-scene.lib.js`) is pure and DOM-free; its tests run in
Node. The compiler (`markdown-scene.js`) is thin: frontmatter `type` picks
the factory, everything else is forwarded as options.

## What the parser accepts

Block-level grammar is intentionally small. See
`docs/markdown-authoring.md` for the complete block + frontmatter reference,
and `ContentBlock` in `src/types.js` for the produced shape.

Notable nuances:
- `---` separates slides; inside a fenced code block it is ignored.
- A paragraph starting with `!muted ` gets `{ muted: true }` on the text
  block.
- `:directive:` or `:directive size:` produces `{ type: directive, size }` —
  currently only `spacer` is rendered; unknown directives are emitted but
  ignored by the factory.
- Unknown frontmatter keys are **silently forwarded** to the factory, which
  silently ignores unknown options. Typos won't warn today.
- `{{tokenName}}` is interpolated before parsing, from the `colors` map
  passed by `compileMarkdownScene`.

## Validation

`validateScenes(sceneDefs)` is run once at startup from `main.js`. It
checks every registered scene against `SceneModule` (title, required
methods, `slides` shape). It **logs**, it does not throw — a broken scene
surfaces as a console warning without killing the deck.

## Invariants

- **Parser has no imports from rendering / factories.** Keeps it testable.
- **`compileMarkdownScene` returns a fully-formed `SceneModule`.** The rest
  of the app cannot tell a markdown-authored scene from a hand-rolled one.

## Common pitfalls

- **Typoed frontmatter key** (`acent: "#ff0"`). No warning; factory just
  uses its default.
- **Missing `title` frontmatter.** Throws — this is the one hard failure.
- **`---` inside a quoted block.** It will still split the slide because
  the split happens at the line level (fenced code is the only context
  that protects it).
- **HTML in markdown.** Passed through verbatim, which is great for
  custom color spans (`<span style="color:{{beam}}">…</span>`) but means
  an unclosed tag leaks into the rest of the slide.
