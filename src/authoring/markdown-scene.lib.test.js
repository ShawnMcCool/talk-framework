import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFrontmatter,
  parseSlideBody,
  parseMarkdownScene,
  resolveSceneOptions,
} from './markdown-scene.lib.js';

describe('parseFrontmatter', () => {
  it('extracts simple key/value pairs', () => {
    const src = `---
title: Why BEAM?
type: content
---

body goes here`;
    const { frontmatter, body } = parseFrontmatter(src);
    assert.equal(frontmatter.title, 'Why BEAM?');
    assert.equal(frontmatter.type, 'content');
    assert.equal(body.trim(), 'body goes here');
  });

  it('strips quotes around values', () => {
    const src = `---
title: "Quoted Title"
accent: '#ff0000'
---
`;
    const { frontmatter } = parseFrontmatter(src);
    assert.equal(frontmatter.title, 'Quoted Title');
    assert.equal(frontmatter.accent, '#ff0000');
  });

  it('parses numbers and booleans', () => {
    const src = `---
letterStagger: 50
fancy: true
muted: false
---
`;
    const { frontmatter } = parseFrontmatter(src);
    assert.equal(frontmatter.letterStagger, 50);
    assert.equal(frontmatter.fancy, true);
    assert.equal(frontmatter.muted, false);
  });

  it('parses one level of nested keys', () => {
    const src = `---
title: X
colors:
  accent: "#f00"
  bg: "#111"
---
`;
    const { frontmatter } = parseFrontmatter(src);
    assert.deepEqual(frontmatter.colors, { accent: '#f00', bg: '#111' });
  });

  it('returns body verbatim when no frontmatter', () => {
    const src = '# Heading\n\nparagraph';
    const { frontmatter, body } = parseFrontmatter(src);
    assert.deepEqual(frontmatter, {});
    assert.equal(body, src);
  });

  it('handles frontmatter with no body', () => {
    const src = `---
title: Empty
---`;
    const { frontmatter, body } = parseFrontmatter(src);
    assert.equal(frontmatter.title, 'Empty');
    assert.equal(body.trim(), '');
  });
});

