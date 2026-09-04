#!/bin/bash
# receive.sh — Poll for incoming Signal messages
#
# Usage: ./receive.sh
#
# Returns any new messages received by the linked Signal number.

set -euo pipefail

echo "=== Checking for received Signal messages ==="
RESPONSE=$(curl -s "http://localhost:8080/v1/receive")

if [ -z "$RESPONSE" ] || [ "$RESPONSE" = "null" ]; then
  echo "No messages."
  exit 0
fi

# Pretty-print
echo "$RESPONSE" | jq '. | if type == "array" then .[] else . end | {envelope, message: (.data.data.message // "(no message body)")}' 2>/dev/null || echo "$RESPONSE"
