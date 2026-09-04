#!/bin/bash
# package-bundle.sh — Bundle everything the cloud Hermes needs into a tarball
set -e
cd /Users/ever/belgium420-site

echo "=== Creating cloud Hermes bundle ==="

# Files created for the cloud agent
BUNDLE_FILES=(
  "CLOUD-HERMES-SETUP.md"
  "AGENT-PROMPT.md"
  "DEPLOY.md"
  "CONFIG-BUNDLE.md"
  "SKILLS-LIST.txt"
  "deploy.sh"
)

# Also include the key reference files
REF_FILES=(
  ".build-on.sh"
  ".build-off.sh"
  ".organize-inventory.sh"
  "AUTH.md"
  "DESIGN-INSPIRATION.md"
  "docker-compose.yml"
  "astro.config.mjs"
  "package.json"
  ".env.example"
)

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BUNDLE_NAME="belgium420-cloud-hermes-bundle-${TIMESTAMP}.tar.gz"

# Create tarball
tar -czf "$BUNDLE_NAME" "${BUNDLE_FILES[@]}" "${REF_FILES[@]}" \
  --exclude="dist" --exclude="node_modules" --exclude="*.zip" --exclude=".env" --exclude=".DS_Store" 2>/dev/null

echo "Bundle created: $BUNDLE_NAME"
echo "Size: $(du -h "$BUNDLE_NAME" | cut -f1)"
echo ""
echo "Contents:"
tar -tzf "$BUNDLE_NAME" | sort
