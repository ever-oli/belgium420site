#!/bin/bash
# Sync ALL image paths in index.astro to whatever actually exists in
# public/inventory/ (case-insensitive basename match). Self-heals after
# any past filename chaos.
set -e

ROOT=/Users/ever/belgium420-site
INDEX="$ROOT/src/pages/index.astro"
PUB="$ROOT/public/inventory"

LOOKUP=$(mktemp)
trap "rm -f $LOOKUP" EXIT
while IFS= read -r f; do
    rel="${f#$PUB/}"
    catdir="${rel%%/*}"
    base="$(basename "$f" | tr 'A-Z' 'a-z')"
    echo "$catdir/$base|${rel#*/}" >> "$LOOKUP"
done < <(find "$PUB" -type f)

# Extract every image path from index.astro, find each in the lookup, replace
CHANGED=0
grep -oE "/inventory/[a-z]+/[a-zA-Z0-9_.;' ()-]+\.(jpg|jpeg|png)" "$INDEX" | sort -u | while read -r ref; do
    rel="${ref#/inventory/}"
    catdir="${rel%%/*}"
    base="${rel#*/}"
    key="$catdir/$(echo "$base" | tr 'A-Z' 'a-z')"
    actual=$(awk -F'|' -v k="$key" '$1==k {print $2; exit}' "$LOOKUP")
    if [ -n "$actual" ] && [ "$base" != "$actual" ]; then
        newref="/inventory/$catdir/$actual"
        sed -i '' "s|$ref|$newref|g" "$INDEX"
        printf "%s -> %s\n" "$ref" "$newref"
        CHANGED=$((CHANGED + 1))
    fi
done

echo "Done. $CHANGED paths rewritten."