// Each slide is Array<Array<Block>> — outer = reveal steps, inner = blocks
// shown together. Default is ONE step containing every block. A `+++ `
// prefix *inside* a block (after the markdown marker — `# +++ h`, `> +++ q`,
// `- +++ b`, or leading a paragraph) opens a new reveal step at that block,
// so the source stays valid markdown for editors that don't know about
// reveal steps.
describe('parseSlideBody', () => {
  it('splits slides on --- lines', () => {
    const body = `# Slide 1

---

# Slide 2`;
    const slides = parseSlideBody(body);
    assert.equal(slides.length, 2);
  });

  it('parses a heading block', () => {
    const slides = parseSlideBody('# Big Title');
    assert.deepEqual(slides[0][0][0], { type: 'heading', text: 'Big Title', level: 1, line: 1 });
  });

  it('parses h2 and h3 with correct levels', () => {
    const slides = parseSlideBody('## Sub\n\n### Label');
    assert.equal(slides[0][0][0].level, 2);
    assert.equal(slides[0][0][1].level, 3);
  });

  it('collects consecutive bullets into one bullets block', () => {
    const slides = parseSlideBody('- alpha\n- beta\n- gamma');
    assert.deepEqual(slides[0][0][0], {
      type: 'bullets',
      items: [
        { text: 'alpha', depth: 0 },
        { text: 'beta', depth: 0 },
        { text: 'gamma', depth: 0 },
      ],
      line: 1,
    });
  });

  it('supports * as bullet marker', () => {
    const slides = parseSlideBody('* one\n* two');
    assert.deepEqual(slides[0][0][0], {
      type: 'bullets',
      items: [
        { text: 'one', depth: 0 },
        { text: 'two', depth: 0 },
      ],
      line: 1,
    });
  });

  it('indents of 2 spaces nest bullets by one depth level', () => {
    const slides = parseSlideBody('- top\n  - sub a\n  - sub b\n- next top');
    assert.deepEqual(slides[0][0][0], {
      type: 'bullets',
      items: [
        { text: 'top', depth: 0 },
        { text: 'sub a', depth: 1 },
        { text: 'sub b', depth: 1 },
        { text: 'next top', depth: 0 },
      ],
      line: 1,
    });
  });

  it('four-space indent counts as depth 2', () => {
    const slides = parseSlideBody('- a\n  - b\n    - c');
    assert.deepEqual(slides[0][0][0].items, [
      { text: 'a', depth: 0 },
      { text: 'b', depth: 1 },
      { text: 'c', depth: 2 },
    ]);
  });

  it('one tab counts as one level of nesting (same as two spaces)', () => {
    const slides = parseSlideBody('- a\n\t- b\n\t\t- c');
    assert.deepEqual(slides[0][0][0].items, [
      { text: 'a', depth: 0 },
      { text: 'b', depth: 1 },
      { text: 'c', depth: 2 },
    ]);
  });

  it('mixed tabs and spaces nest consistently', () => {
    const slides = parseSlideBody('- a\n\t- b\n  \t- c');
    assert.deepEqual(slides[0][0][0].items, [
      { text: 'a', depth: 0 },
      { text: 'b', depth: 1 },
      { text: 'c', depth: 2 },
    ]);
  });

  it('`- +++ text` inside a bullet list opens a new step at that item', () => {
    const slides = parseSlideBody('- alpha\n- +++ beta\n- +++ gamma');
    assert.equal(slides[0].length, 3);
    assert.deepEqual(slides[0][0][0], {
      type: 'bullets', items: [{ text: 'alpha', depth: 0 }], line: 1,
    });
    assert.deepEqual(slides[0][1][0], {
      type: 'bullets', items: [{ text: 'beta', depth: 0 }], line: 2, continuation: true,
    });
    assert.deepEqual(slides[0][2][0], {
      type: 'bullets', items: [{ text: 'gamma', depth: 0 }], line: 3, continuation: true,
    });
  });

  it('bullets without `+++` after a `+++` bullet stay in that step', () => {
    const slides = parseSlideBody('- a\n- +++ b\n- c\n- d\n- +++ e');
    // Step 0 = [a], step 1 = [b, c, d], step 2 = [e]
    assert.equal(slides[0].length, 3);
    assert.deepEqual(slides[0][0][0].items, [{ text: 'a', depth: 0 }]);
    assert.deepEqual(slides[0][1][0].items, [
      { text: 'b', depth: 0 },
      { text: 'c', depth: 0 },
      { text: 'd', depth: 0 },
    ]);
    assert.equal(slides[0][1][0].continuation, true);
    assert.deepEqual(slides[0][2][0].items, [{ text: 'e', depth: 0 }]);
    assert.equal(slides[0][2][0].continuation, true);
  });

  it('`- +++ text` as the very first bullet opens a new step for the run', () => {
    const slides = parseSlideBody('# H\n\n- +++ a\n- +++ b');
    // Step 0 = heading; step 1 = [a]; step 2 = [b].
    assert.equal(slides[0].length, 3);
    assert.equal(slides[0][0][0].type, 'heading');
    assert.deepEqual(slides[0][1][0].items, [{ text: 'a', depth: 0 }]);
    assert.equal(slides[0][1][0].continuation, true);
    assert.deepEqual(slides[0][2][0].items, [{ text: 'b', depth: 0 }]);
    assert.equal(slides[0][2][0].continuation, true);
  });

  it('nested bullets after a `+++` item inherit the step', () => {
    const slides = parseSlideBody('- a\n- +++ parent\n  - child');
    assert.equal(slides[0].length, 2);
    assert.deepEqual(slides[0][1][0].items, [
      { text: 'parent', depth: 0 },
      { text: 'child', depth: 1 },
    ]);
    assert.equal(slides[0][1][0].continuation, true);
  });

  it('parses a blockquote', () => {
    const slides = parseSlideBody('> Make it work.');
    assert.deepEqual(slides[0][0][0], { type: 'quote', text: 'Make it work.', line: 1 });
  });

  it('attaches attribution from trailing — line inside quote', () => {
    const slides = parseSlideBody('> A wise quote.\n> — Someone Famous');
    assert.deepEqual(slides[0][0][0], {
      type: 'quote',
      text: 'A wise quote.',
      line: 1,
      attribution: 'Someone Famous',
    });
  });

  it('parses a fenced code block', () => {
    const slides = parseSlideBody('```js\nconst x = 1;\n```');
    assert.deepEqual(slides[0][0][0], {
      type: 'code',
      code: 'const x = 1;',
      language: 'js',
      line: 2,
    });
  });

  it('parses text paragraph', () => {
    const slides = parseSlideBody('Some prose.\nWith two lines.');
    assert.deepEqual(slides[0][0][0], {
      type: 'text',
      text: 'Some prose. With two lines.',
      line: 1,
    });
  });

  it('marks a paragraph as muted when prefixed with !muted', () => {
    const slides = parseSlideBody('!muted Quiet voice.');
    assert.deepEqual(slides[0][0][0], {
      type: 'text',
      text: 'Quiet voice.',
      line: 1,
      muted: true,
    });
  });

  it('recognises :spacer: as a spacer block', () => {
    const slides = parseSlideBody(':spacer:');
    assert.deepEqual(slides[0][0][0], { type: 'spacer', line: 1 });
  });

  it('recognises :spacer lg: as a large spacer', () => {
    const slides = parseSlideBody(':spacer lg:');
    assert.deepEqual(slides[0][0][0], { type: 'spacer', size: 'lg', line: 1 });
  });

  it('treats a whole slide as one reveal step by default', () => {
    const slides = parseSlideBody('# Heading\n\n- bullet one\n- bullet two\n\nparagraph');
    assert.equal(slides[0].length, 1);                // one step
    assert.equal(slides[0][0].length, 3);              // three blocks in that step
    assert.equal(slides[0][0][0].type, 'heading');
    assert.equal(slides[0][0][1].type, 'bullets');
    assert.equal(slides[0][0][2].type, 'text');
  });

  it('`# +++ Text` opens a new reveal step for a heading', () => {
    const slides = parseSlideBody('# Intro\n\n## +++ Next');
    assert.equal(slides[0].length, 2);
    assert.equal(slides[0][0][0].text, 'Intro');
    assert.equal(slides[0][1][0].type, 'heading');
    assert.equal(slides[0][1][0].level, 2);
    assert.equal(slides[0][1][0].text, 'Next');
  });

  it('`> +++ quote` opens a new reveal step for a quote', () => {
    const slides = parseSlideBody('# Heading\n\n> +++ stirring words\n> — me');
    assert.equal(slides[0].length, 2);
    assert.equal(slides[0][1][0].type, 'quote');
    assert.equal(slides[0][1][0].text, 'stirring words');
    assert.equal(slides[0][1][0].attribution, 'me');
  });

  it('`+++ paragraph` opens a new reveal step for a paragraph', () => {
    const slides = parseSlideBody('First para.\n\n+++ Second para shows later.');
    assert.equal(slides[0].length, 2);
    assert.equal(slides[0][0][0].text, 'First para.');
    assert.equal(slides[0][1][0].text, 'Second para shows later.');
  });

  it('a `+++ ` line mid-paragraph ends the previous paragraph and starts a new step', () => {
    const slides = parseSlideBody('Line one.\n+++ Line two.');
    assert.equal(slides[0].length, 2);
    assert.equal(slides[0][0][0].text, 'Line one.');
    assert.equal(slides[0][1][0].text, 'Line two.');
  });

  it('`+++` as the first block of a slide emits a single non-empty step', () => {
    const slides = parseSlideBody('# +++ Only heading');
    assert.equal(slides[0].length, 1);
    assert.equal(slides[0][0][0].text, 'Only heading');
  });

  it('ignores `+++` inside a fenced code block', () => {
    const slides = parseSlideBody('```\nbefore\n+++\nafter\n```');
    assert.equal(slides[0].length, 1);
    assert.equal(slides[0][0][0].type, 'code');
    assert.match(slides[0][0][0].code, /before\n\+\+\+\nafter/);
  });

  it('handles an empty slide as zero steps', () => {
    const slides = parseSlideBody('# First\n\n---\n\n---\n\n# Last');
    assert.equal(slides.length, 3);
    assert.equal(slides[1].length, 0);
    assert.equal(slides[2][0][0].text, 'Last');
  });

  it('ignores leading/trailing whitespace in body', () => {
    const slides = parseSlideBody('\n\n# Heading\n\n');
    assert.equal(slides.length, 1);
    assert.equal(slides[0][0][0].type, 'heading');
  });
});

