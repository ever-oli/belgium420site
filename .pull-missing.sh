#!/bin/bash
# Pull missing image files from the deployed site.
# Reads relative paths (e.g. "carts/blinkers-carts-25.jpeg") from stdin.
# Saves to public/inventory/<relative path> (already lowercase).
# Uses Python for URL encoding (it handles quotes correctly).

set -e
cd /Users/ever/belgium420-site

while IFS= read -r rel; do
  # Try several capital-letter variants of the basename on the deployed site.
  base="$(basename "$rel")"
  catdir="$(dirname "$rel")"
  parent_low="$(echo "$base" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"      # First letter cap
  parent_full="$(echo "$base" | awk '{ for (i=1; i<=length($0); i++) { c=substr($0,i,1); if (i==1) printf toupper(c); else printf c } print ""; }')"   # All cap first letter (no-op)
  candidates=("$base" "$parent_low")
  # Add PascalCase variants for known compound names
  if [[ "$base" == *-* ]]; then
    for w in $(echo "$base" | tr '-' ' '); do
      candidates+=("$(echo "$w" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')")
    done
  fi
  # Build a unique list
  uniq=($(printf "%s\n" "${candidates[@]}" | sort -u))

  ok=""
  for cand in "${uniq[@]}"; do
    enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe='/-.'))" "$cand")
    url="https://belgium420.com/inventory/$catdir/$enc"
    code=$(curl -s -o "public/inventory/$rel" -w "%{http_code}" "$url")
    if [ "$code" = "200" ]; then
      sz=$(stat -f%z "public/inventory/$rel" 2>/dev/null || echo 0)
      if [ "$sz" -gt 0 ]; then
        # Verify it's actually a JPEG, not an HTML 404 page
        magic=$(file -b "public/inventory/$rel" | head -c 4)
        if [ "$magic" = "JPEG" ]; then
          ok="yes"
          printf "OK   %s (from %s)\n" "$rel" "$cand"
          break
        fi
      fi
    fi
    rm -f "public/inventory/$rel"
  done
  if [ -z "$ok" ]; then
    printf "FAIL %s (tried: %s)\n" "$rel" "${uniq[*]}"
  fi
done
