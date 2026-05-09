// Pure parser for markdown-authored scenes.
// Tested headlessly — no DOM, no imports from factories.

import { parseImageOnlyParagraph } from '../components/image/parse.lib.js';

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
  const openStep = () => { steps.push([]); };

  // Consume a `+++ ` prefix if present, returning { opensStep, text }.
  // Kept inline on block content so the block's markdown marker (`#`, `>`,
  // `-`, etc.) still leads the line — stock markdown editors see a normal
  // heading / quote / bullet and render correctly.
  const stripStepPrefix = (text) => {
    if (/^\+\+\+\s+/.test(text)) {
      return { opensStep: true, text: text.replace(/^\+\+\+\s+/, '') };
    }
    return { opensStep: false, text };
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') { i++; continue; }

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

    // Heading — `# Text` or `# +++ Text` (the latter opens a new step).
    const h = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const { opensStep, text } = stripStepPrefix(h[2]);
      if (opensStep) openStep();
      push({ type: 'heading', text, level: h[1].length, line: i + 1 });
      i++;
      continue;
    }

    // Bullets — one level of nesting per 2 spaces OR per tab. An item's
    // depth is floor((spaces + tabs × 2) / 2); equivalently, tab counts
    // the same as 2 spaces regardless of the editor's tab-display width.
    //
    // An item whose text starts with `+++ ` opens a new reveal step at that
    // bullet. The list stays a contiguous markdown list in source (so stock
    // editors render it correctly); the parser slices it into groups where
    // each `+++` item begins a fresh step, and the renderer stitches all
    // groups back into one <ul> via `continuation: true`.
    if (/^[-*]\s+/.test(trimmed)) {
      const startLine = i + 1;
      const rawItems = [];
      while (i < lines.length && /^[ \t]*[-*]\s+/.test(lines[i])) {
        const m = lines[i].match(/^([ \t]*)[-*]\s+(.*)$/);
        const spaces = m[1].replace(/\t/g, '  ').length;
        const depth = Math.floor(spaces / 2);
        const { opensStep, text } = stripStepPrefix(m[2]);
        rawItems.push({ text, depth, line: i + 1, opensStep });
        i++;
      }

      // Group items: a new group starts at every `+++`-prefixed item
      // (unless the current group is still empty, which happens when the
      // very first item carries `+++`).
      const groups = [];
      let current = { items: [], line: startLine };
      for (const it of rawItems) {
        if (it.opensStep && current.items.length > 0) {
          groups.push(current);
          current = { items: [], line: it.line };
        }
        current.items.push({ text: it.text, depth: it.depth });
      }
      if (current.items.length > 0) groups.push(current);

      // The first group joins the current step iff the first item was *not*
      // a `+++` boundary. Every subsequent group opens a new step and is
      // flagged `continuation: true` so the renderer collapses the whole
      // run into one <ul>.
      const firstOpensStep = rawItems[0].opensStep;
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        const newStep = firstOpensStep || gi > 0;
        if (newStep) openStep();
        const block = { type: 'bullets', items: g.items, line: g.line };
        if (newStep) block.continuation = true;
        push(block);
      }
      continue;
    }

    // Blockquote — `> text` or `> +++ text` (first line opens a new step).
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
      let opensStep = false;
      if (qLines[0]) {
        const prefix = stripStepPrefix(qLines[0]);
        opensStep = prefix.opensStep;
        qLines[0] = prefix.text;
      }
      if (opensStep) openStep();
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

    // Paragraph — `+++ text` as the first line opens a new step. A `+++ `
    // line in the middle of an ongoing paragraph ends the current paragraph
    // so the next one can claim its own step.
    const startLine = i + 1;
    const pLines = [];
    while (i < lines.length) {
      const l = lines[i];
      const t = l.trim();
      if (t === '') break;
      if (pLines.length > 0 && /^\+\+\+\s+/.test(t)) break;
      if (/^(#{1,3})\s+/.test(t)) break;
      if (/^[-*]\s+/.test(t)) break;
      if (/^>\s?/.test(t)) break;
      if (/^```/.test(t)) break;
      if (/^:[a-z]+(?:\s+[a-z0-9]+)?:$/i.test(t)) break;
      pLines.push(l.trim());
      i++;
    }
    let text = pLines.join(' ').trim();
    const { opensStep, text: stripped } = stripStepPrefix(text);
    text = stripped;

    // Image-only paragraph → emit an `image-row` block instead of plain text.
    // When a `+++` between such paragraphs lands us in a fresh step whose
    // predecessor is also a single image-row block, flag this one as a
    // continuation so the renderer can collapse the run into one <figure>
    // with per-image visibility.
    const images = parseImageOnlyParagraph(text);
    if (images) {
      if (opensStep) openStep();
      const block = { type: 'image-row', images, line: startLine };
      const newStepEmpty = steps[steps.length - 1].length === 0;
      const prevStep = steps.length >= 2 ? steps[steps.length - 2] : null;
      if (newStepEmpty
          && prevStep
          && prevStep.length === 1
          && prevStep[0].type === 'image-row') {
        block.continuation = true;
      }
      push(block);
      continue;
    }

    if (opensStep) openStep();
    const muted = text.startsWith('!muted');
    if (muted) text = text.replace(/^!muted\s*/, '');
    const block = { type: 'text', text, line: startLine };
    if (muted) block.muted = true;
    push(block);
  }

  // Drop empty steps (an opening `+++` with no prior content produces one).
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

/**
 * Given a parsed markdown scene and a deck-level palette, produce the
 * dispatch record a factory consumes: kind, title, and factory arguments.
 *
 * Merge order:
 *   defaultColors  <  [palette] from talk.toml  <  per-scene frontmatter
 *
 * For `content` scenes, palette keys become the base of `options.colors`,
 * then per-scene `colors:` wins. For `section` scenes, palette supplies
 * defaults for `accent`/`bg`/`bgDark`/`text` when frontmatter omits them.
 *
 * @param {import('../types.js').ParsedMarkdownScene} parsed
 * @param {Record<string, string>} [palette]
 * @returns {{ kind: 'content'|'section', title: string, factoryArgs: object }}
 */
export function resolveSceneOptions(parsed, palette = {}) {
  if (parsed.type === 'section') {
    const { colors: _ignored, ...rest } = parsed.options;
    return {
      kind: 'section',
      title: parsed.title,
      factoryArgs: {
        accent: palette.accent,
        bg: palette.bg,
        bgDark: palette.bgDark,
        text: palette.text,
        ...rest,
      },
    };
  }
  if (parsed.type === 'content') {
    const frontmatterColors = parsed.options.colors || {};
    const mergedColors = { ...palette, ...frontmatterColors };
    return {
      kind: 'content',
      title: parsed.title,
      factoryArgs: { ...parsed.options, colors: mergedColors },
    };
  }
  throw new Error(`markdown scene: unknown type "${parsed.type}"`);
}
