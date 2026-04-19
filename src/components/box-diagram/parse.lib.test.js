// src/components/box-diagram/parse.lib.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBoxDiagram } from './parse.lib.js';

function ctx() { return { file: 's.md', blockStartLine: 1 }; }

test('parses a single box with bare id', () => {
  const r = parseBoxDiagram('box client', ctx());
  assert.deepEqual(r.nodes, [{ id: 'client', label: 'client', role: 'external', subtitle: null, line: 1 }]);
  assert.deepEqual(r.arrows, []);
  assert.equal(r.section, null);
  assert.deepEqual(r.errors, []);
});

test('parses bareword + quoted display label override', () => {
  const r = parseBoxDiagram('box api "My Blah API"', ctx());
  assert.equal(r.nodes[0].id, 'api');
  assert.equal(r.nodes[0].label, 'My Blah API');
});

test('parses role attribute', () => {
  const r = parseBoxDiagram('box api role=accent', ctx());
  assert.equal(r.nodes[0].role, 'accent');
});

test('parses subtitle attribute', () => {
  const r = parseBoxDiagram('box client subtitle="browser / app"', ctx());
  assert.equal(r.nodes[0].subtitle, 'browser / app');
});

test('parses label + role + subtitle in one declaration', () => {
  const r = parseBoxDiagram('box api "My Blah API" role=accent subtitle="rest"', ctx());
  assert.equal(r.nodes[0].id, 'api');
  assert.equal(r.nodes[0].label, 'My Blah API');
  assert.equal(r.nodes[0].role, 'accent');
  assert.equal(r.nodes[0].subtitle, 'rest');
});

test('rejects unknown role value', () => {
  const r = parseBoxDiagram('box api role=bogus', ctx());
  assert.ok(r.errors.some(e => /role/.test(e.message)));
});

test('records correct line numbers for nodes', () => {
  const src = 'box a\nbox b\nbox c';
  const r = parseBoxDiagram(src, ctx());
  assert.deepEqual(r.nodes.map(n => n.line), [1, 2, 3]);
});

test('blank lines and indentation are tolerated', () => {
  const r = parseBoxDiagram('\n\nbox   a\n\n   box b  \n', ctx());
  assert.equal(r.nodes.length, 2);
});
