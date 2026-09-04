# Belgium420 Cloud Hermes — Agent Setup Packet

This file is the **carbon copy** of everything your local (desktop) Hermes uses to manage `/Users/ever/belgium420-site`. Drop it onto your cloud Hermes and it can take over deploys, inventory, and orders management on Hostinger.

---

## 1. The Heads-Up Prompt

Give your cloud cloud Hermes agent **exactly this** as the first message (or paste it into a `PROMPT.md` for the agent):

```
You are the Belgium420 site manager. Your project directory is /Users/ever/belgium420-site — an Astro 4 static site hosted on Hostinger shared hosting (domain belgium420.com).

You have the hostinger MCP server available (npx hostinger-api-mcp). Your job is to build, deploy, manage inventory, and triage orders for this shop. Never guess — always verify. Follow the runbook in belgium420-site/DEPLOY.md.

Key constraints:
- Product data lives inline in src/pages/index.astro (a `products` array in frontmatter).
- Inventory photos live in public/inventory/<category>/. Always lowercase filenames.
- Auth gate is OFF by default (AUTH_ENABLED=false in .env). Toggle via .build-on.sh / .build-off.sh.
- Deploy to public_html/ on Hostinger via hosting_deployStaticWebsite. Archive the CONTENTS of dist/ (root-level files), not dist/ itself.
- Orders come through public/api/orders.php → data/orders.json. Admin key: 420Belgium.
- Brand palette: --belgian-black #050505, --belgian-yellow #F5C400, --belgian-red #E31C23. Fonts: Anton / Space Grotesk / JetBrains Mono. Do not deviate.
- This is a legal-compliance hemp shop (Farm Bill). 21+ age gate always stays on.

When in doubt, read the SKILL.md and runbooks first.
```

---

## 2. Full config.yaml (paste into your cloud profile's config.yaml)

```yaml
# ── Belgian420 Cloud Hermes Config ──
# Copy-paste everything below into ~/.hermes/config.yaml (or your profile's)

model:
  default: poolside/laguna-s-2.1:free
  provider: nous
  base_url: https://inference-api.nousresearch.com/v1
fallback_providers: []
toolsets:
  - all

agent:
  max_turns: 60
  gateway_timeout: 1800
  restart_drain_timeout: 60
  api_max_retries: 3
  service_tier: ''
  tool_use_enforcement: auto
  task_completion_guidance: true
  parallel_tool_call_guidance: true
  environment_probe: true
  coding_context: auto
  verify_on_stop: false
  gateway_timeout_warning: 900
  clarify_timeout: 600
  gateway_notify_interval: 180
  gateway_auto_continue_freshness: 3600
  image_input_mode: auto
  disabled_toolsets: []
  verbose: false
  reasoning_effort: high

terminal:
  backend: local
  modal_mode: auto
  cwd: /Users/ever/belgium420-site
  timeout: 180
  auto_source_bashrc: true
  docker_image: nikolaik/python-nodejs:python3.11-nodejs20
  docker_forward_env: []
  container_cpu: 1
  container_memory: 5120
  container_disk: 51200
  container_persistent: true
  persistent_shell: true
  lifetime_seconds: 300

browser:
  inactivity_timeout: 120
  command_timeout: 30
  engine: auto
  auto_local_for_private_urls: true
  dialog_policy: must_respond
  dialog_timeout_s: 300

memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200
  user_char_limit: 1375

delegation:
  inherit_mcp_toolsets: true
  max_concurrent_children: 10
  max_spawn_depth: 1
  default_toolsets:
    - terminal
    - file
    - web

display:
  personality: technical
  final_response_markdown: strip
  timestamps: false
  tool_preview_length: 0

security:
  redact_secrets: true
  tirith_enabled: true
  allow_lazy_installs: true

approvals:
  mode: manual
  timeout: 60
  mcp_reload_confirm: true
  destructive_slash_confirm: true

command_allowlist:
  - script execution via -e/-c flag

plugins:
  enabled: []

mcp_servers:
  hostinger:
    command: npx
    args:
      - -y
      - hostinger-api-mcp
      - --connect-timeout
      - '90'
    env:
      HOSTINGER_API_TOKEN: "hp_YOUR_TOKEN_HERE"   # ← GET FROM hPanel → Profile → Account → API
    enabled: true

platforms:
  buzz:
    enabled: true
```

