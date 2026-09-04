#!/bin/bash
echo "literal t-r-u-e check below"
export AUTH_ENABLED=true
echo "AUTH_ENABLED=[$AUTH_ENABLED]"
cd /Users/ever/belgium420-site
rm -rf dist .astro
npm run build 2>&1 | tail -8
