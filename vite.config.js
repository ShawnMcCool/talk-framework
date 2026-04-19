import { openInEditorPlugin } from './src/authoring/dev-middleware.js';
import { contentLoaderPlugin } from './src/authoring/content-loader-plugin.js';

export default {
  base: process.env.NODE_ENV === 'production' ? '/beam-talk/' : '/',
  plugins: [
    contentLoaderPlugin({ contentRoot: '/content' }),
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
