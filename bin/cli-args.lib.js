// Shared helpers for the talk Node subcommands.

export function parseFlags(argv) {
  const positional = [];
  let dryRun = false;
  let first = false;
  let after = null;
  let before = null;
  let force = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--dry-run': dryRun = true; break;
      case '--first': first = true; break;
      case '--force': force = true; break;
      case '--after':
      case '--before': {
        const v = argv[++i];
        if (v === undefined) throw new Error(`${a} requires a scene number`);
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1) throw new Error(`${a} needs a positive integer, got "${v}"`);
        if (a === '--after') after = n; else before = n;
        break;
      }
      default:
        if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`);
        positional.push(a);
    }
  }

  return { positional, dryRun, first, after, before, force };
}

export function printPlan(plan, out = console.log) {
  const { renames = [], creates = [], removes = [] } = plan;
  if (renames.length === 0 && creates.length === 0 && removes.length === 0) {
    out('  (no changes)');
    return;
  }
  for (const r of renames) out(`  ${r.from} → ${r.to}`);
  for (const c of creates) out(`  + ${c}`);
  for (const r of removes) out(`  - ${r}`);
}
