import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkVersionDrift } from './version-drift.lib.js';

test('exact match returns ok', () => {
  const r = checkVersionDrift({ declaredVersion: '0.4.0', installedVersion: '0.4.0' });
  assert.equal(r.ok, true);
  assert.equal(r.message, null);
});

test('major.minor match with declared patch omitted', () => {
  const r = checkVersionDrift({ declaredVersion: '0.4', installedVersion: '0.4.0' });
  assert.equal(r.ok, true);
  assert.equal(r.message, null);
});

test('major.minor match with different patch', () => {
  const r = checkVersionDrift({ declaredVersion: '0.4.0', installedVersion: '0.4.1' });
  assert.equal(r.ok, true);
});

test('minor mismatch warns', () => {
  const r = checkVersionDrift({ declaredVersion: '0.1', installedVersion: '0.4.0' });
  assert.equal(r.ok, false);
  assert.match(r.message, /0\.1/);
  assert.match(r.message, /0\.4\.0/);
});

test('major mismatch warns', () => {
  const r = checkVersionDrift({ declaredVersion: '1.0.0', installedVersion: '0.4.0' });
  assert.equal(r.ok, false);
});

test('missing declared version is a no-op', () => {
  const r = checkVersionDrift({ declaredVersion: null, installedVersion: '0.4.0' });
  assert.equal(r.ok, true);
});

test('missing installed version is a no-op', () => {
  const r = checkVersionDrift({ declaredVersion: '0.4.0', installedVersion: null });
  assert.equal(r.ok, true);
});

test('empty-string declared version is a no-op', () => {
  const r = checkVersionDrift({ declaredVersion: '', installedVersion: '0.4.0' });
  assert.equal(r.ok, true);
});
