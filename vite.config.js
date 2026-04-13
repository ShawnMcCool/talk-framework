export default {
  base: process.env.NODE_ENV === 'production' ? '/beam-talk/' : '/',
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: {
      clientPort: 3000,
    },
  },
};
