#!/bin/bash
# hostinger-mcp-wrapper.sh — MCP server wrapper that passes through the API token
export HOSTINGER_API_TOKEN="$HOSTINGER_API_TOKEN"
exec npx -y hostinger-api-mcp --stdio
