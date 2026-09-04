#!/bin/bash
# Hardcoded remap of (lowercase-target → deployed-URL) pairs.
set -e
cd /Users/ever/belgium420-site

# Use unique short keys instead of full paths so bash doesn't try to evaluate them
declare -A MAP=(
  ["k01"]="pounds/41cherries-160-zip.jpeg|https://belgium420.com/inventory/pounds/41Cherries-160-zip.jpeg"
  ["k02"]="pounds/animalmints-650-pound.jpeg|https://belgium420.com/inventory/pounds/AnimalMints-650-pound.jpeg"
  ["k03"]="pounds/applefritterjr-800-pound.jpeg|https://belgium420.com/inventory/pounds/AppleFritterJR-800-pound.jpeg"
  ["k04"]="pounds/apricotruntz-975-pound.jpeg|https://belgium420.com/inventory/pounds/ApricotRuntz-975-pound.jpeg"
  ["k05"]="pounds/candycrusher-950-pound.jpeg|https://belgium420.com/inventory/pounds/CandyCrusher-950-pound.jpeg"
  ["k06"]="pounds/candyfumes-950-pound.jpeg|https://belgium420.com/inventory/pounds/CandyFumes-950-pound.jpeg"
  ["k07"]="pounds/candymediums-925-pound.jpeg|https://belgium420.com/inventory/pounds/CandyMediums-925-pound.jpeg"
  ["k08"]="pounds/hellcatruntz-1200-pounds.jpeg|https://belgium420.com/inventory/pounds/HellcatRuntz-1200-pounds.jpeg"
  ["k09"]="pounds/laconfidential-135-zip.jpeg|https://belgium420.com/inventory/pounds/LAConfidential-135-zip.jpeg"
  ["k10"]="pounds/maritianruntz-375-pound.jpeg|https://belgium420.com/inventory/pounds/MaritianRuntz-375-pound.jpeg"
  ["k11"]="pounds/miraclecandy-800-pound.jpeg|https://belgium420.com/inventory/pounds/MiracleCandy-800-pound.jpeg"
  ["k12"]="pounds/mochiruntz-650-pound.jpeg|https://belgium420.com/inventory/pounds/MochiRuntz-650-pound.jpeg"
  ["k13"]="pounds/privatereserve-135-zip.jpeg|https://belgium420.com/inventory/pounds/PrivateReserve-135-zip.jpeg"
  ["k14"]="pounds/razdaz-925-pound.jpeg|https://belgium420.com/inventory/pounds/RazDaz-925-pound.jpeg"
  ["k15"]="pounds/saintlauruntz-160-zip.jpeg|https://belgium420.com/inventory/pounds/SaintLauRuntz-160-zip.jpeg"
  ["k16"]="pounds/sapphirecookies-400-pound.jpeg|https://belgium420.com/inventory/pounds/SapphireCookies-400-pound.jpeg"
  ["k17"]="pounds/snowbunnies-775-pound.jpeg|https://belgium420.com/inventory/pounds/SnowBunnies-775-pound.jpeg"
  ["k18"]="pounds/strawberryzinger-750-pound.jpeg|https://belgium420.com/inventory/pounds/StrawberryZinger-750-pound.jpeg"
  ["k19"]="pounds/tropicalruntz-800-pound.jpeg|https://belgium420.com/inventory/pounds/TropicalRuntz-800-pound.jpeg"
)

ok=0
fail=0
for key in "${!MAP[@]}"; do
  entry="${MAP[$key]}"
  local="${entry%%|*}"
  url="${entry##*|}"
  out="public/inventory/$local"
  mkdir -p "$(dirname "$out")"
  rm -f "$out"
  code=$(curl -s -o "$out" -w "%{http_code}" "$url")
  if [ "$code" = "200" ] && [ -s "$out" ]; then
    magic=$(file -b "$out" | head -c 4)
    if [ "$magic" = "JPEG" ] || [ "$magic" = "PNG " ]; then
      printf "OK   %s\n" "$local"
      ok=$((ok+1))
      continue
    fi
  fi
  rm -f "$out"
  printf "FAIL %s (code=%s magic='%s')\n" "$local" "$code" "$(file -b "$out" 2>/dev/null | head -c 30)"
  fail=$((fail+1))
done

echo ""
echo "ok=$ok fail=$fail"
