# {{TALK_NAME}}

A presentation built on the **talk** framework. Deck metadata lives in `talk.toml`; each `NN-<slug>/` folder is one scene.

## Working with Claude

A project-local skill at `.claude/skills/talk-author/SKILL.md` has the full procedural knowledge — markdown block syntax, the box-diagram DSL, the JS scene contract, common pitfalls, and narrative guidance. Invoke it when authoring or revising scenes.

## CLI

```
talk serve                 live preview at http://localhost:3000
talk lint                  validate every scene — run this after edits
talk add <slug>            append a new scene
talk move <n> after <m>    reorder; folders rename atomically
talk remove <n>            delete and renumber
talk list                  print the deck outline
```

Never hand-rename `NN-<slug>/` folders — use `talk move` / `talk rename` so the prefix math stays consistent.

## Deploying

This talk ships with a GitHub Pages workflow at `.github/workflows/deploy.yml`. Push to GitHub, then enable Pages under **Settings → Pages → Source: GitHub Actions**. Every subsequent push to `main` rebuilds and republishes. Delete the `.github/` folder to opt out.
