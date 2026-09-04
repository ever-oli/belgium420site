#!/bin/bash
# Rename inventory files with spaces to URL-safe kebab-case.
# Applies to Inventory/ (source), public/inventory/ (deployed), and the
# paths in src/pages/index.astro.
set -e

# Each line: "old|new" (relative to the inventory subfolder, with the subfolder prefix).
declare -a RENAMES=(
  # Carts
  "carts/Dabwoods Liquid Diamond - cart- 25.jpeg|carts/dabwoods-liquid-diamond-cart-25.jpeg"
  "carts/Muha Meds Live Resin-cart- -25.jpeg|carts/muha-meds-live-resin-cart-25.jpeg"
  "carts/Sherb x Doja dual flav 2g - cart- 50.jpeg|carts/sherb-x-doja-dual-flav-2g-cart-50.jpeg"
  "carts/Sherbinskis -cart-25.jpeg|carts/sherbinskis-cart-25.jpeg"
  "carts/Smoothie Bar-carts-25.jpeg|carts/smoothie-bar-carts-25.jpeg"
  # Concentrates
  "concentrates/Icebox QP- concentrates - 500.jpeg|concentrates/icebox-qp-concentrates-500.jpeg"
  "concentrates/Kaws moonrocks pound-concentrates-900.jpeg|concentrates/kaws-moonrocks-pound-concentrates-900.jpeg"
  "concentrates/Persy Snowcaps pound - concentrates-1300.jpeg|concentrates/persy-snowcaps-pound-concentrates-1300.jpeg"
  "concentrates/WM Extracts Live resin sugar pound - concentrates- 1300.jpeg|concentrates/wm-extracts-live-resin-sugar-pound-concentrates-1300.jpeg"
  "concentrates/WM extracts live resin sugar - concentrates -1050.jpeg|concentrates/wm-extracts-live-resin-sugar-concentrates-1050.jpeg"
  "concentrates/WM extracts live resin sugar pound -concentrates-1050.jpeg|concentrates/wm-extracts-live-resin-sugar-pound-concentrates-1050.jpeg"
  # Edibles
  "edibles/Devour 1500mg (2)-20.jpeg|edibles/devour-1500mg-2-20.jpeg"
  "edibles/Devour 1500mg -20.jpeg|edibles/devour-1500mg-20.jpeg"
  "edibles/Devour 500mg nano infused live rosin -20.jpeg|edibles/devour-500mg-nano-infused-live-rosin-20.jpeg"
  "edibles/Misc Gummies 600mg - 10.jpeg|edibles/misc-gummies-600mg-10.jpeg"
  # Pounds (older entries — be careful to match the exact filenames)
  "pounds/BTY Runtz-1200.jpeg|pounds/bty-runtz-1200.jpeg"
  "pounds/Blue Gelato-925.jpeg|pounds/blue-gelato-925.jpeg"
  "pounds/Blue Tomyz -1450.jpeg|pounds/blue-tomyz-1450.jpeg"
  "pounds/Candy Runtz-1100.jpeg|pounds/candy-runtz-1100.jpeg"
  "pounds/Diesel Bomb -pound-550.jpeg|pounds/diesel-bomb-pound-550.jpeg"
  "pounds/Double Up OG -pound- 400.jpg|pounds/double-up-og-pound-400.jpg"
  "pounds/French Laundry-1600.jpeg|pounds/french-laundry-1600.jpeg"
  "pounds/Gelato x Wedding Cake - pound -550.jpeg|pounds/gelato-x-wedding-cake-pound-550.jpeg"
  "pounds/Gia Runtz-1200.jpeg|pounds/gia-runtz-1200.jpeg"
  "pounds/Hood Candy -1325.jpeg|pounds/hood-candy-1325.jpeg"
  "pounds/Nectar Berry-1000.jpeg|pounds/nectar-berry-1000.jpeg"
  "pounds/Percz - 1500jpeg.jpeg|pounds/percz-1500jpeg.jpeg"
  "pounds/Runtz DMC-1350.jpeg|pounds/runtz-dmc-1350.jpeg"
  "pounds/Styrofoam cup - 1800.jpeg|pounds/styrofoam-cup-1800.jpeg"
  "pounds/White Mochi Runtz -1050.jpeg|pounds/white-mochi-runtz-1050.jpeg"
  # PreRolls (note: source dir is capital P, deployed is lowercase)
  "prerolls-source/Blaze Eros 1g-preroll-10.jpg|prerolls/blaze-eros-1g-preroll-10.jpg"
  "prerolls-source/FusionExtract blunt -preroll-15.jpg|prerolls/fusion-extract-blunt-preroll-15.jpg"
  "prerolls-source/HeadyHead 1g -preroll - 15.jpeg|prerolls/heady-head-1g-preroll-15.jpeg"
)

ROOT=/Users/ever/belgium420-site
INDEX="$ROOT/src/pages/index.astro"

# Source has PreRolls (capital P). public/ has prerolls (lowercase p). The product
# entries in index.astro already use "prerolls/".
SRC_PREROLLS="$ROOT/Inventory/PreRolls"
DST_PREROLLS="$ROOT/public/inventory/prerolls"

for entry in "${RENAMES[@]}"; do
  OLD="${entry%%|*}"
  NEW="${entry##*|}"
  if [[ "$OLD" == prerolls-source/* ]]; then
    OLD_PATH="$SRC_PREROLLS/${OLD#prerolls-source/}"
    NEW_PATH="$DST_PREROLLS/${NEW#prerolls/}"
  else
    OLD_PATH="$ROOT/Inventory/$OLD"
    NEW_PATH="$ROOT/public/inventory/$NEW"
    # Mirror in source
    SRC_NEW="$ROOT/Inventory/$NEW"
  fi

  # Rename the source file (Inventory/)
  if [[ "$OLD" != prerolls-source/* ]]; then
    if [ -f "$OLD_PATH" ] && [ ! -f "$SRC_NEW" ]; then
      mv "$OLD_PATH" "$SRC_NEW"
      printf "src:    %s -> %s\n" "$OLD" "$NEW"
    elif [ -f "$SRC_NEW" ]; then
      # already renamed
      : # silent
    elif [ ! -f "$OLD_PATH" ]; then
      printf "MISSING src: %s\n" "$OLD"
    fi
  fi

  # Rename the deployed copy (public/inventory/)
  if [ -f "$NEW_PATH" ]; then
    : # already in place
  elif [ -f "$OLD_PATH" ]; then
    mv "$OLD_PATH" "$NEW_PATH"
    printf "public: %s -> %s\n" "$OLD" "$NEW"
  elif [[ "$OLD" == prerolls-source/* && -f "$SRC_PREROLLS/${OLD#prerolls-source/}" ]]; then
    cp "$SRC_PREROLLS/${OLD#prerolls-source/}" "$NEW_PATH"
    printf "copy:   prerolls-source/ -> %s\n" "$NEW"
  fi

  # Update the index.astro paths
  if grep -qF "/inventory/$OLD" "$INDEX"; then
    sed -i '' "s|/inventory/$OLD|/inventory/$NEW|g" "$INDEX"
    printf "astro:  /inventory/$OLD -> /inventory/$NEW\n"
  fi
done

echo ""
echo "=== Files left with spaces in Inventory/ ==="
find "$ROOT/Inventory" -type f -name "* *" | head -20 || true
echo ""
echo "=== Files left with spaces in public/inventory/ ==="
find "$ROOT/public/inventory" -type f -name "* *" | head -20 || true
