#!/bin/bash
# deploy-hostinger.sh — Deploy belgium420-site to Hostinger via MCP
set -euo pipefail

cd /Users/ever/belgium420-site

# Build first (public site, no auth)
echo "=== Building site ==="
AUTH_ENABLED=false npx astro build 2>&1

# Create deploy archive (contents of dist/ at root level)
echo "=== Creating deploy archive ==="
rm -f deploy.zip
cd dist && zip -rq ../deploy.zip . && cd ..
echo "Archive: $(ls -lh deploy.zip)"

# Deploy via Hostinger MCP
# You need HOSTINGER_API_TOKEN in your env
echo "=== Deploying to Hostinger ==="
export HOSTINGER_API_TOKEN="${HOSTINGER_API_TOKEN:-}"

if [ -z "$HOSTINGER_API_TOKEN" ]; then
  echo "ERROR: Set HOSTINGER_API_TOKEN env var"
  echo "Get it from: hPanel → Profile → Account Info → API"
  exit 1
fi

mcporter call --stdio "npx -y hostinger-api-mcp --stdio" \
  hosting_deployStaticWebsite \
  domain=belgium420.com \
  archivePath="$(pwd)/deploy.zip" \
  removeArchive=true \
  --output json 2>&1

echo "=== Deploy submitted. Waiting for propagation ==="
sleep 10

echo "=== Verify ==="
curl -sI "https://belgium420.com/index.html" | grep -iE "HTTP/|last-modified"
curl -sI "https://belgium420.com/inventory/pounds/Airheadz-100-zip.jpeg" | grep -iE "HTTP/|content-type|content-length"

echo "=== Done ==="
