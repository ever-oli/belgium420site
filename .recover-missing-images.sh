#!/bin/bash
# Pull the still-missing image files from the deployed site.
# Each missing reference is in index.astro with capital letters (the deployed
# site still uses those). We lowercase them to match our local convention.

ROOT=/Users/ever/belgium420-site
DIST="$ROOT/dist"

# Build the list of expected lowercase basenames from HTML references
REFS=$(grep -oE "/inventory/[a-z]+/[a-zA-Z0-9_.;'() -]+\.(jpg|jpeg|png)" "$ROOT/src/pages/index.astro" | sort -u)

# For each one that's missing on disk, try fetching the same path with a few
# capital-letter variants from the deployed site.
count_ok=0
count_skip=0
count_fail=0

for ref in $REFS; do
  rel="${ref#/inventory/}"
  catdir="${rel%%/*}"
  base="${rel#*/}"
  target="$ROOT/public/inventory/$rel"

  if [ -f "$target" ]; then
    count_skip=$((count_skip + 1))
    continue
  fi

  mkdir -p "$(dirname "$target")"
  # Try candidate remote paths: original casing, all-caps first letter, fully lowercased, and PascalCase from basename spelling.
  candidates=(
    "$base"
    "$(tr 'a-z' 'A-Z' <<< "${base:0:1}")${base:1}"
    "$(tr 'A-Z' 'a-z' <<< "$base")"
  )
  fetched=""
  for cand in "${candidates[@]}"; do
    enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe='/-.'))" "$cand" 2>/dev/null)
    if [ -z "$enc" ]; then continue; fi
    url="https://belgium420.com/inventory/$catdir/$enc"
    code=$(curl -s -o "$target" -w "%{http_code}" "$url")
    if [ "$code" = "200" ] && [ -s "$target" ]; then
      fetched="$cand"
      break
    else
      rm -f "$target"
    fi
  done

  if [ -n "$fetched" ]; then
    printf "OK   %s\n" "$rel"
    count_ok=$((count_ok + 1))
  else
    printf "FAIL %s\n" "$rel"
    count_fail=$((count_fail + 1))
  fi
done

echo ""
echo "summary: ok=$count_ok skip=$count_skip fail=$count_fail"
