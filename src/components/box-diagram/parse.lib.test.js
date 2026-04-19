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

test('parses a simple flow line', () => {
  const r = parseBoxDiagram('box client\nbox api\nclient -- POST --> api', ctx());
  assert.deepEqual(r.arrows, [{ from: 'client', to: 'api', label: 'POST', line: 3 }]);
});

test('arrow label preserves spaces and slashes', () => {
  const r = parseBoxDiagram('box a\nbox b\na -- POST /purchase --> b', ctx());
  assert.equal(r.arrows[0].label, 'POST /purchase');
});

test('rejects arrow without terminator', () => {
  const r = parseBoxDiagram('box a\nbox b\na -- bad -> b', ctx());
  assert.ok(r.errors.length > 0);
});

test('parses section header', () => {
  const r = parseBoxDiagram('section: THE SYSTEM\nbox a', ctx());
  assert.equal(r.section, 'THE SYSTEM');
});

test('parses quoted section header', () => {
  const r = parseBoxDiagram('section: "THE SYSTEM"\nbox a', ctx());
  assert.equal(r.section, 'THE SYSTEM');
});

test('parses a full spec example', () => {
  const src = [
    'section: THE SYSTEM',
    'box client                              subtitle="browser / app"',
    'box api         "My Blah API"           role=accent',
    'box database                            role=warm',
    '',
    'client -- POST /purchase --> api',
    'api    -- SQL             --> database',
  ].join('\n');
  const r = parseBoxDiagram(src, ctx());
  assert.equal(r.section, 'THE SYSTEM');
  assert.equal(r.nodes.length, 3);
  assert.equal(r.nodes[0].subtitle, 'browser / app');
  assert.equal(r.nodes[1].label, 'My Blah API');
  assert.equal(r.nodes[1].role, 'accent');
  assert.equal(r.nodes[2].role, 'warm');
  assert.equal(r.arrows.length, 2);
  assert.equal(r.arrows[0].label, 'POST /purchase');
  assert.deepEqual(r.errors, []);
});

test('reports an error for gibberish lines', () => {
  const r = parseBoxDiagram('this is not valid', ctx());
  assert.ok(r.errors.length > 0);
});

test('fan-out: multiple arrows from same source', () => {
  const src = [
    'box a',
    'box b',
    'box c',
    'a -- x --> b',
    'a -- y --> c',
  ].join('\n');
  const r = parseBoxDiagram(src, ctx());
  assert.equal(r.arrows.length, 2);
});
