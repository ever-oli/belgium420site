/**
 * Build-time product photos.
 * Reads the img paths in src/pages/index.astro and writes 400w/800w
 * WebP and AVIF derivatives under public/opt/. Sources stay put.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const astroPath = path.join(root, 'src/pages/index.astro');
const publicDir = path.join(root, 'public');
const outRoot = path.join(publicDir, 'opt');
const manifestPath = path.join(root, 'src/data/image-manifest.json');
const WIDTHS = [400, 800];

const src = fs.readFileSync(astroPath, 'utf8');
const imgs = [...src.matchAll(/img:\s*'([^']+)'/g)].map((m) => m[1]);
const unique = [...new Set(imgs)];

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.mkdirSync(outRoot, { recursive: true });

const manifest = {};
let sourceBytes = 0;
let outputBytes = 0;
let written = 0;

for (const urlPath of unique) {
  const rel = urlPath.replace(/^\//, '');
  const input = path.join(publicDir, rel);
  if (!fs.existsSync(input)) {
    console.warn('missing', urlPath);
    continue;
  }
  sourceBytes += fs.statSync(input).size;
  const parsed = path.parse(rel);
  const base = path.join(outRoot, parsed.dir, parsed.name);
  fs.mkdirSync(path.dirname(base), { recursive: true });

  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch (err) {
    console.warn('skip', urlPath, err.message);
    continue;
  }
  const intrinsic = meta.width || 800;
  const used = intrinsic < WIDTHS[0] ? [intrinsic] : WIDTHS.filter((w) => w <= intrinsic);
  const finalWidths = used.length ? used : [intrinsic];

  const variants = [];
  for (const width of finalWidths) {
    for (const format of ['webp', 'avif']) {
      const dest = `${base}-${width}.${format}`;
      const destUrl = '/' + path.relative(publicDir, dest).split(path.sep).join('/');
      const fresh = fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(input).mtimeMs;
      if (!fresh) {
        let pipeline = sharp(input).rotate().resize({ width, withoutEnlargement: true });
        pipeline = format === 'webp'
          ? pipeline.webp({ quality: 70 })
          : pipeline.avif({ quality: 45, effort: 4 });
        await pipeline.toFile(dest);
        written += 1;
      }
      outputBytes += fs.statSync(dest).size;
      const info = await sharp(dest).metadata();
      variants.push({ format, width: info.width, height: info.height, url: destUrl });
    }
  }

  const webps = variants.filter((v) => v.format === 'webp');
  const avifs = variants.filter((v) => v.format === 'avif');
  const largest = webps[webps.length - 1] || variants[variants.length - 1];
  const thumb = webps[0] || largest;
  manifest[urlPath] = {
    src: largest.url,
    width: largest.width,
    height: largest.height,
    srcset: webps.map((v) => `${v.url} ${v.width}w`).join(', '),
    avif: avifs.map((v) => `${v.url} ${v.width}w`).join(', '),
    thumb: thumb.url,
  };
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({
  images: unique.length,
  filesWritten: written,
  sourceBytes,
  outputBytes,
  manifest: manifestPath,
}, null, 2));
