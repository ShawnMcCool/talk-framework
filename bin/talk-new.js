#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseFlags } from './cli-args.lib.js';

const frameworkRoot = process.env.FRAMEWORK_ROOT;
if (!frameworkRoot) {
  console.error('talk: FRAMEWORK_ROOT env var is not set (invoked outside the talk wrapper?)');
  process.exit(2);
}

let opts;
try {
  opts = parseFlags(process.argv.slice(2));
} catch (err) {
  console.error(`talk new: ${err.message}`);
  process.exit(2);
}

const [name] = opts.positional;
if (!name) {
  console.error('talk new: missing <name>. Usage: talk new <name> [--force] [--dry-run] [--no-ci]');
  process.exit(2);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error(`talk new: "${name}" is not a valid name (use lowercase letters, digits, and hyphens)`);
  process.exit(2);
}

const target = path.resolve(process.cwd(), name);
if (fs.existsSync(target)) {
  const entries = fs.readdirSync(target);
  if (entries.length > 0 && !opts.force) {
    console.error(`talk new: "${target}" already exists and is non-empty (use --force to override)`);
    process.exit(1);
  }
}

const templateRoot = path.join(frameworkRoot, 'templates', 'new-talk');
if (!fs.existsSync(templateRoot)) {
  console.error(`talk new: template missing at ${templateRoot}`);
  process.exit(2);
}

let plan = collectFiles(templateRoot, '');
if (opts.noCi) {
  plan = plan.filter((rel) => !rel.startsWith('.github/'));
}
if (opts.dryRun) {
  console.log(`talk new: would create ${plan.length} file(s) under ${name}/:`);
  for (const rel of plan) console.log(`  ${name}/${rel}`);
  process.exit(0);
}

fs.mkdirSync(target, { recursive: true });
for (const rel of plan) {
  const src = path.join(templateRoot, rel);
  const dst = path.join(target, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const contents = fs.readFileSync(src, 'utf8').replaceAll('{{TALK_NAME}}', name);
  fs.writeFileSync(dst, contents);
}

console.log(`created ${name}/`);
for (const rel of plan) console.log(`  ${rel}`);

function collectFiles(root, prefix) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    if (entry.name.endsWith('.test.js')) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...collectFiles(root, rel));
    } else {
      out.push(rel);
    }
  }
  return out;
}
