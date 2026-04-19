---
name: presentation-preview
description: Use when previewing, screenshotting, or visually iterating on presentation slides — triggers on "preview", "screenshot", "how does it look", "show me the slide", "visual check", or debugging visual appearance of scenes.
---

# Presentation Preview

Workflow skill for visual iteration on talk scenes using Chrome DevTools MCP.

## Prerequisites

The dev server must be running at `http://localhost:3000`. If not:

```
The user should run ./dev in a separate terminal.
```

## Open the Presentation

```
navigate_page → http://localhost:3000/talk/
```

If the page shows a blank screen or error, try `http://localhost:3000/` instead (dev server may not need the base path).

## Navigate to a Specific Scene

**Via command palette:**

1. `press_key → Escape` (opens command palette)
2. `type_text → {scene title or number}` (fuzzy search)
3. `press_key → Enter` (jump to scene)
4. `press_key → Escape` (close palette if still open)

**Via sequential navigation:**

- `press_key → ArrowRight` or `press_key → Space` — next slide/step
- `press_key → ArrowLeft` — previous slide/step

## Take a Screenshot

After navigating to the desired slide:

```
take_screenshot
```

Review the screenshot to assess visual quality, layout, colors, and animations.

## Visual Iteration Loop

1. **Screenshot** the current state
2. **Review** — check layout, colors, text size, spacing, visual hierarchy
3. **Edit** the scene code (`src/scenes/{nn}-{name}/scene.js`)
4. **Wait** — Vite HMR reloads the scene automatically, preserving slide position
5. **Screenshot** again to verify the change
6. Repeat until satisfied

## Debug Overlay

To see current position (scene/slide/step):

1. `press_key → Escape`
2. `type_text → debug`
3. `press_key → Enter`

The overlay shows: `Scene 1/3 | Slide 1/5 | Step 2/3` at bottom-left.

## Aspect Ratio Testing

The presentation targets 16:9 and 16:10 at 1080p.

```
resize_page → width: 1920, height: 1080    # 16:9
take_screenshot

resize_page → width: 1920, height: 1200    # 16:10
take_screenshot
```

Compare both screenshots to ensure content looks correct at both ratios.

## Troubleshooting

**Black screen after navigation:** The scene may not have called `markDirty()`. Check that `resolveToSlide` calls `renderer.markDirty()`.

**Scene not loading:** Check the browser console for errors:
```
list_console_messages
```

**HMR not updating:** If code changes don't appear, the HMR module replacement may have failed. Refresh the page:
```
navigate_page → http://localhost:3000/talk/
```
Then navigate back to the scene.
