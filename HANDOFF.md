# Handoff: belgium420-site → Cloud Hermes

## Repo
`https://github.com/ever-oli/belgium420site` (private)

Clone:
```bash
git clone https://github.com/ever-oli/belgium420site.git /users/ever/belgium420-site
cd belgium420-site && npm ci
```

## Deploy command (one-shot)
```bash
cd /users/ever/belgium420-site
AUTH_ENABLED=false npx astro build
cd dist && rm -f ../deploy.zip && zip -rq ../deploy.zip . && cd ..
mcporter call --stdio "npx -y hostinger-api-mcp --stdio" \
  hosting_deployStaticWebsite \
  domain=belgium420.com \
  archivePath=/users/ever/belgium420-site/deploy.zip \
  removeArchive=true \
  --output json
sleep 10 && curl -sI https://belgium420.com/index.html | grep -i last-modified
```

## Add new product (example)
```
Add "Nightshade OG · Pound" to the shop. Price: $950. Type: Premium Flower · 1lb. Batch: B420-2026-2501. Category: [flower, pounds]. Image: /inventory/pounds/nightshade-950-pound.jpeg
```

## Add Signal to cloud Hermes config
```yaml
platforms:
  signal:
    enabled: true
    signal_http_url: "http://localhost:9090"  # if signal-cli runs on same VPS
    signal_account: "+19562224814"
    signal_allowed_users: "+19562224814"
```

## Signal CLI (if hosted on this VPS)
```bash
docker run -d \
  --name signal-cli-rest-api \
  -p 9090:8080 \
  -v /opt/signal-cli:/home/.local/share/signal-cli \
  bbernhard/signal-cli-rest-api:latest
```
Register: `curl -s "http://localhost:9090/v1/qrcodelink?device_name=hermes-bot" -H "Accept: image/png" -o /tmp/qr.png`

## File map
| Path | Purpose |
|------|---------|
| `src/pages/index.astro` | Products array (lines 22–1052) |
| `src/scripts/cart.ts` | Cart logic |
| `src/scripts/auth-gate.ts` | Auth toggle (AUTH_ENABLED) |
| `server/index.mjs` | Express API (orders, auth) |
| `public/api/orders.php` | Orders endpoint |
| `scripts/build-inventory-log.mjs` | Inventory reconciliation |
| `.fix-image-paths-v2.sh` | Sync image refs in index.astro |
| `.organize-inventory.sh` | Move loose files to category folders |
| `deploy-hostinger.sh` | Full deploy script |
| `HOSTINGER-MCP-CONFIG.md` | MCP server config |
| `CLOUD-DEPLOY-GUIDE.md` | Full walkthrough |
| `belgium420-signal/` | Signal CLI setup |

## Today's changes (Sept 4)
- **7 new products added**: Airheadz ($100/zip), Zlushuie ($250/zip), Donniesburger ($850/lb), Gashouse ($675/lb), GMO Cookies ($650/lb), Purple Zots ($1,200/lb), Warheadz ($1,875/lb)
- **Batch range**: B420-2026-2401 → B420-2026-2407
- All photos moved to `public/inventory/pounds/`
- Image paths synced via `.fix-image-paths-v2.sh`
- Inventory log: 106 SKUs, 115 photos, 0 missing
- **STATUS**: Built ✅ | Committed ✅ | **Deployed: PENDING** (needs API token)
