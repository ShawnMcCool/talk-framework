---
title: The request path
type: content
---

## The request path

Every feature in the product lives behind this three-hop flow.

```box-diagram
box browser
box api role=accent
box db role=warm

browser -- HTTP --> api
api     -- SQL  --> db
```
