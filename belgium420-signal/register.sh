#!/bin/bash
# register.sh — Link a Signal phone number as a secondary device
#
# This registers the container as a SECONDARY device linked to your
# existing Signal phone number. Open the QR code URL in your browser,
# then scan it with Signal on your phone (Settings → Linked Devices → +).
#
# Usage: ./register.sh <your-phone-number-in-intl-format>
#   e.g. ./register.sh +15551234567

set -euo pipefail
NUMBER="${1:-}"

if [ -z "$NUMBER" ]; then
  echo "Usage: $0 +15551234567"
  echo "  (your phone number in international format, e.g. +15551234567)"
  exit 1
fi

echo "=== Signal registration (link as secondary device) ==="
echo "Phone number: $NUMBER"
echo ""
echo "Opening QR code URL — scan with your phone:"
echo "  http://localhost:9090/v1/qrcodelink?device_name=belgium420-signal"
echo ""
echo "On your phone: Signal → Settings → Linked Devices → tap + → Scan QR"
echo ""
echo "Polling for registration status (Ctrl+C to cancel)..."

# Poll until registered
for i in $(seq 1 30); do
  STATUS=$(curl -s "http://localhost:9090/v1/lookup/$NUMBER" 2>/dev/null || true)
  if echo "$STATUS" | grep -q '"name"'; then
    echo "✓ Registered! Number is linked."
    echo "$STATUS"
    exit 0
  fi
  echo "  Attempt $i/30 — not registered yet..."
  sleep 5
done

echo ""
echo "Timed out. Make sure you scanned the QR code."
echo "Check logs: docker logs signal-cli-rest-api"
echo ""
echo "=== Current registration status ==="
curl -s "http://localhost:9090/v1/about" 2>&1
exit 1
