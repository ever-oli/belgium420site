#!/usr/bin/env python3
"""Deploy belgium420-site via Hostinger MCP HTTP server"""
import requests, json

BASE = "http://localhost:8100"
ARCHIVE = "/Users/ever/belgium420-site/deploy.zip"
DOMAIN = "belgium420.com"

headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
}

# Init
init = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "deploy", "version": "1.0"}
    }
}

resp = requests.post(f"{BASE}/", json=init, headers=headers, timeout=10)
print(f"Init: {resp.status_code}")
session_id = resp.headers.get("mcp-session-id") or "default"
print(f"Session: {session_id}")

# List tools
headers["mcp-session-id"] = session_id
tools_req = {"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
resp = requests.post(f"{BASE}/", json=tools_req, headers=headers, timeout=10)
print(f"Tools: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    tools = [t["name"] for t in data.get("result", {}).get("tools", [])]
    deploy_tools = [t for t in tools if "deployStatic" in t or "StaticWebsite" in t]
    print(f"Deploy tools: {deploy_tools}")

# Call deploy
deploy_req = {
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
        "name": "hosting_deployStaticWebsite",
        "arguments": {
            "domain": DOMAIN,
            "archivePath": ARCHIVE,
            "removeArchive": True
        }
    }
}
print(f"\nDeploying {ARCHIVE} to {DOMAIN}...")
resp = requests.post(f"{BASE}/", json=deploy_req, headers=headers, timeout=300)
print(f"Deploy: {resp.status_code}")
print(resp.text[:500])
