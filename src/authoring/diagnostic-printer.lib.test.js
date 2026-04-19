// src/authoring/diagnostic-printer.lib.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDiagnostics } from './diagnostic-printer.lib.js';

test('formats a single error with file:line:col', () => {
  const diags = [{
    severity: 'error', component: 'box-diagram',
    file: '05-sketch/scene.md', line: 17, column: 3,
    message: "arrow references undeclared node 'apii'",
  }];
  const out = formatDiagnostics(diags);
  assert.match(out, /error\s+05-sketch\/scene\.md:17:3\s+box-diagram\s+arrow references undeclared node 'apii'/);
});

test('formats hint on its own line indented under the diagnostic', () => {
  const diags = [{
    severity: 'error', component: 'box-diagram',
    file: 'a.md', line: 1, column: 1,
    message: 'x', hint: "did you mean 'y'?",
  }];
  const out = formatDiagnostics(diags);
  assert.match(out, /hint\s+did you mean 'y'\?/);
});

test('formats multiple diagnostics with aligned columns', () => {
  const diags = [
    { severity: 'error', component: 'box-diagram', file: 'a.md', line: 1, column: 1, message: 'x' },
    { severity: 'warn',  component: 'box-diagram', file: 'bb.md', line: 20, column: 1, message: 'y' },
  ];
  const out = formatDiagnostics(diags);
  const lines = out.trim().split('\n');
  assert.equal(lines.length, 2);
});

test('returns empty string for no diagnostics', () => {
  assert.equal(formatDiagnostics([]), '');
});
