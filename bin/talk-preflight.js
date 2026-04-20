#!/usr/bin/env node
// Pre-docker-up checks for `talk serve`. Non-fatal — prints warnings to stderr
// and exits 0 on any recoverable issue so the dev server still starts.
//
// Usage: talk-preflight.js <content-root>

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseToml } from '../src/authoring/toml.lib.js';
import { checkVersionDrift } from '../src/authoring/version-drift.lib.js';

const contentRoot = process.argv[2];
if (!contentRoot) process.exit(0);

try {
  const tomlPath = path.join(contentRoot, 'talk.toml');
  if (!fs.existsSync(tomlPath)) process.exit(0);

  const toml = parseToml(fs.readFileSync(tomlPath, 'utf8'));
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  const pkg = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));

  const drift = checkVersionDrift({
    declaredVersion: toml?.framework_version,
    installedVersion: pkg.version,
  });
  if (!drift.ok) {
    process.stderr.write(`talk serve: warning — ${drift.message}\n`);
  }
} catch {
  // Non-fatal: let the dev server start and surface real errors there.
}
