#!/usr/bin/env node
// Lowercase all filenames under public/inventory/ using node's fs which
// sidesteps the bash/HFS+ case-insensitive collision problem.
const fs = require("fs");
const path = require("path");

const ROOT = "/Users/ever/belgium420-site/public/inventory";

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let renamed = 0;
for (const p of walk(ROOT)) {
  const dir = path.dirname(p);
  const base = path.basename(p);
  const lower = base.toLowerCase();
  if (base !== lower && !fs.existsSync(path.join(dir, lower))) {
    fs.renameSync(p, path.join(dir, lower));
    renamed++;
  } else if (base !== lower && fs.existsSync(path.join(dir, lower))) {
    // Target already exists from previous lowercase pass — delete this capital-letter dup.
    fs.unlinkSync(p);
    renamed++;
  }
}
console.log(`Renamed/removed: ${renamed}`);
