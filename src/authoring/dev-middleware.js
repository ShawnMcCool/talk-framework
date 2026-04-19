// Vite plugin: exposes /__open-source?path=... which spawns $EDITOR on the
// given path (resolved relative to the project root). Dev-only. Read-only
// safety: the path must live inside the project directory.

import { spawn } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';

export function openInEditorPlugin() {
  return {
    name: 'talk-open-in-editor',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root;

      server.middlewares.use('/__open-source', (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const relPath = url.searchParams.get('path');
        if (!relPath) {
          res.statusCode = 400;
          res.end('missing path');
          return;
        }

        const abs = isAbsolute(relPath) ? relPath : resolve(root, relPath);
        const rel = relative(root, abs);
        if (rel.startsWith('..') || isAbsolute(rel)) {
          res.statusCode = 403;
          res.end('path outside project');
          return;
        }

        const editor = process.env.EDITOR || process.env.VISUAL || 'code';
        try {
          // Detached + ignore so the editor outlives this request.
          const child = spawn(editor, [abs], { detached: true, stdio: 'ignore' });
          child.unref();
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: true, editor, path: rel }));
        } catch (err) {
          res.statusCode = 500;
          res.end(`failed to launch ${editor}: ${err.message}`);
        }
      });

      // Force all connected browsers to do a full reload. Useful after a
      // batch of edits that left HMR in a broken state.
      //   curl http://localhost:3000/__reload
      server.middlewares.use('/__reload', (req, res) => {
        server.ws.send({ type: 'full-reload', path: '*' });
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ ok: true, reloaded: true }));
      });
    },
  };
}
