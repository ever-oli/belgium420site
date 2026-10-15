#!/bin/bash
export HOSTINGER_API_TOKEN="$HOSTINGER_API_TOKEN"
exec npx -y hostinger-api-mcp --stdio
