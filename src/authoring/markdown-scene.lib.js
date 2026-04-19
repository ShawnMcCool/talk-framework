// Pure parser for markdown-authored scenes.
// Tested headlessly — no DOM, no imports from factories.

const FRONTMATTER_DELIM = /^---\s*$/;

/**
 * Split the frontmatter (YAML-ish) block from the body.
 * Returns { frontmatter: object, body: string }.
 */
export function parseFrontmatter(source) {
  const lines = source.split('\n');
  if (lines.length === 0 || !FRONTMATTER_DELIM.test(lines[0])) {
    return { frontmatter: {}, body: source };
  }

  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (FRONTMATTER_DELIM.test(lines[i])) {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) {
    return { frontmatter: {}, body: source };
  }

  const fmLines = lines.slice(1, closeIdx);
  const frontmatter = parseFrontmatterLines(fmLines);
  const body = lines.slice(closeIdx + 1).join('\n');
  return { frontmatter, body };
}

function parseFrontmatterLines(lines) {
  const out = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }

    // Only top-level keys live at column 0.
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!m) { i++; continue; }

    const key = m[1];
    const rawValue = m[2];

    if (rawValue === '') {
      // Nested object — collect subsequent indented lines.
      const nested = {};
      i++;
      while (i < lines.length) {
        const sub = lines[i];
        if (!/^\s+/.test(sub)) break;
        const subm = sub.match(/^\s+([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
        if (subm) nested[subm[1]] = coerceScalar(subm[2]);
        i++;
      }
      out[key] = nested;
    } else {
      out[key] = coerceScalar(rawValue);
      i++;
    }
  }
  return out;
}

function coerceScalar(raw) {
  const t = raw.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  // Quoted string
  if ((t.startsWith('"') && t.endsWith('"')) ||
      (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  // Number (but not hex colors like #abc)
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

/**
 * Parse the body (post-frontmatter) into an array of slides,
 * each being an array of block objects.
 */
export function parseSlideBody(body) {
  const lines = body.split('\n');

  // Split by top-level `---` separators, but not inside a code fence.
  const slideChunks = [];
  let current = [];
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line.trim())) inFence = !inFence;
    if (!inFence && FRONTMATTER_DELIM.test(line)) {
      slideChunks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  slideChunks.push(current);

  // Trim leading/trailing empty slides caused by whitespace-only bodies.
  while (slideChunks.length > 1 && slideChunks[0].every(l => l.trim() === '')) {
    slideChunks.shift();
  }
  while (slideChunks.length > 1 && slideChunks[slideChunks.length - 1].every(l => l.trim() === '')) {
    slideChunks.pop();
  }

  return slideChunks.map(parseSlideBlocks);
}

/**
 * Parse a single slide's lines into a sequence of reveal steps. Each step
 * is an array of blocks that appear together.
 *
 * By default a slide has ONE step containing every block — authors get
 * "show the whole slide at once" behaviour. A line containing exactly `+++`
 * splits the slide into additional steps. Consecutive `+++`s and leading/
 * trailing `+++`s are elided (they'd yield empty steps).
 *
 * @param {string[]} lines
 * @returns {Array<Array<object>>} steps — outer array = steps, inner = blocks
 */
function parseSlideBlocks(lines) {
  const steps = [[]];
  let i = 0;

  const push = (block) => { steps[steps.length - 1].push(block); };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') { i++; continue; }

    // Step separator
    if (trimmed === '+++') {
      steps.push([]);
      i++;
      continue;
    }

    // Fenced code
    if (/^```/.test(trimmed)) {
      const openLine = i + 1; // 1-indexed position of the opening fence
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing fence
      push({ type: 'code', code: codeLines.join('\n'), language: lang || '', line: openLine + 1 });
      continue;
    }

    // Heading
    const h = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      push({ type: 'heading', text: h[2], level: h[1].length, line: i + 1 });
      i++;
      continue;
    }

    // Bullets
    if (/^[-*]\s+/.test(trimmed)) {
      const startLine = i + 1;
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      push({ type: 'bullets', items, line: startLine });
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(trimmed)) {
      const startLine = i + 1;
      const qLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        qLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      // Separate attribution: trailing line starting with — or --
      let attribution = null;
      const last = qLines[qLines.length - 1];
      if (last && /^(—|--)\s*/.test(last)) {
        attribution = last.replace(/^(—|--)\s*/, '').trim();
        qLines.pop();
      }
      const block = { type: 'quote', text: qLines.join(' ').trim(), line: startLine };
      if (attribution) block.attribution = attribution;
      push(block);
      continue;
    }

    // Directive-style blocks like :spacer: or :spacer lg:
    const dir = trimmed.match(/^:([a-z]+)(?:\s+([a-z0-9]+))?:$/i);
    if (dir) {
      const block = { type: dir[1], line: i + 1 };
      if (dir[2]) block.size = dir[2];
      push(block);
      i++;
      continue;
    }

    // Paragraph (collect until blank/block boundary)
    const startLine = i + 1;
    const pLines = [];
    while (i < lines.length) {
      const l = lines[i];
      const t = l.trim();
      if (t === '') break;
      if (t === '+++') break;
      if (/^(#{1,3})\s+/.test(t)) break;
      if (/^[-*]\s+/.test(t)) break;
      if (/^>\s?/.test(t)) break;
      if (/^```/.test(t)) break;
      if (/^:[a-z]+(?:\s+[a-z0-9]+)?:$/i.test(t)) break;
      pLines.push(l.trim());
      i++;
    }
    let text = pLines.join(' ').trim();
    const muted = text.startsWith('!muted');
    if (muted) text = text.replace(/^!muted\s*/, '');
    const block = { type: 'text', text, line: startLine };
    if (muted) block.muted = true;
    push(block);
  }

  // Drop empty steps (leading, trailing, or back-to-back +++s).
  return steps.filter(step => step.length > 0);
}

/**
 * Full parse of a markdown scene source.
 * @param {string} source
 * @param {Record<string, string>} [colorsMap] map of {{tokens}} → replacement strings
 * @returns {import('../types.js').ParsedMarkdownScene}
 */
export function parseMarkdownScene(source, colorsMap = {}) {
  const interpolated = interpolate(source, colorsMap);
  const { frontmatter, body } = parseFrontmatter(interpolated);

  if (!frontmatter.title) {
    throw new Error('markdown scene is missing required `title` in frontmatter');
  }

  const { title, type: rawType, ...options } = frontmatter;
  const type = rawType || 'content';

  const slides = parseSlideBody(body);

  return { title, type, options, slides };
}

function interpolate(source, map) {
  if (!map || Object.keys(map).length === 0) return source;
  return source.replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g, (m, key) => {
    return Object.prototype.hasOwnProperty.call(map, key) ? String(map[key]) : m;
  });
}
