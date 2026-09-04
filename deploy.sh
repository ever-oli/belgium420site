#!/bin/bash
# deploy.sh — Clean build + deploy to Hostinger, with verification.
# Usage: ./deploy.sh
set -euo pipefail

ROOT="/Users/ever/belgium420-site"
cd "$ROOT"

echo "=== [1/5] Clean & Build (auth OFF for live public site) ==="
export AUTH_ENABLED=false
rm -rf dist .astro
npm run build 2>&1 | tail -3

echo "=== [2/5] Archive dist/ contents (root-level, not dist/ itself) ==="
cd dist
rm -f ../deploy.zip
zip -rq ../deploy.zip .
cd "$ROOT"
echo "Archive size: $(du -h deploy.zip | cut -f1)"

echo "=== [3/5] Deploy via hostinger MCP ==="
# This block is meant to be run by the cloud Hermes agent with the MCP tool.
# It will call: hosting_deployStaticWebsite domain=belgium420.com archivePath=$ROOT/deploy.zip removeArchive=true
echo "Agent: call hosting_deployStaticWebsite with:"
echo "  domain=belgium420.com"
echo "  archivePath=$ROOT/deploy.zip"
echo "  removeArchive=true"
echo ""
echo "Waiting for you to run the MCP deploy..."

echo "=== [4/5] Verify ==="
sleep 15
echo "HTTP status + Last-Modified:"
curl -sI "https://belgium420.com/index.html" | grep -iE "HTTP/|last-modified" | head -5
echo ""
echo "Live site (first 200 chars):"
curl -s "https://belgium420.com/index.html" | head -c 200
echo ""

echo "=== [5/5] Done ==="
echo "If Last-Modified matches build time, deploy succeeded."