describe('parseMarkdownScene', () => {
  it('produces a content scene config', () => {
    const src = `---
title: Why BEAM?
type: content
---

# Why BEAM?

- first
- second

---

> Make it work.
> — Joe`;
    const parsed = parseMarkdownScene(src);
    assert.equal(parsed.title, 'Why BEAM?');
    assert.equal(parsed.type, 'content');
    assert.equal(parsed.slides.length, 2);
    assert.equal(parsed.slides[0][0][0].type, 'heading');
    assert.equal(parsed.slides[0][0][1].items.length, 2);
    assert.equal(parsed.slides[1][0][0].type, 'quote');
    assert.equal(parsed.slides[1][0][0].attribution, 'Joe');
  });

  it('defaults type to content', () => {
    const src = `---
title: X
---

# h`;
    const parsed = parseMarkdownScene(src);
    assert.equal(parsed.type, 'content');
  });

  it('routes type: section and exposes options', () => {
    const src = `---
title: Hot Takes
type: section
subtitle: Unpopular opinions
accent: "#ff6b35"
fontSize: "5rem"
---`;
    const parsed = parseMarkdownScene(src);
    assert.equal(parsed.type, 'section');
    assert.equal(parsed.title, 'Hot Takes');
    assert.equal(parsed.options.subtitle, 'Unpopular opinions');
    assert.equal(parsed.options.accent, '#ff6b35');
    assert.equal(parsed.options.fontSize, '5rem');
  });

  it('interpolates {{color}} tokens from a colors map', () => {
    const src = `---
title: X
---

- Designed for <strong style="color:{{beam}}">telecom</strong>`;
    const parsed = parseMarkdownScene(src, { beam: '#FF9500' });
    assert.equal(parsed.slides[0][0][0].items[0].text,
      'Designed for <strong style="color:#FF9500">telecom</strong>');
  });

  it('throws if title is missing', () => {
    const src = `---
type: content
---

# body`;
    assert.throws(() => parseMarkdownScene(src), /title/i);
  });

  it('leaves options free of title/type internal keys', () => {
    const src = `---
title: X
type: content
accent: "#abc"
---`;
    const parsed = parseMarkdownScene(src);
    assert.equal(parsed.options.title, undefined);
    assert.equal(parsed.options.type, undefined);
    assert.equal(parsed.options.accent, '#abc');
  });
});

