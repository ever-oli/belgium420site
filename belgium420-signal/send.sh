#!/bin/bash
# send.sh — Send a Signal message
#
# Usage:
#   ./send.sh "+15551234567" "your message"          # single recipient
#   ./send.sh "+15551234567" "message" "+19998887777" # multiple recipients
#
# The sender number is auto-detected from the container's registration.

set -euo pipefail

RECIPIENTS=()
MESSAGE=""

# Parse args: phone numbers start with +, rest is message
for arg in "$@"; do
  if [[ "$arg" == +* ]]; then
    RECIPIENTS+=("$arg")
  else
    MESSAGE="$arg"
  fi
done

if [ ${#RECIPIENTS[@]} -eq 0 ] || [ -z "$MESSAGE" ]; then
  echo "Usage: $0 +15551234567 \"your message here\""
  exit 1
fi

# Build recipients JSON array
RECIPIENTS_JSON=$(printf '%s\n' "${RECIPIENTS[@]}" | jq -R . | jq -s .)

echo "=== Sending Signal message ==="
for r in "${RECIPIENTS[@]}"; do echo "  → $r"; done
echo "  Message: $MESSAGE"
echo ""

RESPONSE=$(curl -s -X POST "http://localhost:9090/v2/send" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"$MESSAGE\", \"numbers\": $(echo "$RECIPIENTS_JSON" | tr '\n' ' ')}")

echo "Response: $RESPONSE"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
