// src/components/box-diagram/parse.lib.js

const ROLES = new Set(['external', 'accent', 'warm']);

/**
 * Parse a box-diagram block body into { section, nodes, arrows, errors }.
 * Does not cross-validate references — that's validate.lib.js's job.
 * Line numbers are relative to the start of the block body (1-indexed).
 *
 * @param {string} source
 * @param {{ file: string, blockStartLine: number }} context
 */
export function parseBoxDiagram(source, context) {
  const lines = source.split('\n');
  const nodes = [];
  const arrows = [];
  const errors = [];
  let section = null;

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const lineNo = idx + 1;
    if (!line) return;

    // section: "TITLE"
    const sectionMatch = line.match(/^section\s*:\s*(.*)$/);
    if (sectionMatch) {
      section = stripQuotes(sectionMatch[1].trim());
      return;
    }

    // box declaration
    if (line.startsWith('box ') || line === 'box') {
      const node = parseBoxDecl(line, lineNo, errors);
      if (node) nodes.push(node);
      return;
    }

    // arrow (flow line): id -- label --> id
    if (line.includes('-->')) {
      const arrow = parseArrow(line, lineNo, errors);
      if (arrow) arrows.push(arrow);
      return;
    }

    errors.push({
      line: lineNo,
      column: 1,
      message: `unrecognized box-diagram line: ${JSON.stringify(line)}`,
    });
  });

  return { section, nodes, arrows, errors };
}

function parseBoxDecl(line, lineNo, errors) {
  // Strip 'box ' prefix.
  const rest = line.slice(3).trimStart();
  if (!rest) {
    errors.push({ line: lineNo, column: 1, message: 'box declaration missing id' });
    return null;
  }

  // Tokenize: id, optional "display", then key=value pairs (value may be quoted).
  const tokens = tokenize(rest);
  if (tokens.length === 0 || tokens[0].kind !== 'bareword') {
    errors.push({ line: lineNo, column: 1, message: 'box declaration: first token must be a bareword id' });
    return null;
  }

  const id = tokens[0].value;
  let label = id;
  let role = 'external';
  let subtitle = null;

  let i = 1;
  if (i < tokens.length && tokens[i].kind === 'quoted') {
    label = tokens[i].value;
    i++;
  }

  for (; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind !== 'pair') {
      errors.push({ line: lineNo, column: 1, message: `box declaration: expected key=value, got ${JSON.stringify(t.value)}` });
      continue;
    }
    if (t.key === 'role') {
      if (!ROLES.has(t.value)) {
        errors.push({ line: lineNo, column: 1, message: `box declaration: unknown role '${t.value}' (expected: external, accent, warm)` });
      } else {
        role = t.value;
      }
    } else if (t.key === 'subtitle') {
      subtitle = t.value;
    } else {
      errors.push({ line: lineNo, column: 1, message: `box declaration: unknown attribute '${t.key}'` });
    }
  }

  return { id, label, role, subtitle, line: lineNo };
}

function parseArrow(line, lineNo, errors) {
  // Expected shape: <src> -- <label> --> <dst>
  const m = line.match(/^(\S+)\s*--\s*(.*?)\s*-->\s*(\S+)$/);
  if (!m) {
    errors.push({ line: lineNo, column: 1, message: 'arrow syntax: expected `<src> -- <label> --> <dst>`' });
    return null;
  }
  return { from: m[1], to: m[3], label: m[2], line: lineNo };
}

/**
 * Tokenize a box-declaration tail into:
 *   { kind: 'bareword', value }    (no spaces, not quoted, not a pair)
 *   { kind: 'quoted',   value }    (double-quoted literal)
 *   { kind: 'pair',     key, value } (key=value or key="value")
 */
function tokenize(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === ' ' || s[i] === '\t') { i++; continue; }

    // Quoted bareword.
    if (s[i] === '"') {
      const end = findQuoteEnd(s, i);
      if (end < 0) break;
      out.push({ kind: 'quoted', value: s.slice(i + 1, end) });
      i = end + 1;
      continue;
    }

    // Read until whitespace or '='.
    const start = i;
    while (i < s.length && s[i] !== ' ' && s[i] !== '\t' && s[i] !== '=') i++;
    const head = s.slice(start, i);

    if (s[i] === '=') {
      i++;
      // Value may be quoted or bare.
      if (s[i] === '"') {
        const end = findQuoteEnd(s, i);
        if (end < 0) break;
        out.push({ kind: 'pair', key: head, value: s.slice(i + 1, end) });
        i = end + 1;
      } else {
        const vStart = i;
        while (i < s.length && s[i] !== ' ' && s[i] !== '\t') i++;
        out.push({ kind: 'pair', key: head, value: s.slice(vStart, i) });
      }
    } else {
      out.push({ kind: 'bareword', value: head });
    }
  }
  return out;
}

function findQuoteEnd(s, openIdx) {
  for (let j = openIdx + 1; j < s.length; j++) {
    if (s[j] === '"') return j;
  }
  return -1;
}

function stripQuotes(s) {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  return s;
}
