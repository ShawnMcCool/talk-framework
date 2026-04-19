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

const VIRTUAL_ID = 'virtual:content-manifest';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

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
      server.watcher.on('all', (event, changed) => {
        if (!changed || !changed.startsWith(contentRoot)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
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
  };
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

  // Build dynamic imports for each scene's source file.
  const sceneImports = scenes.map((s, i) => {
    const src = s.kind === 'md'
      ? `/content/${s.folder}/scene.md?raw`
      : `/content/${s.folder}/scene.js`;
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

    const diagnostics = [];

    for (const slide of parsed.slides) {
      for (const step of slide) {
        for (const block of step) {
          if (block.type === 'code' && block.language) {
            const custom = registry.getByInfoString(block.language);
            if (custom && custom.validate) {
              const data = custom.parse ? custom.parse(block.code, {
                file: `${sceneId}/scene.md`,
                blockStartLine: block.line || 1,
              }) : block.code;
              const diags = custom.validate(data, {
                file: `${sceneId}/scene.md`,
                blockStartLine: block.line || 1,
              });
              for (const d of diags) diagnostics.push(d);
            }
            continue;
          }

          const builtin = registry.getByBlockType(block.type);
          if (builtin && builtin.validate) {
            const diags = builtin.validate(block, {
              file: `${sceneId}/scene.md`,
              blockStartLine: 1,
            });
            for (const d of diags) diagnostics.push(d);
          }
        }
      }
    }

    return diagnostics;
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
