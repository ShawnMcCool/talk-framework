import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { openInEditorPlugin } from './src/authoring/dev-middleware.js';
import { contentLoaderPlugin } from './src/authoring/content-loader-plugin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Relative base works everywhere: project pages (/repo/), user/org pages,
// custom domains, and any other static host — no env detection needed.
// CONTENT_DIR lets CI point the build at the content checkout; Docker
// mounts the content folder at /content, which is the dev-mode default.
export default {
  base: './',
  // `@talk-framework/...` lets a content folder's scene.js reach into the
  // framework via a path that resolves identically in dev and production
  // builds. The older `/@fs/app/src/...` pattern works only under the dev
  // server; using the alias here means JS-authored scenes are deployable.
  resolve: {
    alias: {
      '@talk-framework': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    contentLoaderPlugin({ contentRoot: process.env.CONTENT_DIR || '/content' }),
    openInEditorPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    fs: {
      allow: ['/app', '/content'],
    },
    // Docker bind mounts don't propagate inotify events reliably on Linux.
    // Polling ensures Vite sees every file change and triggers HMR.
    watch: {
      usePolling: true,
      interval: 200,
    },
    hmr: {
      clientPort: 3000,
    },
  },
};
