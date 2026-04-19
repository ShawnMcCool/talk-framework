import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry, validateDescriptor, registry } from './component-registry.js';

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

test('bootstrap: content-slide is registered', () => {
  const c = registry.getByName('content-slide');
  assert.ok(c);
  assert.equal(c.kind, 'scene-type');
  assert.equal(registry.getByFrontmatterType('content'), c);
});

test('bootstrap: section-slide is registered', () => {
  const c = registry.getByName('section-slide');
  assert.ok(c);
  assert.equal(c.kind, 'scene-type');
  assert.equal(registry.getByFrontmatterType('section'), c);
});

test('bootstrap: three-scene is registered', () => {
  const c = registry.getByName('three-scene');
  assert.ok(c);
  assert.equal(c.kind, 'js-factory');
});

test('three-scene validator flags missing exports', () => {
  const c = registry.getByName('three-scene');
  const diags = c.validate({}, { file: 'x.js' });
  assert.ok(diags.length >= 6);
  assert.ok(diags.every(d => d.severity === 'error'));
});

test('three-scene validator accepts a complete module', () => {
  const c = registry.getByName('three-scene');
  const diags = c.validate({
    title: 't', slides: [], init() {}, destroy() {}, resolveToSlide() {}, animateToSlide() {},
  }, { file: 'x.js' });
  assert.deepEqual(diags, []);
});

test('bootstrap: svg-scene is registered', () => {
  const c = registry.getByName('svg-scene');
  assert.ok(c);
  assert.equal(c.kind, 'js-factory');
});

test('bootstrap: title-animation is registered', () => {
  const c = registry.getByName('title-animation');
  assert.ok(c);
  assert.equal(c.kind, 'js-factory');
});

test('bootstrap: heading is registered', () => {
  const c = registry.getByName('heading');
  assert.ok(c);
  assert.equal(c.kind, 'markdown-block');
  assert.equal(registry.getByBlockType('heading'), c);
});

test('bootstrap: paragraph is registered', () => {
  const c = registry.getByName('paragraph');
  assert.ok(c);
  assert.equal(registry.getByBlockType('text'), c);
});
