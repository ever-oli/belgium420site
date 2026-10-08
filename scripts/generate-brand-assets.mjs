/**
 * Favicon, apple touch icon, and 1200×630 social image.
 * Run when the wordmark changes. Outputs are committed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const anton = path.join(root, 'scripts/fonts/Anton-Regular.ttf');
const grotesk = path.join(root, 'scripts/fonts/SpaceGrotesk-Regular.ttf');

const mark = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#050505"/>
  <rect x="5.5" y="6" width="6" height="20" fill="#050505" stroke="#F5F1E8" stroke-width="0.8"/>
  <rect x="13" y="6" width="6" height="20" fill="#F5C400"/>
  <rect x="20.5" y="6" width="6" height="20" fill="#E31C23"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), mark(32));

async function pngFromSvg(svg, size, dest) {
  const rendered = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  fs.writeFileSync(dest, rendered.render().asPng());
}

await pngFromSvg(mark(32), 32, path.join(publicDir, 'favicon-32.png'));
await pngFromSvg(mark(180), 180, path.join(publicDir, 'apple-touch-icon.png'));

const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#050505"/>
  <rect x="72" y="90" width="68" height="450" fill="#050505" stroke="#F5F1E8" stroke-width="4"/>
  <rect x="156" y="90" width="68" height="450" fill="#F5C400"/>
  <rect x="240" y="90" width="68" height="450" fill="#E31C23"/>
  <text x="360" y="290" font-family="Anton" font-size="128" fill="#F5F1E8">BELGIUM</text>
  <text x="360" y="430" font-family="Anton" font-size="128" fill="#F5C400">420</text>
  <text x="366" y="500" font-family="Space Grotesk" font-size="28" letter-spacing="8" fill="#9A968C">LAB-BACKED HEMP</text>
</svg>`;

const og = new Resvg(ogSvg, {
  fitTo: { mode: 'width', value: 1200 },
  font: {
    fontFiles: [anton, grotesk],
    loadSystemFonts: false,
    defaultFontFamily: 'Anton',
  },
});
const ogPng = og.render().asPng();
fs.mkdirSync(path.join(publicDir, 'og'), { recursive: true });
fs.writeFileSync(path.join(publicDir, 'og/belgium420.png'), ogPng);
const meta = await sharp(ogPng).metadata();
console.log('og', meta.width, meta.height, ogPng.length);
