# Markdown authoring reference

The full syntax accepted by `compileMarkdownScene`. See
`src/types.js` for the TypeScript-ish shapes and
`docs/architecture/authoring.md` for the compile pipeline.

## File layout

```markdown
---
title: Required
type: content        # or "section"
# …more frontmatter…
---

First slide body.

---

Second slide body.
```

- Frontmatter is YAML-ish: scalar keys, optionally one level of indented
  nested keys (used for `colors:`).
- `---` on its own line separates slides. Inside a fenced code block it is
  ignored.
- A slide is one **reveal step** by default — every block shows at once.
  To split a slide into additional reveal steps, prefix a block's content
  with `+++ ` (after the markdown marker, so the line still parses as its
  block type in any editor):

  | Block | Plain | Opens a new reveal step |
  | --- | --- | --- |
  | heading | `# Title` | `# +++ Title` |
  | bullet | `- item` | `- +++ item` |
  | quote | `> line` | `> +++ line` |
  | paragraph | `Text.` | `+++ Text.` |

  Fenced code blocks, box-diagrams, and `:spacer:` directives don't take a
  step prefix. If you need to reveal one of those progressively, put the
  `+++ ` on whatever block precedes it.
- **Bullet lists are special**: every `- +++` item inside one contiguous
  list opens a new step, and bullets without `+++` join the currently-
  revealing step. The renderer stitches the whole list into a single `<ul>`
  so the reveal reads as progressive disclosure within one list.

  ```
  - shown initially
  - shown initially
  - +++ revealed on step advance
  - +++ revealed on the next advance
  - joins the step above (no +++)
  - also joins (no +++)
  ```

  Indent controls nesting the same way as any other bullet (2 spaces or 1
  tab per level). Break the list (blank line + new list) if you want the
  next bullets rendered as a *separate* list.
- A `+++ ` at the very start of a slide is elided — there's nothing before
  it to require a step advance.

## Frontmatter keys

| Key | Type | Used when `type =` | Meaning |
| --- | --- | --- | --- |
| `title` *(required)* | string | both | Palette / navigation title. |
| `type` | `"content"` \| `"section"` | — | Factory selection. Default `"content"`. |
| `subtitle` | string | `section` | Line rendered under the title. |
| `accent` | hex | both | Accent color (rules/shimmer for section; heading-2 + bullets for content). |
| `bg` | hex | `section` | Outer background. |
| `bgDark` | hex | `section` | Center of the radial background gradient. |
| `text` | hex | `section` | Title text color. |
| `fontSize` | CSS size | `section` | Title size (default `"9rem"`). |
| `letterStagger` | number (ms) | `section` | Delay between letter-in animations (default `50`). |
| `colors` | nested map | `content` | Per-scene palette overrides (`colors.accent: "#ff0"`). |

Unknown frontmatter keys are silently forwarded to the factory, which
silently ignores them. Typos won't warn.

## Block syntax (content slides)

| Syntax | Produces |
| --- | --- |
| `# Text` | `{ type: 'heading', level: 1, text }` |
| `## Text` | `{ type: 'heading', level: 2, text }` |
| `### Text` | `{ type: 'heading', level: 3, text }` |
| `- item` / `* item` (consecutive lines) | `{ type: 'bullets', items: [{ text, depth }] }` |
| `> line 1`<br>`> line 2`<br>`> — attribution` | `{ type: 'quote', text, attribution? }` |
| ```` ```lang<br>code<br>``` ```` | `{ type: 'code', code, language }` |
| `:spacer:` | `{ type: 'spacer' }` |
| `:spacer lg:` | `{ type: 'spacer', size: 'lg' }` |
| `!muted This is …` | `{ type: 'text', text, muted: true }` |
| Any other paragraph | `{ type: 'text', text }` |

Notes:

- Bullet lists consume contiguous `-`/`*` lines; a blank line ends the list.
  Indent a bullet to nest it under the previous item. One level of nesting
  per 2 spaces **or** per tab (a tab counts the same as two spaces, regardless
  of how your editor displays it):

  ```
  - top-level
    - nested
    - also nested
  - another top-level
  ```
- Quote attribution is detected by a trailing line starting with `—` or `--`
  and stripped from the quote body.
- Code fences are line-level: they must start at column 0.
- Raw HTML inside a paragraph is passed through verbatim — useful for
  colored `<span>`s via `{{tokenName}}` interpolation.

## Box diagrams

Embed a box-and-arrow diagram with a fenced code block using the info-string
`box-diagram` — the same editor-friendly pattern as Mermaid, Graphviz, and Kroki.

````markdown
```box-diagram
…
```
````

One block = one diagram. When a slide needs two diagrams stacked, write two adjacent
blocks; the framework inserts the horizontal rule between them automatically.

### Block body syntax

The body is declare-then-connect:

```
box <short-id> [<"display label">]  [role=<role>]  [subtitle="…"]
…
<src-id>  --  <arrow-label>  -->  <dst-id>
```

**Box declarations:**

- **Short ID** is always required. It is the default display label. A quoted string after
  the ID overrides the display without changing the reference: one bareword = both ID and
  display; bareword + quoted string = ID + override.
- **`role`** is one of `external` (default, neutral border), `accent` (cyan), `warm`
  (amber). Reuse roles across the deck to teach color-role mapping.
- **`subtitle="…"`** is optional, named (not positional), and renders as a muted second
  line under the box label.

**Arrow (flow) lines:**

- Shape: `<src-id>  --  <label>  -->  <dst-id>`
- Arrow label is everything between ` -- ` and ` --> `, trimmed. No quoting needed.
  The literal string `-->` is forbidden inside a label.
- Roles, labels, and IDs are all case-sensitive.

**Section header:**

- `section: "TITLE"` on its own line sets the small-caps header above the diagram.
  Omit it when the slide has only one diagram.

**Fan-out / fan-in:** use multiple flow lines referencing the same node ID.

**Bidirectional relationships:** write two flow lines (one in each direction). There
is no double-arrow glyph.

### Example

````markdown
---
title: Three boxes
---

# Three boxes, one table.

```box-diagram
section: THE SYSTEM
box client                              subtitle="browser / app"
box api         "My Blah API"           role=accent
box database                            role=warm

client -- POST /purchase --> api
api    -- SQL             --> database
```
````

## Color token interpolation

`{{tokenName}}` is replaced at compile time with
`colors[tokenName]` from `src/shared/colors.js`. Any named entry in that
export is valid: `{{bg}}`, `{{accent}}`, `{{purple}}`, `{{green}}`, etc.
Unknown tokens are left literal.

Example:

```markdown
- <strong style="color:{{accent}}">Erlang</strong> is the language
```

## Example: content slide

```markdown
---
title: Why it matters
type: content
accent: "#44bbff"
---

# Why it matters

- Built for <strong style="color:{{accent}}">resilience</strong>
- Lightweight processes — millions, not thousands
- Preemptive scheduling

---

### The Philosophy

:spacer:

> Make it work, make it beautiful, make it fast.
> — Joe Armstrong

!muted Designed for systems that must never go down.
```

## Example: section slide

```markdown
---
title: Hot Takes
type: section
subtitle: opinions may vary
accent: "#ff9944"
---
```

Section slides have no body; the factory animates the title itself.

## Example: custom palette override

```markdown
---
title: Monitors
type: content
colors:
  accent: "#aa77ff"
  bgDark: "#0a0a1a"
---

# Monitor vs. Link

- Monitors are **one-way** notifications.
- Links are **bidirectional** lifecycle bonds.
```
