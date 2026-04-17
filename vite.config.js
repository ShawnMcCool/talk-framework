import { openInEditorPlugin } from './src/authoring/dev-middleware.js';

export default {
  base: process.env.NODE_ENV === 'production' ? '/beam-talk/' : '/',
  plugins: [openInEditorPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
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
