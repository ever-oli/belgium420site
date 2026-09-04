#!/usr/bin/env node
// Lowercase filenames under Inventory/{Carts,Concentrates,Edibles,Pounds,PreRolls}/
// Skips Mushrooms, special packs, videos, _internal (we don't touch those).
const fs = require("fs");
const path = require("path");

const ROOT = "/Users/ever/belgium420-site/Inventory";
const DIRS = ["Carts", "Concentrates", "Edibles", "Pounds", "PreRolls"];

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

let renamed = 0;
for (const d of DIRS) {
  const dir = path.join(ROOT, d);
  if (!fs.existsSync(dir)) continue;
  for (const p of walk(dir)) {
    const dir2 = path.dirname(p);
    const base = path.basename(p);
    const lower = base.toLowerCase();
    if (base !== lower) {
      const target = path.join(dir2, lower);
      if (!fs.existsSync(target)) {
        fs.renameSync(p, target);
        renamed++;
      } else {
        fs.unlinkSync(p);
        renamed++;
      }
    }
  }
}
console.log(`Inventory renamed/removed: ${renamed}`);
