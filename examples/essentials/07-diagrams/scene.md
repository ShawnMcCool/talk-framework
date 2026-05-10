---
title: Diagrams
type: content
---

:spacer:

## Box-and-arrow diagrams

Inline, declared in a fenced code block — no separate Mermaid pass.

```box-diagram
section: REQUEST PATH
box client  "Browser"      subtitle="React app"
box edge    "Edge worker"  role=accent  subtitle="cache + auth"
box api     "API"          role=accent
box db      "Postgres"     role=warm    subtitle="primary store"

client -- HTTPS         --> edge
edge   -- forward       --> api
api    -- read / write  --> db
db     -- result rows   --> api
```

---

### Roles colour-code, subtitles add a second line

:spacer:

Reuse `role=accent` and `role=warm` across the deck — your audience learns the colour mapping by the third diagram.
