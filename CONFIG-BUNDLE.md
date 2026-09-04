# belgium420-site — Full Hermes Cloud Agent Bundle
# ===================================================
# This is your carbon copy of everything needed to run a cloud Hermes
# agent that manages /Users/ever/belgium420-site on Hostinger.
#
# Contents:
#   1. AGENT-PROMPT.md       → the heads-up prompt to give your cloud agent
#   2. config.yaml           → full Hermes config (MCP + terminal + settings)
#   3. MEMORY.md             → persistent memory entries
#   4. USER.md               → user profile
#   5. SKILLS-LIST.txt       → skills to copy in (and which are builtin)
#   6. DEPLOY.md             → deploy runbook (build → zip → MCP deploy → verify)
#   7. deploy.sh             → executable deploy script
#   8. HOSTINGER-QUICKREF.md → MCP tool quick reference

# ─── Copy these to ~/.hermes/ on your cloud agent ────────────────────

# config.yaml → ~/.hermes/config.yaml
# MEMORY.md   → ~/.hermes/memories/MEMORY.md
# USER.md     → ~/.hermes/memories/USER.md
# AGENT-PROMPT.md → give as first message to the cloud agent
# SKILLS-LIST.txt → reference for rsync / install

# ─── MCP SERVER ─────────────────────────────────────────────────────
# hostinger-api-mcp — requires Node 20+ and a Hostinger API token
# Get token: hPanel → Profile → Account Info → API → Generate
# Env var: HOSTINGER_API_TOKEN
#
# Also available (already in bundle): alphaxiv HTTP MCP at api.alphaxiv.org/mcp/v1

# ─── TERRITORIAL CONSTRAINTS ────────────────────────────────────────
# - Do NOT touch io gateway / IO parity work unless explicitly asked by user
# - User ID for approvals: 1489098923388829966 (Discord)
# - Buzz DM with Ever: 6383d11d-bb34-43fd-816f-2245f1bd5c785
# - User prefers DM-only Telegram, no group routing
# - belgium420-site must be kept separate from unet-thesis projects
