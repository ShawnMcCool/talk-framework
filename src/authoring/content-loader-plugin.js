// Vite plugin that exposes the current content folder as `virtual:content-manifest`.
// The content folder is always mounted at /content inside the container.
//
// The virtual module exports:
//   config          — the validated talk.toml object
//   scenes          — [{ index, slug, folder, kind, source }, ...] for successfully loaded scenes
//   issues          — [{ severity, folder?, message }, ...] structural problems
//   error           — null if OK, a string if talk.toml is missing/invalid
//
// When the content folder changes on disk, the plugin invalidates the virtual
// module so Vite's HMR pipeline picks up the new state on the next request.

import fs from 'node:fs';
import path from 'node:path';
import { discoverScenes } from './scene-discovery.lib.js';
import { parseToml } from './toml.lib.js';
import { validateTalkConfig } from './talk-config.lib.js';
import { parseMarkdownScene } from './markdown-scene.lib.js';
import { registry } from './component-registry.js';
import { walkSceneDiagnostics } from './scene-diagnostics.lib.js';

const VIRTUAL_ID = 'virtual:content-manifest';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif',
]);

const IMAGE_MIME = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.avif': 'image/avif',
};

export function contentLoaderPlugin(options = {}) {
  const contentRoot = options.contentRoot || '/content';

  return {
    name: 'talk:content-loader',

    configureServer(server) {
      try {
        server.watcher.add(contentRoot);
      } catch {
        // Watcher errors are non-fatal — polling in the container catches changes anyway.
      }

      // Serve /content/<rel> URLs from the on-disk content folder. Image
      // tags reference these URLs from compiled scenes; without this
      // middleware Vite would 404 because contentRoot is typically outside
      // the project root.
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/content/')) return next();
        const urlPath = req.url.split('?')[0];
        const rel = decodeURIComponent(urlPath.slice('/content/'.length));
        if (rel === '' || rel.includes('..')) return next();
        const ext = path.extname(rel).toLowerCase();
        if (!IMAGE_EXTENSIONS.has(ext)) return next();
        const filePath = path.join(contentRoot, rel);
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return next();
        try {
          const data = fs.readFileSync(filePath);
          res.setHeader('Content-Type', IMAGE_MIME[ext] || 'application/octet-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(data);
        } catch (err) {
          next(err);
        }
      });

      server.watcher.on('all', (event, changed) => {
        if (!changed || !changed.startsWith(contentRoot)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) {
          // Reload the virtual module in place. Vite propagates to importers
          // (main.js) via its dep-specific import.meta.hot.accept handler —
          // no page reload, so the last-good cache and error banner survive
          // the edit and the "edge banner on last-good render" UX works.
          server.reloadModule(mod);
        }

        // Emit diagnostics for markdown scene files when they change.
        if (changed.endsWith('/scene.md')) {
          try {
            // Extract sceneId: the path segment between contentRoot/ and /scene.md.
            const rel = changed.slice(contentRoot.length + 1); // e.g. "01-intro/scene.md"
            const sceneId = rel.slice(0, rel.length - '/scene.md'.length); // e.g. "01-intro"
            const diagnostics = collectSceneDiagnostics(sceneId, changed);
            server.ws.send({ type: 'custom', event: 'talk:diagnostics', data: { sceneId, diagnostics } });
          } catch (err) {
            console.error('[talk:content-loader] diagnostics emit error:', err);
          }
        }
      });
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },

    load(id) {
      if (id !== RESOLVED_ID) return null;
      return buildManifestModule(contentRoot);
    },

    // Copy the content folder's image assets into dist/content/ so the
    // deployed bundle can serve them at the same `/content/<rel>` URLs the
    // dev middleware serves. Only image files are copied — markdown and JS
    // sources are inlined into the bundle by the manifest's import lines
    // and don't need to ship as static assets.
    closeBundle() {
      const outDir = (this.environment && this.environment.config && this.environment.config.build && this.environment.config.build.outDir)
        || 'dist';
      copyImageAssets(contentRoot, path.join(outDir, 'content'));
    },
  };
}

