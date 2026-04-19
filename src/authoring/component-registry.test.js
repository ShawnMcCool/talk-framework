import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry, validateDescriptor } from './component-registry.js';

test('registry stores and retrieves by name', () => {
  const desc = { name: 'heading', kind: 'markdown-block', matcher: { blockType: 'heading' } };
  const reg = createRegistry();
  reg.register(desc);
  assert.equal(reg.getByName('heading'), desc);
});

test('registry looks up markdown-block by infoString', () => {
  const desc = { name: 'box-diagram', kind: 'markdown-block', matcher: { infoString: 'box-diagram' } };
  const reg = createRegistry();
  reg.register(desc);
  assert.equal(reg.getByInfoString('box-diagram'), desc);
});

test('registry looks up markdown-block by blockType', () => {
  const desc = { name: 'heading', kind: 'markdown-block', matcher: { blockType: 'heading' } };
  const reg = createRegistry();
  reg.register(desc);
  assert.equal(reg.getByBlockType('heading'), desc);
});

test('registry looks up scene-type by frontmatterType', () => {
  const desc = { name: 'content-slide', kind: 'scene-type', matcher: { frontmatterType: 'content' } };
  const reg = createRegistry();
  reg.register(desc);
  assert.equal(reg.getByFrontmatterType('content'), desc);
});

test('registry rejects duplicate registration by name', () => {
  const desc = { name: 'x', kind: 'markdown-block', matcher: { blockType: 'x' } };
  const reg = createRegistry();
  reg.register(desc);
  assert.throws(() => reg.register(desc), /already registered/);
});

test('validateDescriptor rejects missing name', () => {
  const errs = validateDescriptor({ kind: 'markdown-block', matcher: { blockType: 'x' } });
  assert.ok(errs.some(e => /name/.test(e)));
});

test('validateDescriptor rejects unknown kind', () => {
  const errs = validateDescriptor({ name: 'x', kind: 'bogus', matcher: {} });
  assert.ok(errs.some(e => /kind/.test(e)));
});

test('validateDescriptor accepts a valid descriptor', () => {
  const errs = validateDescriptor({ name: 'x', kind: 'markdown-block', matcher: { blockType: 'x' } });
  assert.deepEqual(errs, []);
});
