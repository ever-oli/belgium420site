#!/bin/bash
# link-device.sh — Generate QR code link to register your phone number as a secondary device

set -euo pipefail

echo "=== Signal CLI Registration — Link as Secondary Device ==="
echo "Your phone number: +1 956 222 4814 (+19562224814)"
echo ""
echo "1. Open this URL in your browser (desktop, not phone):"
echo "   http://localhost:9090/v1/qrcodelink?device_name=hermes-belgium420"
echo ""
echo "   OR visit http://localhost:9090 and navigate to /v1/qrcodelink"
echo ""
echo "2. On your PHONE:"
echo "   Signal → Settings → Linked Devices → tap '+' → Scan the QR code"
echo ""
echo "3. After scanning, wait ~10s and check registration:"
echo "   ./check-registration.sh"
echo ""
echo "4. Full setup for Hermes:"
echo "   Add to config.yaml:"
echo "   platforms:"
echo "     signal:"
echo "       enabled: true"
echo "       signal_http_url: \"http://localhost:9090\""
echo "       signal_account: \"+19562224814\""
echo "       allowed_users: \"+19562224814\""
echo ""
echo "   Then restart: hermes restart"
