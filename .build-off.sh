#!/bin/bash
# Build with auth gate OFF (public site). Run from project root.
export AUTH_ENABLED=false
cd "$(dirname "$0")"
rm -rf dist .astro
echo "[toggle-build] AUTH_ENABLED=$AUTH_ENABLED"
npm run build 2>&1 | tail -8
echo "---"
echo -n "authGate in HTML: "; grep -c 'id="authGate"' dist/index.html || echo 0
echo -n "logoutBtn in HTML: "; grep -c 'id="logoutBtn"' dist/index.html || echo 0
echo -n "auth-gate script chunks: "; ls dist/_astro/*.js 2>/dev/null | wc -l | tr -d ' '
echo -n "superstrings in JS: "; grep -rl 'supertokens' dist/ 2>/dev/null | wc -l | tr -d ' '
echo -n "ageGate in HTML: "; grep -c 'id="ageGate"' dist/index.html || echo 0
