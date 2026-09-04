#!/bin/bash
# Sync index.astro image paths to whatever actually exists in public/inventory/.
# For each /inventory/<cat>/<filename> referenced in the HTML, if that exact
# file is missing, look for a near-match (same basename, different extension OR
# nearby kebab variant) and update the reference.
set -e

ROOT=/Users/ever/belgium420-site
INDEX="$ROOT/src/pages/index.astro"

# Extract distinct image paths from index.astro
REFS=$(grep -oE "/inventory/[a-z]+/[a-zA-Z0-9_.;' -]+\.(jpg|jpeg|png)" "$INDEX" | sort -u)

for ref in $REFS; do
    # Strip /inventory/ prefix
    rel="${ref#/inventory/}"
    catdir="${rel%%/*}"
    filename="${rel#*/}"
    fspath="$ROOT/public/inventory/$catdir/$filename"

    if [ -f "$fspath" ]; then
        continue
    fi

    # Try swapping .jpg <-> .jpeg
    for ext in jpg jpeg png JPG JPEG; do
        candidate="${filename%.*}.$ext"
        if [ -f "$ROOT/public/inventory/$catdir/$candidate" ]; then
            newref="/inventory/$catdir/$candidate"
            sed -i '' "s|$ref|$newref|g" "$INDEX"
            printf "EXT FIX: %s -> %s\n" "$ref" "$newref"
            continue 2
        fi
    done

    # Try matching case-insensitively
    for f in "$ROOT/public/inventory/$catdir/"*; do
        if [ -f "$f" ] && [ "$(basename "$f" | tr 'A-Z' 'a-z')" = "$(echo "$filename" | tr 'A-Z' 'a-z')" ]; then
            newname=$(basename "$f")
            newref="/inventory/$catdir/$newname"
            sed -i '' "s|$ref|$newref|g" "$INDEX"
            printf "CASE FIX: %s -> %s\n" "$ref" "$newref"
            continue 2
        fi
    done

    printf "STILL MISSING: %s\n" "$ref"
done
