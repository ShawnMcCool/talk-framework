---
name: talk-author
description: Use when authoring, editing, or structuring a presentation in the talk framework. Triggers include requests to add, edit, reorder, or remove scenes; draft slides; write bullet lists, quotes, code samples, or box-and-arrow diagrams; choose between markdown and JS-authored scenes; override palette colors; debug scenes that don't render; lint the deck; or tighten narrative flow. Recognize the project as a talk by the presence of `talk.toml` at the content root and `NN-slug/` scene folders.
---

# talk-author

Procedural knowledge for authoring in the **talk** presentation framework.

You are collaborating with someone giving this talk. Your job is to help them realize *their* vision — not to impose your own. When a section is ambiguous, ask one focused question; when it's clear, draft.

## 0 — First moves

Before editing anything:

1. Read `talk.toml` at the talk root — note `title`, `author`, `framework_version`, and any `[palette]` overrides. Palette tokens change what `{{accent}}`, `{{bg}}`, etc. resolve to.
2. List scene folders (`NN-<slug>/`) in order. The `NN` prefix is the sort key.
3. If the author hasn't stated their vision yet, ask: who is the audience, what's the one thing you want them to take away, and how long is the talk?

## 1 — The edit/lint loop

The linter is the framework's contract with content. Treat `talk lint` as part of every edit:

```
edit scene  →  talk lint  →  fix diagnostics  →  repeat
```

`talk lint` parses every scene through the component registry and reports `file:line` errors. Zero exit means every scene is parseable. The dev server also runs the linter on startup; in dev mode a banner surfaces errors inline.

