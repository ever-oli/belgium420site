# Belgium420 — Deploy Runbook

Validated workflow for building and deploying the Astro static site at `/Users/ever/belgium420-site` to Hostinger shared hosting (`belgium420.com`, account `u996138094`).

## Prerequisites

1. **Hostinger API token** — hPanel → Profile → Account Information → API → Generate token
   ```bash
   export HOSTINGER_API_TOKEN="hp_..."
   ```
2. Node 20+ on the agent host
3. `npm ci` already run in `/Users/ever/belgium420-site`
4. `hostinger-api-mcp` MCP server configured in `~/.hermes/config.yaml`

## Deploy sequence

```bash
# 1. Build (auth OFF — public live site)
cd /Users/ever/belgium420-site
AUTH_ENABLED=false npm run build

# 2. Archive dist/ CONTENTS (root-level, NOT dist/ itself)
cd dist && rm -f ../deploy.zip && zip -rq ../deploy.zip . && cd ..

# 3. Deploy via MCP tool: hosting_deployStaticWebsite
#    domain=belgium420.com
#    archivePath=/Users/ever/belgium420-site/deploy.zip
#    removeArchive=true

# 4. Verify (wait 15s first for async propagation)
sleep 15
curl -sI "https://belgium420.com/index.html" | grep -iE "HTTP/|last-modified"
curl -s https://belgium420.com/index.html | grep -c "<your-change-marker>"
```

### Deploy with auth ON (rare — when gate is toggled on)

```bash
cd /Users/ever/belgium420-site
AUTH_ENABLED=true npm run build
# ... archive + deploy as above
```

## Inventory update sequence

1. Add product to `products` array in `src/pages/index.astro` (name = brand, type = size/form)
2. Drop photo in `public/inventory/<category>/<lowercase-slug>.<ext>`
3. Update `src/lib/strain-types.js` if cannabis strain:
   - Cultivar (flower) → `cultivarToType` or `namedStrainToType`
   - House strains → `hybrid` (Nectar Berry, Candy family, etc.)
   - Strawberry → `sativa`
   - Mushrooms → `n/a` (no type chip)
   - Flavor lines (carts/edibles with indica+hybrid+sativa variants) → `branded`
4. Run `node scripts/build-inventory-log.mjs`
5. Check `inventory/build-report.json` for `unmatchedNames`
6. If unmatched: search Leafly first (slug variants), then web (brand + product)
7. Record findings in `inventory/web-matches.json` with source URL + confidence
8. Re-run `node scripts/build-inventory-log.mjs` to regenerate workbook
9. Rebuild + deploy

## Order triage

Orders → `public/api/orders.php` → `data/orders.json` (outside docroot)

```bash
# List all orders (newest first)
curl "https://belgium420.com/api/orders.php?key=420Belgium"

# Fetch one order
curl "https://belgium420.com/api/orders.php?key=420Belgium&id=B420-20260904-AB"

# Mark as paid
curl -X PATCH "https://belgium420.com/api/orders.php?key=420Belgium&id=B420-20260904-AB" \
  -H "Content-Type: application/json" \
  -d '{"status":"paid"}'

# Mark as shipped with tracking
curl -X PATCH "https://belgium420.com/api/orders.php?key=420Belgium&id=B420-20260904-AB" \
  -H "Content-Type: application/json" \
  -d '{"status":"shipped","tracking":"1Z999AA10123456784"}'
```

Status flow: `received` → `paid` → `shipped`
- New order → email to `mstwntdpacks@gmail.com` (owner)
- Paid → no auto-email (manual follow-up)
- Shipped → tracking email to customer

Admin panel: `https://belgium420.com/admin/?key=420Belgium`

## Verification checklist

After every deploy:
1. `curl -sI https://belgium420.com/index.html | grep last-modified` — must match build time
2. `curl -s https://belgium420.com/index.html | grep "<change-marker>"` — HTML contains your change
3. Fetch `_astro/index.<hash>.css` separately if CSS looks stale (Astro bundles CSS)
4. `curl -sI https://belgium420.com/_astro/index.*.css | grep last-modified` — stylesheet updated too
5. Spot-check 3-4 inventory thumbnails: `curl -sI https://belgium420.com/inventory/pounds/sharpiez-1900.jpeg` — case-sensitive on Hostinger

## Common failure modes (retry first — don't restructure)

| Failure | Message | Fix |
|--------|---------|-----|
| Rate limit | `429: Too Many Attempts` | Wait 45-60s, retry **identical** call |
| Upload timeout | `timeout of 60000ms exceeded` (~22MB zip) | Retry identical call; next attempt succeeds |
| Stale after "success" | 200 OK but old content | Edge cache: wait 15-30s, check Last-Modified |
| Image 404 on live | File in zip but not served | Case mismatch (Mac vs Linux). Use `/index.html` during propagation |
| CSS stale | HTML updated, styles old | Astro bundles to `_astro/index.<hash>.css` — fetch separately |
| `index.html` vs `/` | Bare `/` shows Hostinger placeholder briefly | Use `https://belgium420.com/index.html` during propagation |

## Quick reference commands

```bash
# Test MCP server
export HOSTINGER_API_TOKEN="hp_..."
mcporter list --stdio "npx -y hostinger-api-mcp --stdio" --name hostinger | head -5

# List websites on your account
mcporter call --stdio "npx -y hostinger-api-mcp --stdio" hosting_listWebsitesV1 --output json

# List domains
mcporter call --stdio "npx -y hostinger-api-mcp --stdio" domains_getDomainListV1 --output json

# Rebuild inventory workbook
node scripts/build-inventory-log.mjs && cat inventory/build-report.json
```
