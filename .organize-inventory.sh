#!/bin/bash
# Organize the new loose Inventory files into proper subfolders.
# Idempotent — safe to re-run (it skips files that don't exist anymore).
set -e
cd /Users/ever/belgium420-site/Inventory

mkdir -p PreRolls "House Party" _internal

# -------- POUNDS (24-hour / bulk flower priced $400+) --------
# Priced in $/pound for bulk flower
P_POUND=(
  "Diesel Bomb -pound-550.jpeg"
  "Double Up OG -pound- 400.jpg"
  "Gelato x Wedding Cake - pound -550.jpeg"
  "HellcatRuntz-1200-pounds.jpeg"
  "Sherbanger-950-pound.jpeg"
  "RazDaz-925-pound.jpeg"
  "CandyFumes-950-pound.jpeg"
  "CandyCrusher-950-pound.jpeg"
  "ApricotRuntz-975-pound.jpeg"
  "CandyMediums-925-pound.jpeg"
  "TropicalRuntz-800-pound.jpeg"
  "MiracleCandy-800-pound.jpeg"
  "SnowBunnies-775-pound.jpeg"
  "S'mores-750-pound.jpeg"
  "AppleFritterJR-800-pound.jpeg"
  "StrawberryZinger-750-pound.jpeg"
  "MochiRuntz-650-pound.jpeg"
  "AnimalMints-650-pound.jpeg"
  "MaritianRuntz-375-pound.jpeg"
  "SapphireCookies-400-pound.jpeg"
)

# Zips (smaller breakdown, ~28g) — keeping in Pounds since flower's there
P_ZIP=(
  "SaintLauRuntz-160-zip.jpeg"
  "Lance-160-zip.jpeg"
  "41Cherries-160-zip.jpeg"
  "LAConfidential-135-zip.jpeg"
  "PrivateReserve-135-zip.jpeg"
  "Sherbinski-110-zip.jpeg"
  "Belgium420-3.5g;30-zip;220-flower.jpg"
)

# -------- CARTS --------
P_CART=(
  "Sherbinskis -cart-25.jpeg"
  "Backpackboyz-cart-25.jpeg"
  "Besos-cart-25.jpeg"
  "Buzzbar-cart-25.jpeg"
  "Muha Meds Live Resin-cart- -25.jpeg"
  "Dabwoods Liquid Diamond - cart- 25.jpeg"
  "Blinkers-carts-25.jpeg"
  "Smoothie Bar-carts-25.jpeg"
  "Sherb x Doja dual flav 2g - cart- 50.jpeg"
)

# -------- CONCENTRATES --------
P_CONC=(
  "Persy Snowcaps pound - concentrates-1300.jpeg"
  "WM Extracts Live resin sugar pound - concentrates- 1300.jpeg"
  "Kaws moonrocks pound-concentrates-900.jpeg"
  "WM extracts live resin sugar - concentrates -1050.jpeg"
  "WM extracts live resin sugar pound -concentrates-1050.jpeg"
  "Icebox QP- concentrates - 500.jpeg"
  # Skip duplicates (same file sizes as Whole Melt originals):
  #   "WM Extracts Live Resin Havana Edition pound-concentrates-1200.jpeg" — dup of Wholemelt Havana Edition
  #   "WM extracts caviar sugar pound- concentrates-1200.jpeg"         — dup of Whole Melt Caviar Edition
  #   "WM Extracts Live Resin Sugar pound-concentrates - 1050.jpeg"     — dup of one of the 1050s
)

# -------- EDIBLES --------
P_ED=(
  "Misc Gummies 600mg - 10.jpeg"
  "Devour 1500mg (2)-20.jpeg"
  "Devour 1500mg -20.jpeg"
  "Devour 500mg nano infused live rosin -20.jpeg"
)

# -------- PRE-ROLLS (NEW category) --------
P_PRE=(
  "FusionExtract blunt -preroll-15.jpg"
  "Blaze Eros 1g-preroll-10.jpg"
  "HeadyHead 1g -preroll - 15.jpeg"
)

# -------- HOUSE PARTY ONLY (not for public sale) --------
# These are marked "hp:p only" in the filename — moving to _internal and skipping from site.
P_HP=(
  "Noboof BlackWidow - hp:p only.jpg"
  "Noboof OSRS11 -hp:p p only.jpg"
  "Noboof Headband-hp:p only.jpg"
)

# -------- KEEP AT ROOT: special packs (per your prior instruction) --------
# "Whole Melt Caviar Edition - 1150.jpeg"
# "Wholemelt Havana Edition -1150.jpeg"
# These stay at the Inventory root and are NOT in the live shop (no "special" category yet).

move() {
  local src="$1" dst="$2"
  if [ -f "$src" ]; then
    mv "$src" "$dst"
    printf "  %s -> %s/\n" "$(basename "$src")" "$2"
  fi
}

echo "=== POUNDS ==="
for f in "${P_POUND[@]}"; do move "$f" "Pounds"; done
for f in "${P_ZIP[@]}";    do move "$f" "Pounds"; done

echo "=== CARTS ==="
for f in "${P_CART[@]}"; do move "$f" "Carts"; done

echo "=== CONCENTRATES ==="
for f in "${P_CONC[@]}"; do move "$f" "Concentrates"; done

echo "=== EDIBLES ==="
for f in "${P_ED[@]}"; do move "$f" "Edibles"; done

echo "=== PRE-ROLLS (new) ==="
for f in "${P_PRE[@]}"; do move "$f" "PreRolls"; done

echo "=== HOUSE PARTY (internal only, not on site) ==="
for f in "${P_HP[@]}"; do move "$f" "_internal"; done

echo "=== STAYING AT ROOT (special packs, per your earlier instruction) ==="
ls -1 | grep -iE 'havana|caviar|whole melt' || true

echo ""
echo "=== Inventory root after organize ==="
ls -la | grep -v '^total\|^\.$\|^\.\.\|^d' | awk '{print $NF}' | grep -v '^$' | sort
