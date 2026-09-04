# Belgium420 auth (SuperTokens)

## Status
**Currently disabled.** The site is fully public while we finish the rest of the work
and wait on client signoff for login requirements.

The auth code, Express server, and `docker-compose.yml` are intentionally left in
place so the gate can be flipped back on without re-implementing anything.

## Toggle (one env var)
```bash
# In .env, change:
AUTH_ENABLED=true    # gate ON  (login form + invite + nav logout appear)
AUTH_ENABLED=false   # gate OFF (public site, no login UI)
```
Then restart the dev server (`npm run dev`).

When the gate is OFF:
- The `<div id="authGate">` login overlay and form are not rendered.
- The "Log out" nav button is not rendered.
- The `auth-gate.ts` script is not loaded, so no SuperTokens SDK calls are made.
- The 21+ age gate still appears (legal compliance — unrelated to SuperTokens).

When the gate is ON:
- All original behavior returns unchanged: age gate → auth gate → shop.

## Local (when re-enabled)
```bash
npm run dev
```
Open http://localhost:4321

1. Confirm 21+
2. Tap flag bands **black → yellow → red**
3. **Sign up with invite** — code from `.env` (`INVITE_CODE`, default `belgium420-ff`)
4. Shop unlocks; **Log out** in the nav to re-test

## Production note
Static Hostinger alone cannot run SuperTokens. Use `npm run build && npm start` on a Node host (Express serves the site + `/auth`). Point `WEBSITE_DOMAIN` / `API_DOMAIN` at `https://belgium420.com` and replace `try.supertokens.com` with your own core (`docker compose up` or SuperTokens managed).

See `~/.buzz/RESEARCH/BELGIUM420_SUPERTOKENS_SETUP.md`.
