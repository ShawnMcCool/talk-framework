---
title: In practice
type: content
---

## In practice

A good comment starts from the code, not from the reviewer's preferences:

```js
// Before
function fetchUser(id) {
  return db.query('SELECT * FROM users WHERE id = ?', [id]);
}

// After
function fetchUser(id) {
  return db.query('SELECT id, email, display_name FROM users WHERE id = ?', [id]);
}
```

> The best code reviews feel like a pair of eyes reading alongside you, not a gate checking whether you deserve to merge.
> — internal team retro, 2024
