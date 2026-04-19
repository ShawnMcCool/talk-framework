// src/authoring/diagnostic-printer.lib.js

/**
 * Format diagnostics into a multi-line fixed-column string suitable for
 * terminal output. File paths are emitted as-is; callers should make them
 * content-root-relative before passing in.
 *
 * @param {Array<object>} diags
 * @returns {string}
 */
export function formatDiagnostics(diags) {
  if (!diags.length) return '';

  const lines = [];
  const sevWidth = Math.max(5, ...diags.map(d => d.severity.length));
  const locWidth = Math.max(...diags.map(d => formatLoc(d).length));
  const compWidth = Math.max(...diags.map(d => d.component.length));

  for (const d of diags) {
    lines.push(
      pad(d.severity, sevWidth) + '  ' +
      pad(formatLoc(d), locWidth) + '  ' +
      pad(d.component, compWidth) + '  ' +
      d.message
    );
    if (d.hint) {
      lines.push(pad('hint', sevWidth) + '  ' + pad('', locWidth) + '  ' + pad('', compWidth) + '  ' + d.hint);
    }
  }

  return lines.join('\n') + '\n';
}

function formatLoc(d) {
  return `${d.file}:${d.line}:${d.column}`;
}

function pad(s, w) {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}
