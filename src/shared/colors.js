// Palette derived from media-centaur code visualizer.
// Deep navy base with saturated blue/cyan/orange accents.
//
// HSL building hues from the visualizer (S:0.55 L:0.48), available for future scene use:
//   Blue:   hsl(216, 55%, 48%)
//   Teal:   hsl(162, 55%, 48%)
//   Amber:  hsl(36, 55%, 48%)
//   Purple: hsl(288, 55%, 48%)
//   Red:    hsl(0, 55%, 48%)
//   Green:  hsl(108, 55%, 48%)

export const colors = {
  bg: '#1a1a2e',
  bgDark: '#141428',
  bgDarker: '#0f0f1e',
  text: '#e8e8f8',
  textMuted: '#99aacc',
  accent: '#aaccff',
  accentWarm: '#ff9944',
  accentOrange: '#ff8844',
  failure: '#ff3366',
  beam: '#44bbff',
};

export function applyColorVars(el) {
  for (const [key, value] of Object.entries(colors)) {
    el.style.setProperty(`--color-${key}`, value);
  }
}
