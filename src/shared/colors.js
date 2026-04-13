export const colors = {
  bg: '#4a5068',
  bgDark: '#383d52',
  bgDarker: '#2d3142',
  text: '#e8e8f0',
  textMuted: '#9a9cb8',
  accent: '#5fb4a2',
  accentWarm: '#f2b866',
  accentOrange: '#e8915a',
  failure: '#e86b6b',
  beam: '#8fa4d4',
};

export function applyColorVars(el) {
  for (const [key, value] of Object.entries(colors)) {
    el.style.setProperty(`--color-${key}`, value);
  }
}
