#!/usr/bin/env python3
"""Deploy belgium420-site to Hostinger via hostinger-api-mcp MCP server"""
import subprocess, json, sys, os

TOKEN = "5C4GcGnSd2BNdF8VVNikUFGCMyyHzTcgzsfXDeWo30c28a1e"
ARCHIVE = "/Users/ever/belgium420-site/deploy.zip"
DOMAIN = "belgium420.com"

# Start MCP server process
proc = subprocess.Popen(
    ["hostinger-api-mcp", "--stdio"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.DEVNULL,
    env={**os.environ, "HOSTINGER_API_TOKEN": TOKEN},
    cwd="/Users/ever/belgium420-site"
)

def send_msg(msg_id, method, params=None):
    msg = {"jsonrpc": "2.0", "id": msg_id, "method": method}
    if params:
        msg["params"] = params
    proc.stdin.write((json.dumps(msg) + "\n").encode())
    proc.stdin.flush()

def read_msg():
    line = proc.stdout.readline()
    if not line:
        return None
    return json.loads(line)

# Initialize
send_msg(1, "initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "deploy-script", "version": "1.0"}
})
resp = read_msg()
print("Init:", resp.get("result", {}).get("serverInfo", {}))

send_msg(2, "initialized")

# List tools to verify
send_msg(3, "tools/list")
resp = read_msg()
tools = resp.get("result", {}).get("tools", [])
names = [t["name"] for t in tools if "static" in t["name"].lower() or "deploy" in t["name"].lower()]
print(f"Deploy tools found: {[n for n in names if 'static' in n.lower() or 'js' in n.lower()]}")

# Call deploy - hosting_deployStaticWebsite
print(f"\nDeploying {ARCHIVE} to {DOMAIN}...")
send_msg(4, "tools/call", {"name": "hosting_deployStaticWebsite", "arguments": {
    "domain": DOMAIN,
    "archivePath": ARCHIVE,
    "removeArchive": True
}})
resp = read_msg()
result = resp.get("result", {})
if "error" in result:
    print("ERROR:", result["error"])
else:
    print("Deploy result:", json.dumps(result, indent=2)[:500])

proc.terminate()
sys.exit(0)
