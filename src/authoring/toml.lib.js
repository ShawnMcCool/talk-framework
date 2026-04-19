// Minimal TOML parser for the v1 talk.toml schema.
// Supports: string, number, boolean scalars at top level and inside one-level
// [table] sections. Strips `#` comments. No arrays, no nested tables, no multi-line strings.
// Throws an Error with a line number on any deviation.

export function parseToml(source) {
  const out = {};
  let currentTable = null;
  const lines = source.split('\n');

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    // Strip comments (but not # inside a quoted string).
    const line = stripComment(rawLine);
    const trimmed = line.trim();
    if (trimmed === '') return;

    // Section header.
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const name = trimmed.slice(1, -1).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) {
        throw new Error(`line ${lineNum}: invalid table name "${name}"`);
      }
      if (out[name] !== undefined) {
        throw new Error(`line ${lineNum}: duplicate table [${name}]`);
      }
      out[name] = {};
      currentTable = out[name];
      return;
    }

    // key = value
    const eq = findTopLevelEquals(trimmed);
    if (eq === -1) {
      throw new Error(`line ${lineNum}: expected key = value`);
    }
    const key = trimmed.slice(0, eq).trim();
    const valueRaw = trimmed.slice(eq + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)) {
      throw new Error(`line ${lineNum}: invalid key "${key}"`);
    }

    const value = parseValue(valueRaw, lineNum);
    const target = currentTable || out;
    if (target[key] !== undefined) {
      throw new Error(`line ${lineNum}: duplicate key "${key}"`);
    }
    target[key] = value;
  });

  return out;
}

function stripComment(line) {
  let inString = false;
  let quoteChar = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inString) {
      if (c === '\\') { i++; continue; }
      if (c === quoteChar) { inString = false; continue; }
    } else {
      if (c === '"' || c === "'") { inString = true; quoteChar = c; continue; }
      if (c === '#') return line.slice(0, i);
    }
  }
  return line;
}

function findTopLevelEquals(s) {
  let inString = false;
  let quoteChar = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (c === '\\') { i++; continue; }
      if (c === quoteChar) { inString = false; continue; }
    } else {
      if (c === '"' || c === "'") { inString = true; quoteChar = c; continue; }
      if (c === '=') return i;
    }
  }
  return -1;
}

function parseValue(raw, lineNum) {
  if (raw === '') throw new Error(`line ${lineNum}: empty value`);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw[0] === '"' || raw[0] === "'") {
    const quote = raw[0];
    if (raw[raw.length - 1] !== quote || raw.length < 2) {
      throw new Error(`line ${lineNum}: unterminated string`);
    }
    // Allow simple backslash escapes.
    return raw.slice(1, -1).replace(/\\(.)/g, '$1');
  }
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (/^-?\d+\.\d+$/.test(raw)) return Number(raw);
  throw new Error(`line ${lineNum}: unrecognized value "${raw}"`);
}
