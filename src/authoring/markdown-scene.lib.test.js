import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFrontmatter,
  parseSlideBody,
  parseMarkdownScene,
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
    assert.deepEqual(slides[0][0], { type: 'heading', text: 'Big Title', level: 1, line: 1 });
  });

  it('parses h2 and h3 with correct levels', () => {
    const slides = parseSlideBody('## Sub\n\n### Label');
    assert.equal(slides[0][0].level, 2);
    assert.equal(slides[0][1].level, 3);
  });

  it('collects consecutive bullets into one bullets block', () => {
    const slides = parseSlideBody('- alpha\n- beta\n- gamma');
    assert.equal(slides[0].length, 1);
    assert.deepEqual(slides[0][0], {
      type: 'bullets',
      items: ['alpha', 'beta', 'gamma'],
      line: 1,
    });
  });

  it('supports * as bullet marker', () => {
    const slides = parseSlideBody('* one\n* two');
    assert.deepEqual(slides[0][0], { type: 'bullets', items: ['one', 'two'], line: 1 });
  });

  it('parses a blockquote', () => {
    const slides = parseSlideBody('> Make it work.');
    assert.deepEqual(slides[0][0], { type: 'quote', text: 'Make it work.', line: 1 });
  });

  it('attaches attribution from trailing — line inside quote', () => {
    const slides = parseSlideBody('> A wise quote.\n> — Someone Famous');
    assert.deepEqual(slides[0][0], {
      type: 'quote',
      text: 'A wise quote.',
      line: 1,
      attribution: 'Someone Famous',
    });
  });

  it('parses a fenced code block', () => {
    const slides = parseSlideBody('```js\nconst x = 1;\n```');
    assert.deepEqual(slides[0][0], {
      type: 'code',
      code: 'const x = 1;',
      language: 'js',
      line: 2,
    });
  });

  it('parses text paragraph', () => {
    const slides = parseSlideBody('Some prose.\nWith two lines.');
    assert.deepEqual(slides[0][0], {
      type: 'text',
      text: 'Some prose. With two lines.',
      line: 1,
    });
  });

  it('marks a paragraph as muted when prefixed with !muted', () => {
    const slides = parseSlideBody('!muted Quiet voice.');
    assert.deepEqual(slides[0][0], {
      type: 'text',
      text: 'Quiet voice.',
      line: 1,
      muted: true,
    });
  });

  it('recognises :spacer: as a spacer block', () => {
    const slides = parseSlideBody(':spacer:');
    assert.deepEqual(slides[0][0], { type: 'spacer', line: 1 });
  });

  it('recognises :spacer lg: as a large spacer', () => {
    const slides = parseSlideBody(':spacer lg:');
    assert.deepEqual(slides[0][0], { type: 'spacer', size: 'lg', line: 1 });
  });

  it('separates blocks across blank lines', () => {
    const slides = parseSlideBody('# Heading\n\n- bullet one\n- bullet two\n\nparagraph');
    assert.equal(slides[0].length, 3);
    assert.equal(slides[0][0].type, 'heading');
    assert.equal(slides[0][1].type, 'bullets');
    assert.equal(slides[0][2].type, 'text');
  });

  it('handles an empty slide as empty block array', () => {
    const slides = parseSlideBody('# First\n\n---\n\n---\n\n# Last');
    assert.equal(slides.length, 3);
    assert.equal(slides[1].length, 0);
    assert.equal(slides[2][0].text, 'Last');
  });

  it('ignores leading/trailing whitespace in body', () => {
    const slides = parseSlideBody('\n\n# Heading\n\n');
    assert.equal(slides.length, 1);
    assert.equal(slides[0][0].type, 'heading');
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
    assert.equal(parsed.slides[0][0].type, 'heading');
    assert.equal(parsed.slides[0][1].items.length, 2);
    assert.equal(parsed.slides[1][0].type, 'quote');
    assert.equal(parsed.slides[1][0].attribution, 'Joe');
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
    assert.equal(parsed.slides[0][0].items[0],
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
      for (const block of slide) {
        assert.ok(typeof block.line === 'number' && block.line >= 1, `expected block.line on ${block.type}`);
      }
    }
  });
});