function copyImageAssets(srcRoot, destRoot) {
  if (!fs.existsSync(srcRoot)) return;
  const stack = [''];
  while (stack.length > 0) {
    const rel = stack.pop();
    const srcDir = rel === '' ? srcRoot : path.join(srcRoot, rel);
    let entries;
    try {
      entries = fs.readdirSync(srcDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const subRel = rel === '' ? entry.name : path.join(rel, entry.name);
      if (entry.isDirectory()) {
        stack.push(subRel);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destRoot, subRel);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildManifestModule(contentRoot) {
  const tomlPath = path.join(contentRoot, 'talk.toml');
  if (!fs.existsSync(tomlPath)) {
    return errorModule(`No talk.toml found at ${contentRoot}. Did you forget to set CONTENT_DIR?`);
  }

  let config;
  try {
    const parsed = parseToml(fs.readFileSync(tomlPath, 'utf8'));
    const { config: validated, errors } = validateTalkConfig(parsed);
    if (errors.length > 0) {
      return errorModule(`talk.toml is invalid:\n  - ${errors.join('\n  - ')}`);
    }
    config = validated;
  } catch (err) {
    return errorModule(`Failed to parse talk.toml: ${err.message}`);
  }

  const entries = listEntries(contentRoot);
  const { scenes, issues } = discoverScenes(entries);

  // Build dynamic imports for each scene's source file. Use the actual
  // content-root path so the imports resolve in both dev (where contentRoot
  // is typically /content via Docker bind-mount) and production builds
  // (where CONTENT_DIR points anywhere on disk and Rollup needs a real
  // filesystem path to traverse).
  const sceneImports = scenes.map((s, i) => {
    const file = s.kind === 'md' ? 'scene.md' : 'scene.js';
    const abs = path.join(contentRoot, s.folder, file);
    const src = s.kind === 'md' ? `${abs}?raw` : abs;
    return { ...s, importPath: src, importIdent: `__scene_${i}` };
  });

  const importLines = sceneImports.map(s =>
    s.kind === 'md'
      ? `import ${s.importIdent} from ${JSON.stringify(s.importPath)};`
      : `import * as ${s.importIdent} from ${JSON.stringify(s.importPath)};`,
  ).join('\n');

  const sceneObjects = sceneImports.map(s => `  {
    index: ${s.index},
    slug: ${JSON.stringify(s.slug)},
    folder: ${JSON.stringify(s.folder)},
    kind: ${JSON.stringify(s.kind)},
    source: ${s.importIdent},
  }`).join(',\n');

  return `${importLines}

export const config = ${JSON.stringify(config)};
export const scenes = [
${sceneObjects}
];
export const issues = ${JSON.stringify(issues)};
export const error = null;
`;
}

function listEntries(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).map(d => {
    const isDirectory = d.isDirectory();
    let hasSceneMd = false;
    let hasSceneJs = false;
    if (isDirectory) {
      const sub = path.join(dir, d.name);
      try {
        hasSceneMd = fs.existsSync(path.join(sub, 'scene.md'));
        hasSceneJs = fs.existsSync(path.join(sub, 'scene.js'));
      } catch {
        /* ignore */
      }
    }
    return { name: d.name, isDirectory, hasSceneMd, hasSceneJs };
  });
}

/**
 * Parse a scene.md file and return an array of diagnostic records.
 * On parse failure, returns a single scene-type error diagnostic.
 * On success with no issues, returns [].
 */
function collectSceneDiagnostics(sceneId, sceneMdPath) {
  try {
    const src = fs.readFileSync(sceneMdPath, 'utf8');
    let parsed;
    try {
      parsed = parseMarkdownScene(src, {});
    } catch (err) {
      return [{
        severity: 'error',
        component: 'scene-type',
        file: `${sceneId}/scene.md`,
        line: 1, column: 1,
        message: err.message,
      }];
    }

    return walkSceneDiagnostics(parsed, { file: `${sceneId}/scene.md`, registry });
  } catch (err) {
    return [{
      severity: 'error',
      component: 'scene-type',
      file: `${sceneId}/scene.md`,
      line: 1, column: 1,
      message: err.message,
    }];
  }
}

function errorModule(message) {
  return `export const config = null;
export const scenes = [];
export const issues = [];
export const error = ${JSON.stringify(message)};
`;
}
