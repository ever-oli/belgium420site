# Belgium420 — Base44 Dev Environment

## Stack
- **Astro 4.16** static site (Vite 5.4) — main frontend, dev server on port 3000.
- **Express + SuperTokens** auth server (`server/index.mjs`, port 3001) — optional, only active when `AUTH_ENABLED=true`.
- PHP API files in `public/api/` are for production (Hostinger PHP hosting); they do not run in dev.

## Running the app
```
docker compose -f docker-compose.base44.yml up -d
```
- Container installs npm deps then runs `astro dev --port 3000 --host 0.0.0.0`.
- Source is bind-mounted; edits hot-reload in the preview.
- Healthcheck: `node -e "fetch('http://localhost:3000')..."`

## Key config
- `AUTH_ENABLED=false` by default (in `.env.base44-defaults`) — site is fully public, no login gate.
- Set `AUTH_ENABLED=true` + provide `SUPERTOKENS_CONNECTION_URI` to enable the SuperTokens login flow. The Express server must then also be started (`npm run auth`).
- Astro config has `server.host: true` + `allowedHosts: true` so the preview proxy can reach the dev server.

## Env files
- `.env.base44-defaults` — repo-local placeholders (first in `env_file`, lowest priority).
- `/run/base44/app.env` — platform-managed secrets (last in `env_file`, highest priority).

## Pages
- `/` — main storefront (index.astro, ~4900 lines, self-contained with inline shaders/scripts).
- `/checkout` — customer form (posts to `/api/orders.php`, PHP-only).
- `/admin` — admin panel (PHP API calls, not functional in dev).

## Tests
```
npm test          # node --test tests/*.test.js
```
