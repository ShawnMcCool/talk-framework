import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { walkSceneDiagnostics } from './scene-diagnostics.lib.js';

function fakeRegistry({ infoString = null, blockType = null } = {}) {
  return {
    getByInfoString(lang) { return infoString && infoString.lang === lang ? infoString.component : null; },
    getByBlockType(type) { return blockType && blockType.type === type ? blockType.component : null; },
  };
}

describe('walkSceneDiagnostics', () => {
  it('returns [] for a scene with no registered validators', () => {
    const parsed = {
      slides: [[[{ type: 'heading', text: 'X', line: 1 }]]],
    };
    const diags = walkSceneDiagnostics(parsed, { file: 's.md', registry: fakeRegistry() });
    assert.deepEqual(diags, []);
  });

  it('dispatches fenced-code blocks via getByInfoString with parse+validate', () => {
    const parsed = {
      slides: [[[{ type: 'code', language: 'box-diagram', code: 'box a', line: 7 }]]],
    };
    const custom = {
      parse(src, ctx) { return { source: src, blockStartLine: ctx.blockStartLine }; },
      validate(data, ctx) {
        return [{
          severity: 'error', component: 'box-diagram', file: ctx.file,
          line: data.blockStartLine, column: 1, message: `parsed: ${data.source}`,
        }];
      },
    };
    const diags = walkSceneDiagnostics(parsed, {
      file: 's.md',
      registry: fakeRegistry({ infoString: { lang: 'box-diagram', component: custom } }),
    });
    assert.equal(diags.length, 1);
    assert.equal(diags[0].line, 7);
    assert.equal(diags[0].message, 'parsed: box a');
  });

  it('dispatches built-in blocks via getByBlockType when validate is present', () => {
    const parsed = {
      slides: [[[{ type: 'heading', text: 'H', line: 3 }]]],
    };
    const builtin = {
      validate(block, ctx) {
        return [{
          severity: 'warn', component: 'heading', file: ctx.file,
          line: ctx.blockStartLine, column: 1, message: `hd:${block.text}`,
        }];
      },
    };
    const diags = walkSceneDiagnostics(parsed, {
      file: 's.md',
      registry: fakeRegistry({ blockType: { type: 'heading', component: builtin } }),
    });
    assert.equal(diags.length, 1);
    assert.equal(diags[0].line, 3);
    assert.equal(diags[0].message, 'hd:H');
  });

  it('uses blockStartLine of 1 when block.line is missing', () => {
    const parsed = {
      slides: [[[{ type: 'heading', text: 'H' }]]],
    };
    const builtin = {
      validate(_block, ctx) {
        return [{ severity: 'warn', component: 'heading', file: ctx.file, line: ctx.blockStartLine, column: 1, message: '' }];
      },
    };
    const diags = walkSceneDiagnostics(parsed, {
      file: 's.md',
      registry: fakeRegistry({ blockType: { type: 'heading', component: builtin } }),
    });
    assert.equal(diags[0].line, 1);
  });

  it('walks every slide, step, and block', () => {
    const builtin = {
      validate(block, ctx) {
        return [{ severity: 'warn', component: 'p', file: ctx.file, line: block.line || 0, column: 1, message: block.text }];
      },
    };
    const parsed = {
      slides: [
        [
          [{ type: 'p', text: 'a', line: 1 }],
          [{ type: 'p', text: 'b', line: 2 }],
        ],
        [[{ type: 'p', text: 'c', line: 3 }]],
      ],
    };
    const diags = walkSceneDiagnostics(parsed, {
      file: 's.md',
      registry: fakeRegistry({ blockType: { type: 'p', component: builtin } }),
    });
    assert.deepEqual(diags.map(d => d.message), ['a', 'b', 'c']);
  });
});