describe('resolveSceneOptions (palette merge)', () => {
  it('content: palette supplies colors.* base, frontmatter colors win', () => {
    const parsed = parseMarkdownScene(`---\ntitle: X\ncolors:\n  accent: "#frontm"\n---\n`);
    const out = resolveSceneOptions(parsed, { accent: '#pal', bg: '#palbg' });
    assert.equal(out.kind, 'content');
    assert.equal(out.factoryArgs.colors.accent, '#frontm'); // frontmatter wins
    assert.equal(out.factoryArgs.colors.bg, '#palbg');      // palette fills the gap
  });

  it('content: empty palette yields frontmatter-only colors', () => {
    const parsed = parseMarkdownScene(`---\ntitle: X\ncolors:\n  accent: "#f"\n---\n`);
    const out = resolveSceneOptions(parsed);
    assert.deepEqual(out.factoryArgs.colors, { accent: '#f' });
  });

  it('content: no frontmatter colors, palette only', () => {
    const parsed = parseMarkdownScene(`---\ntitle: X\n---\n`);
    const out = resolveSceneOptions(parsed, { accent: '#p' });
    assert.deepEqual(out.factoryArgs.colors, { accent: '#p' });
  });

  it('section: palette supplies accent/bg/bgDark/text defaults; frontmatter wins', () => {
    const parsed = parseMarkdownScene(`---\ntitle: X\ntype: section\naccent: "#fm"\n---\n`);
    const out = resolveSceneOptions(parsed, { accent: '#pal', bg: '#palbg', text: '#paltxt' });
    assert.equal(out.kind, 'section');
    assert.equal(out.factoryArgs.accent, '#fm');     // frontmatter wins
    assert.equal(out.factoryArgs.bg, '#palbg');      // palette default
    assert.equal(out.factoryArgs.text, '#paltxt');   // palette default
  });

  it('section: palette keys absent stay undefined (factory default kicks in)', () => {
    const parsed = parseMarkdownScene(`---\ntitle: X\ntype: section\n---\n`);
    const out = resolveSceneOptions(parsed);
    assert.equal(out.factoryArgs.accent, undefined);
    assert.equal(out.factoryArgs.bg, undefined);
  });

  it('throws on unknown type', () => {
    const parsed = { type: 'bogus', title: 'T', options: {}, slides: [] };
    assert.throws(() => resolveSceneOptions(parsed), /unknown type/);
  });
});

