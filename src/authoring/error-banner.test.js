// src/authoring/error-banner.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountErrorBanner } from './error-banner.js';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  return dom;
}

test('banner mounts hidden with no diagnostics', () => {
  setupDom();
  const banner = mountErrorBanner(document.body);
  banner.update([]);
  const el = document.querySelector('.talk-error-banner');
  assert.ok(el);
  assert.equal(el.dataset.state, 'hidden');
});

test('banner becomes visible with diagnostics', () => {
  setupDom();
  const banner = mountErrorBanner(document.body);
  banner.update([{ severity: 'error', component: 'x', file: 'a.md', line: 1, column: 1, message: 'm' }]);
  const el = document.querySelector('.talk-error-banner');
  assert.equal(el.dataset.state, 'collapsed');
  assert.match(el.textContent, /1 error/);
});

test('clicking banner expands it and preserves state across updates', () => {
  setupDom();
  const banner = mountErrorBanner(document.body);
  banner.update([{ severity: 'error', component: 'x', file: 'a.md', line: 1, column: 1, message: 'first' }]);
  const el = document.querySelector('.talk-error-banner');
  el.click();
  assert.equal(el.dataset.state, 'expanded');

  banner.update([{ severity: 'error', component: 'x', file: 'a.md', line: 2, column: 1, message: 'second' }]);
  assert.equal(el.dataset.state, 'expanded', 'expand state should persist through updates');
  assert.match(el.textContent, /second/);
});

test('banner dismisses when diagnostics clear', async () => {
  setupDom();
  const banner = mountErrorBanner(document.body);
  banner.update([{ severity: 'error', component: 'x', file: 'a.md', line: 1, column: 1, message: 'm' }]);
  banner.update([]);
  const el = document.querySelector('.talk-error-banner');
  // After clear, banner is in 'clearing' state briefly, then 'hidden'.
  assert.ok(['clearing', 'hidden'].includes(el.dataset.state));
});
