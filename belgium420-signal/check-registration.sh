#!/bin/bash
# check-registration.sh — Check if your Signal number is linked

NUMBER="${1:-+19562224814}"

echo "=== Registration check for $NUMBER ==="
RESPONSE=$(curl -s "http://localhost:9090/v1/lookup/$NUMBER" 2>/dev/null || true)

if echo "$RESPONSE" | grep -q '"name"'; then
  echo "✓ REGISTERED — your Signal number is linked!"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
else
  echo "✗ Not registered yet."
  echo "Response: $RESPONSE"
  echo ""
  echo "To register, run: ./link-device.sh"
fi
