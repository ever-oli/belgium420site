#!/bin/bash
# Plain sequential curl invocations for each missing file.
set -e
cd /Users/ever/belgium420-site

pull() {
  local out="$1"
  local url="$2"
  mkdir -p "$(dirname "$out")"
  rm -f "$out"
  code=$(curl -s -o "$out" -w "%{http_code}" "$url")
  if [ "$code" = "200" ] && [ -s "$out" ]; then
    magic=$(file -b "$out" | head -c 4)
    if [ "$magic" = "JPEG" ] || [ "$magic" = "PNG " ]; then
      printf "OK   %s\n" "$out"
      return 0
    fi
  fi
  rm -f "$out"
  printf "FAIL %s\n" "$out"
  return 1
}

pull public/inventory/pounds/41cherries-160-zip.jpeg     "https://belgium420.com/inventory/pounds/41Cherries-160-zip.jpeg"
pull public/inventory/pounds/animalmints-650-pound.jpeg  "https://belgium420.com/inventory/pounds/AnimalMints-650-pound.jpeg"
pull public/inventory/pounds/applefritterjr-800-pound.jpeg "https://belgium420.com/inventory/pounds/AppleFritterJR-800-pound.jpeg"
pull public/inventory/pounds/apricotruntz-975-pound.jpeg "https://belgium420.com/inventory/pounds/ApricotRuntz-975-pound.jpeg"
pull public/inventory/pounds/candycrusher-950-pound.jpeg "https://belgium420.com/inventory/pounds/CandyCrusher-950-pound.jpeg"
pull public/inventory/pounds/candyfumes-950-pound.jpeg   "https://belgium420.com/inventory/pounds/CandyFumes-950-pound.jpeg"
pull public/inventory/pounds/candymediums-925-pound.jpeg "https://belgium420.com/inventory/pounds/CandyMediums-925-pound.jpeg"
pull public/inventory/pounds/hellcatruntz-1200-pounds.jpeg "https://belgium420.com/inventory/pounds/HellcatRuntz-1200-pounds.jpeg"
pull public/inventory/pounds/laconfidential-135-zip.jpeg "https://belgium420.com/inventory/pounds/LAConfidential-135-zip.jpeg"
pull public/inventory/pounds/maritianruntz-375-pound.jpeg "https://belgium420.com/inventory/pounds/MaritianRuntz-375-pound.jpeg"
pull public/inventory/pounds/miraclecandy-800-pound.jpeg "https://belgium420.com/inventory/pounds/MiracleCandy-800-pound.jpeg"
pull public/inventory/pounds/mochiruntz-650-pound.jpeg   "https://belgium420.com/inventory/pounds/MochiRuntz-650-pound.jpeg"
pull public/inventory/pounds/privatereserve-135-zip.jpeg "https://belgium420.com/inventory/pounds/PrivateReserve-135-zip.jpeg"
pull public/inventory/pounds/razdaz-925-pound.jpeg        "https://belgium420.com/inventory/pounds/RazDaz-925-pound.jpeg"
pull public/inventory/pounds/saintlauruntz-160-zip.jpeg "https://belgium420.com/inventory/pounds/SaintLauRuntz-160-zip.jpeg"
pull public/inventory/pounds/sapphirecookies-400-pound.jpeg "https://belgium420.com/inventory/pounds/SapphireCookies-400-pound.jpeg"
pull public/inventory/pounds/snowbunnies-775-pound.jpeg  "https://belgium420.com/inventory/pounds/SnowBunnies-775-pound.jpeg"
pull public/inventory/pounds/strawberryzinger-750-pound.jpeg "https://belgium420.com/inventory/pounds/StrawberryZinger-750-pound.jpeg"
pull public/inventory/pounds/tropicalruntz-800-pound.jpeg "https://belgium420.com/inventory/pounds/TropicalRuntz-800-pound.jpeg"
