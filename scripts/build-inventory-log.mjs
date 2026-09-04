#!/usr/bin/env node
/**
 * Build inventory/belgium420-inventory.xlsx from the live products array
 * plus public/inventory photos. Workbook-only; does not change the site.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  inferType,
  inferEffects,
  cultivarKeyForProduct,
  isFlowerFamily,
  isMushroomOnly,
} from '../src/lib/strain-types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASTRO = path.join(ROOT, 'src/pages/index.astro');
const PHOTOS = path.join(ROOT, 'public/inventory');
const OUT_DIR = path.join(ROOT, 'inventory');
const CACHE_PATH = path.join(OUT_DIR, 'leafly-cache.json');
const WEB_MATCHES_PATH = path.join(OUT_DIR, 'web-matches.json');
const XLSX_PATH = path.join(OUT_DIR, 'belgium420-inventory.xlsx');

const CATEGORY_SHEETS = [
  ['flower', 'Flower'],
  ['carts', 'Carts'],
  ['concentrates', 'Concentrates'],
  ['small-sizes', 'Small Sizes'],
  ['pounds', 'Pounds'],
  ['mushrooms', 'Mushrooms'],
  ['edibles', 'Edibles'],
  ['prerolls', 'Pre-Rolls'],
];

const cultivarToLeaflySlug = {
  gg4: 'original-glue',
  runtz: 'runtz',
  gelato: 'gelato',
  'wedding-cake': 'wedding-cake',
  'animal-mints': 'animal-mints',
  'apple-fritter': 'apple-fritter',
  'la-confidential': 'la-confidential',
  headband: 'headband',
  diesel: 'sour-diesel',
  'og-kush': 'og-kush',
  cookies: 'girl-scout-cookies',
  sherbert: 'sunset-sherbert',
  zushi: 'zushi',
  'styrofoam-cup': 'styrofoam-cup',
  'french-laundry': 'french-laundry',
  'black-widow': 'black-widow',
};

const SITE_EFFECTS = new Set([
  'chill', 'creative', 'energy', 'euphoric', 'focus', 'sleep', 'social',
]);

const LEAFLY_EFFECT_MAP = {
  relaxed: 'chill',
  sleepy: 'sleep',
  happy: 'euphoric',
  euphoric: 'euphoric',
  uplifted: 'energy',
  energetic: 'energy',
  focused: 'focus',
  creative: 'creative',
  talkative: 'social',
  giggly: 'social',
  hungry: null,
  tingly: null,
  aroused: null,
};

const GENERIC_STRAIN_NAMES = new Set([
  '', 'cart', 'gummies', 'chocolate', 'pre-roll', 'preroll', 'blunt', 'pound', 'zip',
]);

/** Carts / flavor lines that sell indica AND hybrid AND sativa SKUs. */
const BRAND_LINE_NAME_RE = new RegExp(
  [
    'raw garden',
    'muha meds',
    'muha\\b',
    'sherbinskis cart',
    'whole melts',
    'bodega boyz',
    'boutiq',
    'packman',
    'ace ultra',
    'cizi fuze',
    'high 90s',
    'backpackboyz',
    'backpack boyz',
    'besos cart',
    'buzzbar',
    'dabwoods',
    'blinkers',
    'smoothie bar',
    'sherb x doja',
    'devour',
    'midkidz',
    'misc gummies',
    'fusion extract',
    'favorites',
    'blaze eros',
    'heady head',
    'persy snowcaps',
    'wm extracts',
    'kaws moonrocks',
    'juug',
  ].join('|'),
  'i',
);

const SLUG_ALIASES = {
  'candy-fumes': ['candy-fumez'],
  'black-dahlia': ['black-dhalia', 'black-dahlia'],
  'creme-brulee': ['creme-brulee'],
  'peach-pie': ['peach-pie'],
  '41-cherries': ['41-cherries'],
  gg4: ['original-glue', 'gg4', 'gorilla-glue-4'],
  'blue-tomyz': ['blue-tommyz', 'blue-tomyz'],
  icebox: ['ice-box'],
  lance: ['lantz'],
  'noboof-osrs11': ['rs11', 'rs-11'],
  osrs11: ['rs11', 'rs-11'],
};

function loadProducts() {
  const src = fs.readFileSync(ASTRO, 'utf8');
  const start = src.indexOf('const products = [');
  const end = src.indexOf('\n];\n\nconst effectDefs');
  if (start < 0 || end < 0) throw new Error('Could not find products array in index.astro');
  const code = src.slice(start, end + 2);
  return Function(`${code}\nreturn products;`)();
}

