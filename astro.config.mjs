import { defineConfig } from 'astro/config';

// AUTH_ENABLED — read from process.env, exposed to the client at build time
// via vite.define. Used by:
//   1. src/pages/index.astro frontmatter (gate the authGate div / logout btn /
//      auth-gate script import when false)
//   2. src/scripts/auth-gate.ts (compile-time `if (AUTH_ENABLED) { ... }` so the
//      SuperTokens SDK isn't even imported when false)
const AUTH_ENABLED = (process.env.AUTH_ENABLED || '').toLowerCase() === 'true';

export default defineConfig({
  site: 'https://belgium420.com',
  output: 'static',
  build: {
    // directory → /checkout/index.html so Hostinger serves /checkout (file format left /checkout 404)
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
