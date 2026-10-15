import { defineConfig } from 'astro/config';

const AUTH_ENABLED = (process.env.AUTH_ENABLED || '').toLowerCase() === 'true';

export default defineConfig({
  site: 'https://belgium420.com',
  output: 'static',
  build: {
    format: 'directory'
  },
  vite: {
    define: {
      __AUTH_ENABLED__: JSON.stringify(AUTH_ENABLED),
    },
    server: {
      proxy: {
        '/auth': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  },
});