describe('image-row blocks', () => {
  it('emits image-row for a single image-only paragraph', () => {
    const { slides } = parseMarkdownScene(`---\ntitle: T\n---\n\n![alt](cat.png)\n`);
    assert.equal(slides.length, 1);
    assert.equal(slides[0].length, 1);
    assert.equal(slides[0][0].length, 1);
    const block = slides[0][0][0];
    assert.equal(block.type, 'image-row');
    assert.deepEqual(block.images, [{ alt: 'alt', src: 'cat.png' }]);
    assert.equal(block.continuation, undefined);
  });

  it('emits a single image-row for a multi-image paragraph (auto-row)', () => {
    const { slides } = parseMarkdownScene(
      `---\ntitle: T\n---\n\n![](a.png)\n![](b.png)\n![](c.png)\n`,
    );
    const block = slides[0][0][0];
    assert.equal(block.type, 'image-row');
    assert.equal(block.images.length, 3);
    assert.equal(block.images[2].src, 'c.png');
  });

  it('flags continuation across `+++ ` step boundaries between image-only paragraphs', () => {
    const { slides } = parseMarkdownScene(
      `---\ntitle: T\n---\n\n![](a.png)\n+++ ![](b.png)\n+++ ![](c.png)\n`,
    );
    const steps = slides[0];
    assert.equal(steps.length, 3);
    assert.equal(steps[0][0].type, 'image-row');
    assert.equal(steps[0][0].continuation, undefined);
    assert.equal(steps[1][0].type, 'image-row');
    assert.equal(steps[1][0].continuation, true);
    assert.equal(steps[2][0].type, 'image-row');
    assert.equal(steps[2][0].continuation, true);
  });

  it('flags continuation when previous step ENDS in image-row, even with leading blocks', () => {
    const { slides } = parseMarkdownScene(
      `---\ntitle: T\n---\n\n# heading\n\n![](a.png)\n+++ ![](b.png)\n+++ ![](c.png)\n`,
    );
    const steps = slides[0];
    // Step 0: heading + image-row. Step 1: image-row(continuation). Step 2: image-row(continuation).
    assert.equal(steps[0].length, 2);
    assert.equal(steps[0][1].type, 'image-row');
    assert.equal(steps[1][0].type, 'image-row');
    assert.equal(steps[1][0].continuation, true);
    assert.equal(steps[2][0].type, 'image-row');
    assert.equal(steps[2][0].continuation, true);
  });

  it('does not flag continuation when previous step ends in a non-image block', () => {
    const { slides } = parseMarkdownScene(
      `---\ntitle: T\n---\n\nA paragraph.\n+++ ![](b.png)\n`,
    );
    const steps = slides[0];
    assert.equal(steps[1][0].type, 'image-row');
    assert.equal(steps[1][0].continuation, undefined);
  });

  it('keeps mixed prose+image as a regular text block', () => {
    const { slides } = parseMarkdownScene(
      `---\ntitle: T\n---\n\nLook at this ![](a.png) right here.\n`,
    );
    const block = slides[0][0][0];
    assert.equal(block.type, 'text');
  });
});

describe('parseSlideBlocks line numbers', () => {
  it('attaches line numbers to each block', () => {
    const src = `---
title: T
---

# Heading

- a
- b

\`\`\`js
code
\`\`\`
`;
    const { slides } = parseMarkdownScene(src, {});
    for (const slide of slides) {
      for (const step of slide) {
        for (const block of step) {
          assert.ok(typeof block.line === 'number' && block.line >= 1, `expected block.line on ${block.type}`);
        }
      }
    }
  });
});
