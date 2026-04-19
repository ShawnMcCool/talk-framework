import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planRename } from './rename-planner.lib.js';

// Helper: build a scene list from a compact spec
function scenes(...pairs) {
  return pairs.map(([index, slug]) => ({ index, slug, folder: `${String(index).padStart(2, '0')}-${slug}` }));
}

test('move: 3 after 6 shifts intermediate scenes down', () => {
  const current = scenes([1,'welcome'], [2,'intro'], [3,'arch'], [4,'demo'], [5,'tradeoffs'], [6,'outro']);
  const plan = planRename(current, { op: 'move', id: 3, position: 'after', target: 6 });
  assert.deepEqual(plan.renames, [
    { from: '03-arch',      to: '06-arch' },
    { from: '04-demo',      to: '03-demo' },
    { from: '05-tradeoffs', to: '04-tradeoffs' },
    { from: '06-outro',     to: '05-outro' },
  ]);
});

test('move: 1 before 4 keeps others shifted up', () => {
  const current = scenes([1,'welcome'], [2,'intro'], [3,'arch'], [4,'demo']);
  const plan = planRename(current, { op: 'move', id: 1, position: 'before', target: 4 });
  // new order: intro, arch, welcome, demo
  assert.deepEqual(plan.renames, [
    { from: '01-welcome', to: '03-welcome' },
    { from: '02-intro',   to: '01-intro' },
    { from: '03-arch',    to: '02-arch' },
  ]);
});

test('move: N first and N last', () => {
  const current = scenes([1,'a'], [2,'b'], [3,'c']);
  const planFirst = planRename(current, { op: 'move', id: 3, position: 'first' });
  assert.deepEqual(planFirst.renames, [
    { from: '01-a', to: '02-a' },
    { from: '02-b', to: '03-b' },
    { from: '03-c', to: '01-c' },
  ]);
  const planLast = planRename(current, { op: 'move', id: 1, position: 'last' });
  assert.deepEqual(planLast.renames, [
    { from: '01-a', to: '03-a' },
    { from: '02-b', to: '01-b' },
    { from: '03-c', to: '02-c' },
  ]);
});

test('move: no-op when target position equals current position', () => {
  const current = scenes([1,'a'], [2,'b'], [3,'c']);
  const plan = planRename(current, { op: 'move', id: 2, position: 'after', target: 1 });
  assert.deepEqual(plan.renames, []);
});

test('remove: deletes the folder and renumbers successors', () => {
  const current = scenes([1,'a'], [2,'b'], [3,'c'], [4,'d']);
  const plan = planRename(current, { op: 'remove', id: 2 });
  assert.deepEqual(plan.removes, ['02-b']);
  assert.deepEqual(plan.renames, [
    { from: '03-c', to: '02-c' },
    { from: '04-d', to: '03-d' },
  ]);
});

test('add: --first inserts at 01 and shifts everything up', () => {
  const current = scenes([1,'a'], [2,'b']);
  const plan = planRename(current, { op: 'add', slug: 'new', position: 'first' });
  assert.deepEqual(plan.renames, [
    { from: '01-a', to: '02-a' },
    { from: '02-b', to: '03-b' },
  ]);
  assert.deepEqual(plan.creates, ['01-new']);
});

test('add: --after 2 inserts at 03 and shifts later scenes up', () => {
  const current = scenes([1,'a'], [2,'b'], [3,'c']);
  const plan = planRename(current, { op: 'add', slug: 'new', position: 'after', target: 2 });
  assert.deepEqual(plan.renames, [
    { from: '03-c', to: '04-c' },
  ]);
  assert.deepEqual(plan.creates, ['03-new']);
});

test('add: default appends at the end', () => {
  const current = scenes([1,'a'], [2,'b']);
  const plan = planRename(current, { op: 'add', slug: 'new' });
  assert.deepEqual(plan.renames, []);
  assert.deepEqual(plan.creates, ['03-new']);
});

test('add: into an empty talk creates 01-slug', () => {
  const plan = planRename([], { op: 'add', slug: 'welcome' });
  assert.deepEqual(plan.creates, ['01-welcome']);
});

test('rename: changes slug only, number preserved', () => {
  const current = scenes([1,'a'], [2,'b']);
  const plan = planRename(current, { op: 'rename', id: 2, slug: 'beta' });
  assert.deepEqual(plan.renames, [
    { from: '02-b', to: '02-beta' },
  ]);
});

test('throws on unknown scene id', () => {
  const current = scenes([1,'a'], [2,'b']);
  assert.throws(
    () => planRename(current, { op: 'move', id: 9, position: 'first' }),
    /scene 9/i,
  );
});

test('throws on duplicate slug', () => {
  const current = scenes([1,'a'], [2,'b']);
  assert.throws(
    () => planRename(current, { op: 'add', slug: 'a' }),
    /slug "a"/i,
  );
});