---

## 3. Memories to load (MEMORY.md + USER.md)

### MEMORY.md

```
belgium420.com: Astro 4 static site at /Users/ever/belgium420-site, hosted on Hostinger shared hosting (account user u996138094). Deploy via hostinger-api-mcp → hosting_deployStaticWebsite. Brand = Belgian-flag streetwear × lab-backed hemp, Farm Bill compliant.
Site structure: Astro SSG (output:static, format 'directory'). Auth gate OFF (AUTH_ENABLED=false). Express auth server in server/index.mjs (SuperTokens) kept for when gate flips on. Orders API: public/api/orders.php → data/orders.json. Admin key: 420Belgium. Owner email: mstwntdpacks@gmail.com.
Deploy steps: 1) npm run build (AUTH_ENABLED=false for public)  2) cd dist && zip -rq ../deploy.zip .  3) hosting_deployStaticWebsite domain=belgium420.com archivePath=/Users/ever/belgium420-site/deploy.zip removeArchive=true  4) Verify Last-Modified matches + curl live HTML
Site conventions: Product data in src/pages/index.astro products[] array. Naming: brand in `name`, size/form in `type`. Palette: #050505/#F5C400/#E31C23. Fonts: Anton/Space Grotesk/JetBrains Mono. Pure Astro/CSS/SVG/SMIL — no React/three.js.
Inventory: photos in public/inventory/<category>/. Run scripts/build-inventory-log.mjs after product changes. Strain typing in src/lib/strain-types.js. Owner house strains → hybrid, Strawberry → sativa. Mushrooms → n/a. Cite Leafly/web sources in web-matches.json.
Deploy gotchas: hosting_deployStaticWebsite processes async; wait 15s. Verify via Last-Modified header + /index.html (not bare /). CSS bundled into _astro/*.css — grep HTML for markers, fetch stylesheet separately. Case-sensitive filenames on Hostinger (Mac is case-insensitive locally).
```

### USER.md

```
Prefers uv for Python. Wants to build/train own models (UNet with MLX/TensorPoly). Claude = architect/planner, Hermes = builder. DM-only Telegram. Currently in Xalapa, Veracruz, México. MX-market job search active in parallel with US remote-AI/ML pipeline.
```

---

## 4. Skills to copy in

Your local Hermes already has these skills installed at `~/.hermes/skills/`. Copy or recreate these in your cloud profile:

| Skill | Purpose | Path on local |
|-------|---------|---------------|
| `devops/hostinger-site-deployment` | Hostinger MCP + deploy workflows | already bundled |
| `software-development/hermes-agent` | Hermes config/auth/commands | already bundled |
| `software-development/hermes-agent-skill-authoring` | Writing SKILL.md files | already bundled |
| `productivity/xlsx` | Excel workbook editing (for inventory) | already bundled |
| `productivity/pdf` | PDF read/write | already bundled |
| `github/github-pr-workflow` | Git deploy branches | already bundled |

The skills live at:
```
~/.hermes/skills/academic-paper-formalization-review
~/.hermes/skills/apple
~/.hermes/skills/autonomous-ai-agents
~/.hermes_skills/creative
~/.hermes/skills/data-science
~/.hermes/skills/devops          ← contains hostinger-site-deployment
~/.hermes/skills/diagramming
~/.hermes/skills/domain
~/.hermes/skills/email
~/.hermes/skills/feeds
~/.hermes/skills/gaming
~/.hermes/skills/gifs
~/.hermes/skills/github
~/.hermes/skills/inference-sh
~/.hermes/skills/leisure
~/.hermes/skills/llm-experiments
~/.hermes/skills/mcp
~/.hermes/skills/media
~/.hermes/skills/mlops
~/.hermes/skills/music-creation
~/.hermes/skills/note-taking
~/.hermes/skills/ocr-and-documents
~/.hermes/skills/orca-cli
~/.hermes/skills/parameter-golf-iteration-workflow
~/.hermes/skills/productivity
~/.hermes/skills/red-teaming
~/.hermes/skills/research
~/.hermes/skills/smart-home
~/.hermes/skills/social-media
~/.hermes/skills/software-development
~/.hermes/skills/yuanbao
```

