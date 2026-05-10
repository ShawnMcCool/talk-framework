---
title: Code
type: content
---

:spacer:

## Code, highlighted

Fenced code blocks pick up syntax highlighting from highlight.js. Any language hljs knows is fair game; the colors come from the deck palette.

```javascript
export function compileMarkdownScene(source, opts = {}) {
  const { frontmatter, body } = splitFrontmatter(source);
  const meta = parseFrontmatter(frontmatter);
  const slides = parseSlides(body, opts);
  return meta.type === 'section'
    ? createSectionSlide(meta.title, sectionOpts(meta))
    : createContentSlide(meta.title, slides, contentOpts(meta, opts));
}
```

---

### A different language, same treatment

:spacer:

```sql
SELECT folder, COUNT(*) AS slides
FROM scene_index
WHERE deck = 'essentials'
GROUP BY folder
ORDER BY folder;
```

!muted Each scene also supports its own palette via `colors:` in frontmatter — handy when one slide should pop a different accent.
