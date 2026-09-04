# Hostinger MCP Config for Cloud Hermes
# =======================================
# Paste this into ~/.hermes/config.yaml on your cloud Hermes VPS

mcp_servers:
  hostinger:
    command: npx
    args:
      - -y
      - hostinger-api-mcp
      - --connect-timeout
      - '90'
    env:
      HOSTINGER_API_TOKEN: "hp_YOUR_TOKEN_HERE"
    enabled: true
    timeout: 120
    connect_timeout: 90

# ─── How to get the token ────────────────────────────────────────────
# 1. Log into hPanel: https://hpanel.hostinger.com
# 2. Profile (top right) → Account Information → API
# 3. Click "Generate new token"
# 4. Copy the token (starts with "hp_")
# 5. Replace "hp_YOUR_TOKEN_HERE" above with your actual token

# ─── Verify it works ─────────────────────────────────────────────────
# After restarting Hermes:
#   Tools appear as: mcp_hostinger_* (280+ tools)
#   Test with: mcp_hostinger_hosting_listWebsitesV1
#   Or: mcporter call --stdio "npx -y hostinger-api-mcp --stdio" hosting_listWebsitesV1 --output json

# ─── Common deploy tool ──────────────────────────────────────────────
# mcp_hostinger_hosting_deployStaticWebsite
#   domain: belgium420.com
#   archivePath: /Users/ever/belgium420-site/deploy.zip
#   removeArchive: true

# ─── Your Hostinger account details ──────────────────────────────────
# Domain: belgium420.com
# Account user: u996138094
# Upload path: public_html/
# Deploy method: static site (hosting_deployStaticWebsite)
