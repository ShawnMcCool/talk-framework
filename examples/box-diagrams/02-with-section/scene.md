---
title: Grouping under a heading
type: content
---

## Grouping under a heading

A `section:` line sets a small-caps header above the diagram — useful when a slide needs to label which part of the system it's describing.

```box-diagram
section: READ PATH
box api role=accent
box cache
box db role=warm

api   -- check first  --> cache
cache -- fall through --> db
```
