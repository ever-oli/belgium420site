# Cloud Hermes Deploy Guide — Belgium420 Site

## Setup (one-time, for cloud Hermes)

```bash
# 1. Share the site
#    - Upload belgium420-source-share.tar.gz to the cloud (any method: HTTP POST, SCP, etc.)
#    - On the cloud VM: tar -xzf belgium420-source-share.tar.gz -C /users/ever/belgium420-site

# 2. Install deps + Hostinger MCP
cd /users/ever/belgium420-site
npm ci

# 3. Configure Hostinger MCP in config.yaml
#    Add the mcp_servers.hostinger block with your HOSTINGER_API_TOKEN
#    Token from: hPanel → Profile → Account Info → API

# 4. Restart cloud Hermes: hermes restart

# 5. Verify MCP loaded: check for mcp_hostinger_* tools
```

## Deploy workflow (chat with cloud Hermes from browser)

```
You: /load devops/hostinger-site-deployment
You: Build and deploy belgium420-site. AUTH_ENABLED=false. Verify with curl after.
```

What the agent will do:
1. `cd /users/ever/belgium420-site && AUTH_ENABLED=false npx astro build`
2. `cd dist && rm -f ../deploy.zip && zip -rq ../deploy.zip . && cd ..`
3. Call `mcp_hostinger_hosting_deployStaticWebsite` with `domain=belgium420.com, archivePath=/users/ever/belgium420-site/deploy.zip, removeArchive=true`
4. `sleep 15 && curl -sI https://belgium420.com/index.html | grep -i last-modified`

## Inventory update workflow

```
You: Add product "Nightshade OG" to the catalogue.
     type: Pre-roll · 1g
     price: $12.00
     tone: red
     batch: B420-2026-1120
     categories: [prerolls]
     photo at /inventory/prerolls/nightshade-og-12.jpg
```

What the agent does:
1. Edit the `products` array in `src/pages/index.astro`
2. Copy photo to `public/inventory/prerolls/nightshade-og-12.jpg`
3. Run `node scripts/build-inventory-log.mjs`
4. Check `inventory/build-report.json` for unmatched strain types
5. Rebuild + deploy

## Order triage

```
You: Any new orders? Triage them and email me a summary.
```

Agent will:
1. `curl "https://belgium420.com/api/orders.php?key=420Belgium"`
2. Summarize new orders (received → paid → shipped)
3. Mark any that need attention