function strainName(p) {
  return String(p.name)
    .replace(/\s*·\s*.*$/, '')
    .replace(/\s+(Pound|Zip|Cart|Gummies|Chocolate|Pre-roll|Blunt)$/i, '')
    .replace(/\s+\d+g.*$/i, '')
    .replace(/\s+\d+mg.*$/i, '')
    .replace(/\s+live rosin.*$/i, '')
    .replace(/\s+live resin.*$/i, '')
    .replace(/\s+nano-infused.*$/i, '')
    .replace(/\s+\(twin pack\)$/i, '')
    .replace(/\s+jr$/i, '')
    .trim();
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isGenericStrainName(cleaned) {
  return GENERIC_STRAIN_NAMES.has(cleaned.toLowerCase());
}

function isBrandLineProduct(p) {
  const n = String(p.name);
  if (BRAND_LINE_NAME_RE.test(n)) return true;
  return BRAND_LINE_NAME_RE.test(strainName(p));
}

function shouldSkipLeafly(p, cleaned) {
  if (isMushroomOnly(p)) return true;
  if (isBrandLineProduct(p)) return true;
  if (isGenericStrainName(cleaned)) return true;
  return false;
}

function loadWebMatches() {
  try {
    return JSON.parse(fs.readFileSync(WEB_MATCHES_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function lookupWeb(map, p, cleaned) {
  const keys = [p.name, p.batch, cleaned, slugify(cleaned)].filter(Boolean);
  for (const k of keys) {
    if (map[k]) return map[k];
  }
  return null;
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');
}

function parseLeaflyHtml(html) {
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => {
      try { return JSON.parse(m[1]); } catch { return null; }
    })
    .filter(Boolean);

  let category = '';
  let effects = [];

  for (const block of jsonLd) {
    const items = Array.isArray(block) ? block : [block];
    for (const item of items) {
      const cat = item.category || item.strainType || item.additionalType || '';
      if (typeof cat === 'string' && /indica|hybrid|sativa/i.test(cat)) {
        category = cat.toLowerCase().includes('indica')
          ? 'indica'
          : cat.toLowerCase().includes('sativa')
            ? 'sativa'
            : 'hybrid';
      }
    }
  }

  const catMatch = html.match(/"category"\s*:\s*"(Indica|Sativa|Hybrid)"/i)
    || html.match(/>(Indica|Sativa|Hybrid)<\/(?:span|div|p|a)/i)
    || html.match(/strainType["']?\s*[:=]\s*["'](indica|sativa|hybrid)/i);
  if (!category && catMatch) {
    category = catMatch[1].toLowerCase();
  }

  const effectBlock = html.match(/"effects"\s*:\s*(\[[^\]]+\])/i)
    || html.match(/"topEffects"\s*:\s*(\[[^\]]+\])/i);
  if (effectBlock) {
    try {
      const raw = JSON.parse(effectBlock[1]);
      effects = raw
        .map((e) => (typeof e === 'string' ? e : e.name || e.effect || ''))
        .filter(Boolean);
    } catch { /* ignore */ }
  }

  if (!effects.length) {
    const names = [...html.matchAll(/data-testid="effect(?:-name)?"[^>]*>([^<]+)/gi)]
      .map((m) => m[1].trim());
    if (names.length) effects = names;
  }

  if (!effects.length) {
    const listed = [...html.matchAll(/\/strains\/lists\/effect\/([a-z-]+)/gi)].map((m) => m[1]);
    if (listed.length) effects = listed;
  }

  const mapped = [];
  const seen = new Set();
  for (const e of effects) {
    const key = String(e).toLowerCase().replace(/[\s_]+/g, '-');
    const mappedKey = LEAFLY_EFFECT_MAP[key] !== undefined ? LEAFLY_EFFECT_MAP[key] : (SITE_EFFECTS.has(key) ? key : null);
    if (mappedKey && !seen.has(mappedKey)) {
      seen.add(mappedKey);
      mapped.push(mappedKey);
    }
  }

  return { category, effectsRaw: effects, effects: mapped };
}

async function fetchLeafly(slug, cache) {
  if (cache[slug]) return cache[slug];
  const url = `https://www.leafly.com/strains/${slug}`;
  const result = { ok: false, url, category: '', effects: [], effectsRaw: [] };
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Belgium420InventoryBot/1.0 (catalog standardization; +https://belgium420.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (res.status === 404) {
      cache[slug] = result;
      return result;
    }
    if (!res.ok) {
      result.error = `HTTP ${res.status}`;
      cache[slug] = result;
      return result;
    }
    const html = await res.text();
    if (/page not found|strain not found/i.test(html) && html.length < 50000) {
      cache[slug] = result;
      return result;
    }
    const parsed = parseLeaflyHtml(html);
    result.ok = Boolean(parsed.category || parsed.effects.length);
    result.category = parsed.category;
    result.effects = parsed.effects;
    result.effectsRaw = parsed.effectsRaw;
    cache[slug] = result;
    return result;
  } catch (err) {
    result.error = String(err.message || err);
    cache[slug] = result;
    return result;
  }
}

function candidateSlugs(p) {
  const slugs = [];
  const key = cultivarKeyForProduct(p);
  if (key && cultivarToLeaflySlug[key]) slugs.push(cultivarToLeaflySlug[key]);
  if (key) slugs.push(key);
  const base = slugify(strainName(p));
  if (base) slugs.push(base);
  for (const extra of SLUG_ALIASES[base] || []) slugs.push(extra);
  const noJr = base.replace(/-jr$/, '');
  if (noJr && noJr !== base) {
    slugs.push(noJr);
    for (const extra of SLUG_ALIASES[noJr] || []) slugs.push(extra);
  }
  return [...new Set(slugs.filter(Boolean))];
}

function walkPhotos(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkPhotos(full, acc);
    else if (/\.(jpe?g|png|webp|gif)$/i.test(ent.name)) {
      acc.push('/' + path.relative(path.join(ROOT, 'public'), full).split(path.sep).join('/'));
    }
  }
  return acc;
}

function formatPrice(p) {
  if (Array.isArray(p.variants) && p.variants.length) {
    const prices = p.variants.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `$${min.toFixed(2)}`;
    return `$${min.toFixed(2)}–$${max.toFixed(2)}`;
  }
  return p.price || '';
}

function matchFill(match) {
  if (match === 'unmatched') return 'FFF4C7C3';
  if (match === 'leafly') return 'FFC6EFCE';
  if (match === 'site-map') return 'FFFFEB9C';
  if (match === 'web-search') return 'FFBDD7EE';
  if (match === 'brand-line') return 'FFF8CBAD';
  if (match === 'n/a') return 'FFD9D9D9';
  return null;
}

async function main() {
  const ExcelJS = (await import('exceljs')).default;
  const products = loadProducts();
  const photos = walkPhotos(PHOTOS);
  const catalogImgs = new Set(products.map((p) => p.img).filter(Boolean));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cache = loadCache();
  const webMatches = loadWebMatches();

  const rows = [];
  for (const p of products) {
    const shopType = inferType(p) || '';
    const siteEffects = inferEffects(p);
    const cats = p.categories || [];
    const cleaned = strainName(p);
    const web = lookupWeb(webMatches, p, cleaned);

    let leaflyUrl = '';
    let leaflyType = '';
    let leaflyEffects = [];
    let match = 'unmatched';
    let notes = '';
    let confidence = '';

    if (isMushroomOnly(p)) {
      match = 'n/a';
      notes = 'Psilocybin product — indica/hybrid/sativa does not apply.';
      confidence = 'high';
    } else if (isBrandLineProduct(p)) {
      match = 'brand-line';
      notes = 'Brand/flavor line — Type filter: Branded (indica, hybrid, or sativa by flavor).';
      confidence = 'high';
    } else if (!shouldSkipLeafly(p, cleaned)) {
      const slugs = candidateSlugs(p);
      for (const slug of slugs) {
        const hit = await fetchLeafly(slug, cache);
        await new Promise((r) => setTimeout(r, 80));
        if (hit.ok) {
          leaflyUrl = hit.url;
          leaflyType = hit.category || '';
          leaflyEffects = hit.effects || [];
          match = 'leafly';
          confidence = 'high';
          break;
        }
      }
    }

    if (web) {
      if (match === 'unmatched' && web.match && web.match !== 'unmatched') {
        match = web.match;
      }
      if (match === 'n/a' || match === 'brand-line') {
        if (web.notes) notes = web.notes;
        if (web.confidence) confidence = web.confidence;
        if (!leaflyUrl && web.url) leaflyUrl = web.url;
      } else if (match !== 'leafly') {
        if (!leaflyUrl && web.url) leaflyUrl = web.url;
        if (!leaflyType && web.type) leaflyType = web.type;
        if (!leaflyEffects.length && Array.isArray(web.effects)) leaflyEffects = web.effects;
        if (web.notes) notes = web.notes;
        if (web.confidence) confidence = web.confidence || confidence || 'medium';
      } else if (!notes && web.notes) {
        notes = web.notes;
      }
    }

    if (match === 'unmatched' && shopType && shopType !== 'branded') {
      match = 'site-map';
      confidence = 'high';
      notes = shopType === 'sativa'
        ? 'Owner: sativa (Strawberry Zinger and Strawberry Candy).'
        : 'Owner: indica-hybrid.';
    }

    const resolvedType = match === 'n/a' ? '' : shopType;
    const resolvedEffects = siteEffects.length
      ? siteEffects
      : (leaflyEffects.length ? leaflyEffects : ((web && web.effects) || []));

    if (!confidence && match === 'unmatched') confidence = 'low';

    const photoExists = p.img ? fs.existsSync(path.join(ROOT, 'public', p.img.replace(/^\//, ''))) : false;

    rows.push({
      batch: p.batch || '',
      name: p.name,
      price: formatPrice(p),
      categories: cats.join(', '),
      categoryIds: cats,
      productLabel: p.type || '',
      type: resolvedType,
      effects: resolvedEffects.join(', '),
      leaflyUrl,
      leaflyType,
      leaflyEffects: leaflyEffects.join(', '),
      match,
      confidence,
      notes,
      image: p.img || '',
      photoExists: photoExists ? 'yes' : 'no',
      inquiryOnly: p.inquiryOnly ? 'yes' : '',
    });
  }

  saveCache(cache);

  const withType = rows.filter((r) => r.type).length;
  const withEffects = rows.filter((r) => r.effects).length;
  const leaflyHits = rows.filter((r) => r.match === 'leafly').length;
  const siteMap = rows.filter((r) => r.match === 'site-map').length;
  const webSearch = rows.filter((r) => r.match === 'web-search').length;
  const brandLine = rows.filter((r) => r.match === 'brand-line').length;
  const naCount = rows.filter((r) => r.match === 'n/a').length;
  const unmatched = rows.filter((r) => r.match === 'unmatched').length;
  const indica = rows.filter((r) => r.type === 'indica').length;
  const hybrid = rows.filter((r) => r.type === 'hybrid').length;
  const sativa = rows.filter((r) => r.type === 'sativa').length;
  const branded = rows.filter((r) => r.type === 'branded').length;
  const typeGap = rows.length - withType;
  const unmatchedNames = rows.filter((r) => r.match === 'unmatched').map((r) => r.name);

  const photoRows = photos.map((img) => ({
    image: img,
    inCatalog: catalogImgs.has(img) ? 'yes' : 'orphan',
    usedBy: products.filter((p) => p.img === img).map((p) => p.name).join('; ') || '',
  }));
  for (const p of products) {
    if (p.img && !photos.includes(p.img)) {
      photoRows.push({ image: p.img, inCatalog: 'missing file', usedBy: p.name });
    }
  }

  const headers = [
    'Batch', 'Name', 'Price', 'Categories', 'Product label',
    'Type', 'Effects', 'Leafly URL', 'Leafly type', 'Leafly effects',
    'Match status', 'Confidence', 'Notes', 'Image path', 'Photo on disk', 'Inquire only',
  ];

  function toValues(r) {
    return [
      r.batch, r.name, r.price, r.categories, r.productLabel,
      r.type, r.effects, r.leaflyUrl, r.leaflyType, r.leaflyEffects,
      r.match, r.confidence, r.notes, r.image, r.photoExists, r.inquiryOnly,
    ];
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Belgium420';
  wb.created = new Date();

  const yellow = 'FFF5C400';
  const black = 'FF050505';
  const red = 'FFE31C23';

  function styleSheet(ws, rowCount) {
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
    ws.getRow(1).font = { bold: true, color: { argb: black }, name: 'Calibri', size: 11 };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellow } };
    ws.getRow(1).alignment = { vertical: 'middle', wrapText: true };
    ws.getRow(1).height = 22;
    const widths = [18, 32, 16, 24, 32, 12, 28, 42, 14, 28, 14, 12, 48, 48, 14, 14];
    widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    for (let i = 2; i <= rowCount + 1; i++) {
      ws.getRow(i).alignment = { vertical: 'top', wrapText: true };
    }
  }

  const summary = wb.addWorksheet('Summary');
  summary.getCell('A1').value = 'Belgium420 inventory log';
  summary.getCell('A1').font = { bold: true, size: 16, color: { argb: yellow } };
  summary.getCell('A2').value = 'Catalog snapshot from src/pages/index.astro. Type chips: Indica / Hybrid / Sativa / Branded. Mushrooms have no cannabis type.';
  summary.getCell('A2').alignment = { wrapText: true };
  summary.mergeCells('A2:D2');
  summary.getRow(2).height = 36;

  const kpis = [
    ['SKUs', rows.length],
    ['With Type (log)', withType],
    ['With Effects (log)', withEffects],
    ['No Type (gap)', typeGap],
    ['Indica (log)', indica],
    ['Hybrid (log)', hybrid],
    ['Sativa (log)', sativa],
    ['Branded (log)', branded],
    ['Leafly match', leaflyHits],
    ['Site-map', siteMap],
    ['Web-search', webSearch],
    ['Brand-line', brandLine],
    ['n/a', naCount],
    ['Unmatched', unmatched],
    ['Photo files', photos.length],
  ];
  summary.getCell('A4').value = 'Metric';
  summary.getCell('B4').value = 'Count';
  summary.getRow(4).font = { bold: true };
  summary.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellow } };
  kpis.forEach((row, i) => {
    summary.getCell(`A${5 + i}`).value = row[0];
    summary.getCell(`B${5 + i}`).value = row[1];
  });
  summary.getColumn(1).width = 22;
  summary.getColumn(2).width = 12;
  summary.getCell('A21').value = 'Live Type chips: All ' + rows.length
    + ' / Indica ' + indica + ' / Hybrid ' + hybrid + ' / Sativa ' + sativa
    + ' / Branded ' + branded + '. Gap = ' + typeGap + ' (mushrooms only).';
  summary.mergeCells('A21:D21');
  summary.getCell('A21').alignment = { wrapText: true };
  summary.getRow(21).height = 32;
  summary.getCell('A23').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: black } };
  summary.getCell('B23').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellow } };
  summary.getCell('C23').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: red } };

  function addDataSheet(name, data) {
    const ws = wb.addWorksheet(name);
    ws.addRow(headers);
    data.forEach((r) => ws.addRow(toValues(r)));
    styleSheet(ws, data.length);
    data.forEach((r, i) => {
      const cell = ws.getCell(i + 2, 8);
      if (r.leaflyUrl) {
        cell.value = { text: r.leaflyUrl, hyperlink: r.leaflyUrl };
        cell.font = { color: { argb: 'FF1155CC' }, underline: true };
      }
      const matchCell = ws.getCell(i + 2, 11);
      const fill = matchFill(r.match);
      if (fill) {
        matchCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      }
    });
    return ws;
  }

  addDataSheet('All', rows);
  for (const [id, label] of CATEGORY_SHEETS) {
    addDataSheet(label, rows.filter((r) => r.categoryIds.includes(id)));
  }

  const needs = rows.filter((r) => (
    r.match === 'unmatched'
    || (!r.type && r.match !== 'n/a' && r.match !== 'brand-line')
    || r.confidence === 'low'
  ));
  addDataSheet('Needs review', needs);

  const photosSheet = wb.addWorksheet('Photos');
  photosSheet.addRow(['Image path', 'Status', 'Used by']);
  photoRows.forEach((r) => photosSheet.addRow([r.image, r.inCatalog, r.usedBy]));
  photosSheet.views = [{ state: 'frozen', ySplit: 1 }];
  photosSheet.autoFilter = { from: 'A1', to: 'C1' };
  photosSheet.getRow(1).font = { bold: true, color: { argb: black } };
  photosSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellow } };
  photosSheet.getColumn(1).width = 64;
  photosSheet.getColumn(2).width = 16;
  photosSheet.getColumn(3).width = 48;
  photoRows.forEach((r, i) => {
    if (r.inCatalog !== 'yes') {
      photosSheet.getCell(i + 2, 2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: r.inCatalog === 'orphan' ? 'FFFFEB9C' : 'FFF4C7C3' },
      };
    }
  });

  await wb.xlsx.writeFile(XLSX_PATH);

  const report = {
    skus: rows.length,
    withType,
    withEffects,
    typeGap,
    indica,
    hybrid,
    sativa,
    branded,
    leaflyHits,
    siteMap,
    webSearch,
    brandLine,
    na: naCount,
    unmatched,
    unmatchedNames,
    photos: photos.length,
    orphans: photoRows.filter((r) => r.inCatalog === 'orphan').length,
    missing: photoRows.filter((r) => r.inCatalog === 'missing file').length,
    xlsx: XLSX_PATH,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'build-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
