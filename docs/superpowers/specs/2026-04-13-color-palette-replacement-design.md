# Color Palette Replacement

Replace the current washed-out beam-talk palette with the deeper, more saturated color language from the media-centaur visualizer.

## Context

The current palette (`src/shared/colors.js`) uses warm gray-purples that look washed out and unattractive. The media-centaur code visualizer (`~/src/media-centaur/backend/tmp/visualizer.html`) uses a deep navy base with saturated blue/cyan/orange accents that look much better — especially for a presentation projected onto a wall at distance.

## New Palette

| Key | Old | New | Source |
|-----|-----|-----|--------|
| `bg` | `#4a5068` | `#1a1a2e` | Visualizer body background |
| `bgDark` | `#383d52` | `#141428` | Visualizer panel bg `rgba(20,20,40)` |
| `bgDarker` | `#2d3142` | `#0f0f1e` | Deeper step below panel bg |
| `text` | `#e8e8f0` | `#e8e8f8` | Visualizer primary text |
| `textMuted` | `#9a9cb8` | `#99aacc` | Visualizer secondary text |
| `accent` | `#5fb4a2` | `#aaccff` | Visualizer active/accent blue |
| `accentWarm` | `#f2b866` | `#ff9944` | Visualizer animation highlight |
| `accentOrange` | `#e8915a` | `#ff8844` | Visualizer outgoing edge color |
| `failure` | `#e86b6b` | `#ff3366` | Visualizer violation color |
| `beam` | `#8fa4d4` | `#44bbff` | Visualizer incoming edge cyan |

## HSL Building Hues

The visualizer generates building colors from 6 root hues at S:0.55 L:0.48. These are documented in a comment block in `colors.js` for future scene use but not exported as named constants yet:

- Blue: 216° → `hsl(216, 55%, 48%)`
- Teal: 162° → `hsl(162, 55%, 48%)`
- Amber: 36° → `hsl(36, 55%, 48%)`
- Purple: 288° → `hsl(288, 55%, 48%)`
- Red: 0° → `hsl(0, 55%, 48%)`
- Green: 108° → `hsl(108, 55%, 48%)`

## Files to Modify

1. **`src/shared/colors.js`** — replace all 10 color values, add HSL hues comment block
2. **`index.html`** — replace hardcoded `#000` backgrounds with `#1a1a2e`

## What Does NOT Change

- The `applyColorVars()` function and CSS variable mechanism
- Scene files — they import from `colors.js` and will pick up new values automatically
- Color key names — all existing references remain valid

## Verification

1. Run `./dev` and open `http://localhost:3000`
2. Confirm background is deep navy, not black or gray
3. Navigate through demo-html and demo-three scenes — colors should match the approved palette preview
4. No console errors
