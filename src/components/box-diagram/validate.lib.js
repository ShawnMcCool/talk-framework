// src/components/box-diagram/validate.lib.js

/**
 * Validate parsed box-diagram data. Returns an array of diagnostic records.
 *
 * @param {{ section: string|null, nodes: Array, arrows: Array, errors: Array }} data
 * @param {{ file: string, blockStartLine: number }} context
 */
export function validateBoxDiagram(data, context) {
  const diags = [];
  const absLine = (rel) => context.blockStartLine + rel - 1;

  // 1. Surface parser errors as diagnostics.
  for (const err of data.errors) {
    diags.push({
      severity: 'error',
      component: 'box-diagram',
      file: context.file,
      line: absLine(err.line),
      column: err.column || 1,
      message: err.message,
    });
  }

  // 2. Empty diagram.
  if (data.nodes.length === 0 && data.arrows.length === 0 && data.errors.length === 0) {
    diags.push({
      severity: 'warn',
      component: 'box-diagram',
      file: context.file,
      line: context.blockStartLine,
      column: 1,
      message: 'empty box-diagram block',
    });
  }

  // 3. Duplicate node ids.
  const seen = new Map();
  for (const node of data.nodes) {
    if (seen.has(node.id)) {
      diags.push({
        severity: 'error',
        component: 'box-diagram',
        file: context.file,
        line: absLine(node.line),
        column: 1,
        message: `duplicate node '${node.id}' (first declared at line ${absLine(seen.get(node.id))})`,
      });
    } else {
      seen.set(node.id, node.line);
    }
  }

  // 4. Undeclared references in arrows.
  const declaredIds = new Set(data.nodes.map(n => n.id));
  for (const arrow of data.arrows) {
    for (const endpoint of ['from', 'to']) {
      const id = arrow[endpoint];
      if (!declaredIds.has(id)) {
        const diag = {
          severity: 'error',
          component: 'box-diagram',
          file: context.file,
          line: absLine(arrow.line),
          column: 1,
          message: `arrow references undeclared node '${id}'`,
        };
        const suggestion = suggest(id, declaredIds);
        if (suggestion) diag.hint = `did you mean '${suggestion}'?`;
        diags.push(diag);
      }
    }
  }

  return diags;
}

/**
 * Suggest the closest declared id by Levenshtein distance. Only returns a
 * suggestion when distance is 1 or 2 and at least half the length of the
 * input (avoids misleading hints on short typos).
 */
function suggest(input, candidates) {
  let best = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = levenshtein(input, c);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (bestD <= 2 && bestD <= Math.max(1, Math.floor(input.length / 2))) return best;
  return null;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}
