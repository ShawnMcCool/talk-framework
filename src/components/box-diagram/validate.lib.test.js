// src/components/box-diagram/validate.lib.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBoxDiagram } from './validate.lib.js';

function ctx() { return { file: '05-sketch/scene.md', blockStartLine: 10 }; }

test('reports no diagnostics for a valid diagram', () => {
  const data = {
    section: null,
    nodes: [{ id: 'a', line: 1 }, { id: 'b', line: 2 }],
    arrows: [{ from: 'a', to: 'b', label: 'x', line: 3 }],
    errors: [],
  };
  assert.deepEqual(validateBoxDiagram(data, ctx()), []);
});

test('flags arrow with undeclared source', () => {
  const data = {
    section: null,
    nodes: [{ id: 'b', line: 1 }],
    arrows: [{ from: 'a', to: 'b', label: 'x', line: 2 }],
    errors: [],
  };
  const diags = validateBoxDiagram(data, ctx());
  assert.equal(diags.length, 1);
  assert.equal(diags[0].severity, 'error');
  assert.equal(diags[0].component, 'box-diagram');
  assert.match(diags[0].message, /undeclared node 'a'/);
  assert.equal(diags[0].line, 11); // blockStartLine (10) + arrow.line (2) - 1
});

test('suggests "did you mean" when undeclared id is close to a declared one', () => {
  const data = {
    section: null,
    nodes: [{ id: 'api', line: 1 }],
    arrows: [{ from: 'apii', to: 'api', label: 'x', line: 2 }],
    errors: [],
  };
  const diags = validateBoxDiagram(data, ctx());
  assert.ok(diags[0].hint);
  assert.match(diags[0].hint, /did you mean 'api'/);
});

test('flags duplicate node declarations', () => {
  const data = {
    section: null,
    nodes: [{ id: 'a', line: 1 }, { id: 'a', line: 2 }],
    arrows: [],
    errors: [],
  };
  const diags = validateBoxDiagram(data, ctx());
  assert.ok(diags.some(d => /duplicate node 'a'/.test(d.message)));
});

test('surfaces parser errors as diagnostics', () => {
  const data = {
    section: null,
    nodes: [],
    arrows: [],
    errors: [{ line: 1, column: 1, message: 'arrow syntax: ...' }],
  };
  const diags = validateBoxDiagram(data, ctx());
  assert.equal(diags.length, 1);
  assert.equal(diags[0].severity, 'error');
  assert.equal(diags[0].line, 10); // blockStartLine (10) + 1 - 1 = 10
});

test('flags empty diagram as warning', () => {
  const data = { section: null, nodes: [], arrows: [], errors: [] };
  const diags = validateBoxDiagram(data, ctx());
  assert.ok(diags.some(d => d.severity === 'warn' && /empty/.test(d.message)));
});