**Copy via:** `rsync -a ~/.hermes/skills/ <cloud>:~/.hermes/skills/` or zip the whole dir and drop it in.

---

## 5. Deploy Runbook (DEPLOY.md)

This is the exact sequence your cloud agent should follow for every deploy.

### Prerequisites

1. **Hostinger API token** — get from hPanel → Profile → Account Information → API → Generate token
2. Set it as env var: `export HOSTINGER_API_TOKEN="hp_..."`  (or configure in mcp_servers env above)
3. Node 20+ on the agent host
4. `npm ci` already run in `/Users/ever/belgium420-site`

### Build + Deploy

```bash
# Always rebuild from clean
cd /Users/ever/belgium420-site

# Public deploy (auth off — this is the live shop state)
./.build-off.sh

# Archive dist/ CONTENTS (not dist/ itself)
cd dist && rm -f ../deploy.zip && zip -rq ../deploy.zip . && cd ..

# Deploy via MCP (agent calls the mcp_hostinger tool: hosting_deployStaticWebsite)
# domain=belgium420.com
# archivePath=/Users/ever/belgium420-site/deploy.zip
# removeArchive=true
```

### Verify

```bash
# Wait for async deploy to propagate
sleep 15

# Check HTTP status + Last-Modified
curl -sI "https://belgium420.com/index.html" | grep -iE "HTTP/|last-modified"

# Verify a marker from your change is in the live HTML
curl -s https://belgium420.com/index.html | grep -c "<your-marker-here>"

# If CSS looks stale, grep the stylesheet separately
curl -s https://belgium420.com/_astro/index.*.css | grep "<keyframe-name>"
```

### If deploying with auth ON

```bash
./.build-on.sh   # AUTH_ENABLED=true — runs the full gate, needs Node backend
```

### Adding inventory items

1. Drop photo into `public/inventory/<category>/<slugified-name>.<ext>`
2. Add the product to the `products` array in `src/pages/index.astro`
3. Add strain typing to `src/lib/strain-types.js` if it's a cannabis strain
4. Run `node scripts/build-inventory-log.mjs` — this regenerates `inventory/belgium420-inventory.xlsx`, `inventory/build-report.json`
5. Check `inventory/build-report.json` for `unmatchedNames` — if any, resolve via Leafly/web search
6. Rebuild + deploy

### Order triage

Orders come through `public/api/orders.php` → stored in `data/orders.json` (outside docroot).
- List orders: `GET https://belgium420.com/api/orders.php?key=420Belgium`
- Update status: `PATCH https://belgium420.com/api/orders.php?key=420Belgium&id=B420-YYYYMMDD-XX` with `{"status":"paid"}` or `{"status":"shipped","tracking":"..."}`
- New orders trigger email to `mstwntdpacks@gmail.com`
- Customer confirmation email sent automatically

### Common failure modes

| Failure | Message | Fix |
|--------|---------|-----|
| Rate limit | `429: Too Many Attempts` | Wait 45-60s, retry identical call |
| Upload timeout | `timeout of 60000ms exceeded` (~22MB) | Retry identical call |
| Stale HTML | 200 OK but old content | Check `Last-Modified` header, not just status |
| CSS stale | HTML updated, CSS not | Astro bundles CSS as `_astro/index.<hash>.css` — fetch + grep it |
| Case mismatch | Image 404s on live site | Hostinger is case-sensitive (Linux). Local macOS is not. Always lowercase filenames in `public/inventory/` |

---

## 6. Hostinger MCP reference (quick)

```bash
# Test the server
export HOSTINGER_API_TOKEN="hp_..."
npx -y hostinger-api-mcp --stdio

# Common tools:
#   hosting_listWebsitesV1       — list sites on your account
#   hosting_deployStaticWebsite  — deploy a static site zip
#   domains_getDomainListV1      — list domains
#   hosting_listAccountDatabasesV1 — databases
#   hosting_createAccountCronJobV1 — manage cron
```

---

## 7. Quick-start for the agent

```bash
# First session — verify everything:
cd /Users/ever/belgium420-site
npm ci
mcporter list --stdio "npx -y hostinger-api-mcp --stdio" --name hostinger 2>&1 | head -5
curl -sI https://belgium420.com | head -5
node scripts/build-inventory-log.mjs && cat inventory/build-report.json
```
