#!/bin/bash
set -e

ROOT=/Users/ever/belgium420-site
INDEX="$ROOT/src/pages/index.astro"

REFS=$(grep -oE "/inventory/[a-z]+/[a-zA-Z0-9_.;' -]+\.(jpg|jpeg|png)" "$INDEX" | sort -u)

for ref in $REFS; do
    rel="${ref#/inventory/}"
    catdir="${rel%%/*}"
    filename="${rel#*/}"
    fspath="$ROOT/public/inventory/$catdir/$filename"

    if [ -f "$fspath" ]; then
        continue
    fi

    for ext in jpg jpeg png JPG JPEG; do
        candidate="${filename%.*}.$ext"
        if [ -f "$ROOT/public/inventory/$catdir/$candidate" ]; then
            newref="/inventory/$catdir/$candidate"
            sed -i '' "s|$ref|$newref|g" "$INDEX"
            printf "EXT FIX: %s -> %s\n" "$ref" "$newref"
            continue 2
        fi
    done

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
