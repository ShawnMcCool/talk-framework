---
title: Boxes with more to say
type: content
---

## Boxes with more to say

Roles colour-code boxes (neutral, accent, warm). A quoted string overrides the display label without changing the id. `subtitle="…"` adds a muted second line.

```box-diagram
box client "Browser app"    subtitle="React + service worker"
box api    "Edge API"       role=accent  subtitle="Cloudflare Worker"
box store  "Durable Object" role=warm    subtitle="per-tenant state"

client -- fetch       --> api
api    -- persist --> store
```
