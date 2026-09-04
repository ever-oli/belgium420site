const fs = require("fs");
const path = require("path");

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/\.jpg$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    + ".jpg";
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const renames = [];
for (const root of [
  "/Users/ever/belgium420-site/Inventory/_internal",
  "/Users/ever/belgium420-site/public/inventory/_internal",
]) {
  for (const f of walk(root)) {
    const base = path.basename(f);
    const target = slugify(base);
    if (target !== base) {
      const dir = path.dirname(f);
      const tgt = path.join(dir, target);
      if (!fs.existsSync(tgt)) {
        fs.renameSync(f, tgt);
        renames.push(`${f} -> ${tgt}`);
      } else {
        fs.unlinkSync(f);
        renames.push(`${f} (dup, removed)`);
      }
    }
  }
}
console.log(renames.join("\n") || "no renames");