Run the preview with `talk serve` (http://localhost:3000). Live reload picks up markdown edits; state is preserved across HMR.

## 2 — Structural edits (use the CLI — never hand-rename folders)

```
talk new <name>                  scaffold a new talk
talk add <slug>                  append a new scene (NN auto-assigned)
talk add <slug> --at 3           insert as scene 3; everything shifts
talk remove <n>                  delete scene n; renumber the rest
talk rename <n> <new-slug>       rename the slug; keep the NN
talk move <n> after <m>          reorder; all affected folders rename atomically
talk list                        print the deck outline
talk lint                        validate
talk serve                       dev server
```

Every structural command supports `--dry-run`. Renumbering is atomic: either all folders rename or none do. **Do not rename `NN-slug` folders by hand** — use the CLI so the prefix math stays consistent.

## 3 — Where content lives

A scene is one folder. Exactly one of:

- `NN-slug/scene.md` — markdown-authored (the default; use this for ~90% of slides)
- `NN-slug/scene.js` — JS-authored (for animation, 3D, custom visuals)

**Never both** — `talk lint` flags the ambiguity. Pick one per scene.

Vocabulary:

```
Scene      one folder / one module
 Slide     one ArrowRight step — separated by `---` in markdown
  Step     one reveal within a slide — separated by `+++`
```

The command-palette `Jump to Slide` in dev mode accepts `scene.slide.step` (1-indexed).

## 4 — Markdown scenes — full reference

Minimal scene:

~~~markdown
---
title: Why it matters
type: content
---

# Heading

- first bullet
- second bullet

---

### Second slide

> A quote with attribution.
> — Attribution line
~~~

### Frontmatter keys

| Key | Type | Used when `type =` | Meaning |
| --- | --- | --- | --- |
| `title` *(required)* | string | both | Palette / navigation title |
| `type` | `"content"` \| `"section"` | — | Factory selection. Default `"content"` |
| `subtitle` | string | `section` | Line under the title |
| `accent` | hex | both | Accent color (rules for section; h2 + bullets for content) |
| `bg`, `bgDark`, `text` | hex | `section` | Section-slide colors |
| `fontSize` | CSS size | `section` | Title size (default `"7rem"`) |
| `letterStagger` | ms (number) | `section` | Letter-in stagger (default `50`) |
| `colors` | nested map | `content` | Per-scene palette overrides: `colors.accent: "#ff0"` |

**Unknown frontmatter keys are silently forwarded and silently ignored.** Typos do not warn — double-check spelling. Missing `title` is the one hard failure.

### Slide and step separators

- `---` on its own line = new slide (ignored inside fenced code blocks)
- `+++` on its own line = new reveal step within the slide
- Default: each slide is one step (everything shows at once). Use `+++` only when you want a deliberate reveal.

### Block syntax (inside a `type: content` slide)

| Syntax | Produces |
| --- | --- |
| `# Text` / `## Text` / `### Text` | heading, level 1 / 2 / 3 |
| `- item` (consecutive lines) | bullet list; indent by 2 spaces or 1 tab to nest |
| `> line`<br>`> — Attribution` | blockquote; trailing `— …` is attribution |
| ` ```lang\ncode\n``` ` | code block with language |
| `:spacer:` or `:spacer lg:` | vertical spacer |
| `!muted Text.` | muted paragraph |
| Any other paragraph | regular paragraph |

Raw HTML is passed through — useful for colored spans. An unclosed tag leaks into the rest of the slide.

### Color tokens

`{{tokenName}}` is replaced at compile time with `colors[tokenName]`. Defaults include `bg`, `bgDark`, `text`, `textMuted`, `accent`, `accentWarm`, `beam`, `green`, `purple`, `failure`. Deck-level overrides live in `talk.toml` `[palette]`; per-scene overrides in frontmatter `colors:` (content) or top-level `accent`/`bg`/... (section).

Example:

```markdown
- Built for <strong style="color:{{accent}}">resilience</strong>
```

### Section slides — title-only chapter breaks

~~~markdown
---
title: Hot Takes
type: section
subtitle: opinions may vary
accent: "#ff9944"
---
~~~

Section slides have no body — just frontmatter. Use them to signpost major movements in the talk. If the body exists, it's ignored.

## 5 — Box diagrams

The canonical non-built-in component. Use for system-level relationships — requests, flows, architectural layering. Authored with a fenced code block, info-string `box-diagram`. One block per diagram; two adjacent blocks stack with a rule between them.

~~~markdown
```box-diagram
section: THE SYSTEM
box client                     subtitle="browser / app"
box api     "My Blah API"      role=accent
box database                   role=warm

client -- POST /purchase --> api
api    -- SQL             --> database
```
~~~

### Syntax

- `box <short-id>` — bare ID (used as both reference and label).
- `box <id> "Display label"` — display label differs from ID.
- `role=<external|accent|warm>` — color role. Default `external` (neutral). Reuse roles across the deck so viewers learn the color → concept mapping.
- `subtitle="…"` — muted second line under the label.
- `<src> -- <label> --> <dst>` — directed arrow. Label is the trimmed text between ` -- ` and ` --> `. No quoting. The literal `-->` is forbidden in a label.
- `section: "TITLE"` — optional small-caps header above the diagram.

**Fan-out / fan-in:** repeat flow lines using the same node ID.
**Bidirectional:** write two flow lines, one each direction. There is no double-arrow glyph.

IDs, labels, and roles are case-sensitive.

## 6 — JS-authored scenes (when markdown isn't enough)

Reach for JS only when you need motion, 3D, or custom graphics. The framework has factories that absorb renderer + lifecycle + cancellation boilerplate.

| Factory | Import from | Use for |
| --- | --- | --- |
| `create3DScene` | `src/components/3d-scene/scene-factory.js` | Three.js scenes |
| `createSvgScene` | `src/components/svg-scene/scene-factory.js` | SVG graphics |
| `createTitleScene` | `src/components/title-animation/` | Animated titles (typewriter / drop / zoom-punch / spin-lock / extrude / reverse-explode) |

Every JS scene satisfies `SceneModule`:

```javascript
export const myScene = {
  title: 'Scene Name',
  slides: [{ stepCount: N }, ...],
  init(stage)          { /* mount, return context */ },
  destroy()            { /* tear down */ },
  resolveToSlide(ctx, slideIndex, stepIndex)         { /* instant */ },
  animateToSlide(ctx, slideIndex, stepIndex, done)   { /* animated, call done() */ },
};
```

Minimal Three.js scene:

```javascript
import * as THREE from 'three';
import { create3DScene } from '<framework>/src/components/3d-scene/scene-factory.js';
import { colors } from '<framework>/src/shared/colors.js';

export const myScene = create3DScene({
  title: 'My 3D Scene',
  slides: [{ stepCount: 2 }],
  setup({ scene }) {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshStandardMaterial({ color: colors.beam }),
    );
    scene.add(cube);
    return { cube };
  },
  onTick({ cube }) { cube.rotation.y += 0.005; },
  resolveStep({ cube }, { stepIndex }) {
    cube.scale.setScalar(stepIndex === 0 ? 1 : 1.5);
  },
  animateStep({ cube }, { stepIndex, playTimeline, markDirty, done }) {
    const from = cube.scale.x;
    const to   = stepIndex === 0 ? 1 : 1.5;
    playTimeline(
      [{ property: 's', from, to, delay: 0, duration: 400 }],
      ({ s }) => { cube.scale.setScalar(s); markDirty(); },
      done,
    );
  },
});
```

### JS scene contract — the two invariants that bite

1. **Determinism.** `resolveStep(n)` must produce identical visual state whether reached by animating 0..n or jumping directly. Store absolute state, not deltas.
2. **Exactly one `done()` per `animateStep`.** Use the injected `playTimeline` / `setTimeout` — never the globals — so cancellation auto-cleans. Missing `done()` locks future navigation into the instant path.

### When the scene looks frozen

Three.js renders on-demand. After mutating an object, call `markDirty()`. The factory's `playTimeline` `apply` callback should call it on every frame.

## 7 — Common pitfalls

- **Typoed frontmatter key** (e.g. `acent:`). No warning; the default value is used. Cross-check spellings against the table above.
- **`---` inside a blockquote.** Splits the slide. Quote fences are not protected — only fenced code blocks are.
- **Both `scene.md` and `scene.js`.** Lint error. Pick one.
- **Hand-renamed folders** with broken `NN-` prefix order. Use `talk move` / `talk rename`.
- **Hardcoded hex values in JS.** Import from `src/shared/colors.js` — the palette is the source of truth.
- **Forgetting `markDirty()`** after a Three.js mutation — scene appears frozen.
- **Using global `setTimeout` in `animateStep`** — the timer fires after the user has moved on. Use the injected one.

## 8 — Narrative craft

The framework lets you build anything; that's not the same as a *good* talk. Push the author toward:

- **One idea per slide.** If a slide needs three bullets and a quote, it's two slides.
- **Section slides as chapter breaks.** They signal "we're switching gears" — the audience needs the beat.
- **Concrete examples before abstract claims.** Box diagrams work hard here.
- **Cut words mercilessly.** Bullets should be fragments, not sentences. Rewrite "The system is designed to handle millions of concurrent connections" as "Millions of concurrent connections."
- **Reveal steps (`+++`) sparingly.** Every `+++` is a click the audience waits for. Earn it. A slide with four `+++` separators is usually two slides.
- **Code samples: minimize.** Strip imports, shorten names, keep the payload ≤10 lines. If it's bigger, it belongs on a handout, not a slide.
- **Reuse color roles.** If `accent` means "our service" on slide 3, don't repurpose it for "database" on slide 7. The audience learns the mapping across the deck.
- **End with a punch.** The last section slide is what the audience walks out carrying.

## 9 — When to ask vs. draft

Ask one focused question when:

- The author's intent for a section is unclear ("what's the takeaway here?").
- A scene could be content or section and you can't tell which serves the flow.
- An existing scene contradicts something you're about to add.

Draft directly when:

- The author has given a clear brief.
- You're doing mechanical edits (typos, tightening a bullet list, fixing a lint error).
- You're reorganizing based on an outline they've already endorsed.

Show the diff, run `talk lint`, report the result.
