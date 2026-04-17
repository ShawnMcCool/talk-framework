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
- Each top-level block (heading, bullet list, paragraph, quote, code fence,
  directive) is one **reveal step**. Step N shows blocks 0..N.

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
| `fontSize` | CSS size | `section` | Title size (default `"7rem"`). |
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
| `- item` / `* item` (consecutive lines) | `{ type: 'bullets', items: [...] }` |
| `> line 1`<br>`> line 2`<br>`> — attribution` | `{ type: 'quote', text, attribution? }` |
| ```` ```lang<br>code<br>``` ```` | `{ type: 'code', code, language }` |
| `:spacer:` | `{ type: 'spacer' }` |
| `:spacer lg:` | `{ type: 'spacer', size: 'lg' }` |
| `!muted This is …` | `{ type: 'text', text, muted: true }` |
| Any other paragraph | `{ type: 'text', text }` |

Notes:

- Bullet lists consume contiguous `-`/`*` lines; a blank line ends the list.
- Quote attribution is detected by a trailing line starting with `—` or `--`
  and stripped from the quote body.
- Code fences are line-level: they must start at column 0.
- Raw HTML inside a paragraph is passed through verbatim — useful for
  colored `<span>`s via `{{tokenName}}` interpolation.

## Color token interpolation

`{{tokenName}}` is replaced at compile time with
`colors[tokenName]` from `src/shared/colors.js`. Any named entry in that
export is valid: `{{bg}}`, `{{accent}}`, `{{beam}}`, `{{purple}}`, etc.
Unknown tokens are left literal.

Example:

```markdown
- <strong style="color:{{beam}}">BEAM</strong> is the runtime
```

## Example: content slide

```markdown
---
title: Why the BEAM?
type: content
accent: "#44bbff"
---

# Why the BEAM?

- Built for <strong style="color:{{beam}}">telecom</strong>
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
