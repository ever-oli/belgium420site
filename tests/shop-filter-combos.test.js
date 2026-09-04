/**
 * Exhaustive shop filter combos.
 *
 * Category × Effect × Type can stack to an empty grid. This test walks every
 * combination against the live catalog, records why blanks happen, and marks
 * which ones have a tagging/UX avenue vs which are empty by design.
 *
 * Run: npm test
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  inferEffects,
  inferType,
  isFlowerFamily,
  isMushroomOnly,
  typeDefs,
} from '../src/lib/strain-types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASTRO = path.join(ROOT, 'src/pages/index.astro');
const WEB_MATCHES = path.join(ROOT, 'Inventory/web-matches.json');

const NON_FLOWER_CATS = new Set(['carts', 'edibles', 'mushrooms', 'prerolls', 'concentrates']);

function loadAstro() {
  return fs.readFileSync(ASTRO, 'utf8');
}

function extractConstArray(src, name) {
  const start = src.indexOf(`const ${name} = [`);
  if (start < 0) throw new Error(`Could not find const ${name}`);
  let depth = 0;
  let i = src.indexOf('[', start);
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) {
        const code = src.slice(src.indexOf('[', start), i + 1);
        return Function(`return ${code}`)();
      }
    }
  }
  throw new Error(`Unclosed array for ${name}`);
}

function loadWebMatches() {
  try {
    return JSON.parse(fs.readFileSync(WEB_MATCHES, 'utf8'));
  } catch {
    return {};
  }
}

function extraEffectsFromWeb(p, web) {
  const keys = [p.name, p.batch].filter(Boolean);
  for (const k of keys) {
    const hit = web[k];
    if (hit && Array.isArray(hit.effects) && hit.effects.length) return hit.effects;
  }
  return [];
}

function loadCatalog() {
  const src = loadAstro();
  const products = extractConstArray(src, 'products');
  const categoryDefs = extractConstArray(src, 'categoryDefs');
  const effectDefs = extractConstArray(src, 'effectDefs');
  const web = loadWebMatches();

  const items = products.map((p) => {
    const shopEffects = inferEffects(p);
    const extra = extraEffectsFromWeb(p, web);
    return {
      name: p.name,
      categories: p.categories || [],
      shopEffects,
      extraEffects: extra,
      type: inferType(p) || '',
      flowerFamily: isFlowerFamily(p),
      mushroom: isMushroomOnly(p),
    };
  });

  return {
    items,
    cats: categoryDefs.map((c) => c.id),
    effects: ['all', ...effectDefs.map((e) => e.id)],
    types: ['all', ...typeDefs.map((t) => t.id)],
  };
}

function matches(p, cat, effect, type, effectKey = 'shopEffects') {
  const catOk = cat === 'all' || p.categories.includes(cat);
  const tags = p[effectKey] || [];
  const effectOk = effect === 'all' || tags.includes(effect);
  const typeOk = type === 'all' || p.type === type;
  return catOk && effectOk && typeOk;
}

function filterAll(items, cat, effect, type, effectKey = 'shopEffects') {
  return items.filter((p) => matches(p, cat, effect, type, effectKey));
}

function classifyBlank(cat, effect, type, items) {
  const inCat = cat === 'all' ? items : items.filter((p) => p.categories.includes(cat));
  const withEffect = effect === 'all' ? items : items.filter((p) => p.shopEffects.includes(effect));
  const withType = type === 'all' ? items : items.filter((p) => p.type === type);
  const catEffect = filterAll(items, cat, effect, 'all');
  const catType = filterAll(items, cat, 'all', type);
  const effectType = filterAll(items, 'all', effect, type);
  const wouldFillFromWeb = filterAll(items, cat, effect, type, 'extraEffects').length > 0
    && filterAll(items, cat, effect, type).length === 0
    && items.some((p) => {
      const catOk = cat === 'all' || p.categories.includes(cat);
      const typeOk = type === 'all' || p.type === type;
      return catOk && typeOk && p.shopEffects.length === 0 && p.extraEffects.includes(effect);
    });

  if (inCat.length === 0) {
    return {
      code: 'empty_category',
      reason: `Category "${cat}" has no SKUs in the catalog.`,
      fixable: false,
      avenue: 'Hide chips whose count is already 0, or add inventory to this category.',
    };
  }
  if (effect !== 'all' && withEffect.length === 0) {
    return {
      code: 'empty_effect_chip',
      reason: `Effect "${effect}" is tagged on zero SKUs.`,
      fixable: true,
      avenue: 'Tag cultivars in leaflyEffectsByKey / a namedStrainToEffects map.',
    };
  }
  if (type !== 'all' && withType.length === 0) {
    return {
      code: 'empty_type_chip',
      reason: `Type "${type}" is tagged on zero SKUs.`,
      fixable: true,
      avenue: 'Tag more SKUs in cultivarToType / namedStrainToType.',
    };
  }

  if (wouldFillFromWeb) {
    return {
      code: 'effects_in_web_matches_not_on_shop',
      reason: `Blank on the shop, but Inventory/web-matches.json already has "${effect}" for SKUs in this slice.`,
      fixable: true,
      avenue: 'Wire inferEffects() to named house cuts (web-matches / namedStrainToEffects). Types are already assigned.',
    };
  }

  if (effect !== 'all' && catEffect.length === 0) {
    const untagged = inCat.filter((p) => p.shopEffects.length === 0).length;
    if (NON_FLOWER_CATS.has(cat) || inCat.every((p) => !p.flowerFamily)) {
      return {
        code: 'effects_gated_to_named_flower',
        reason: `Effect "${effect}" never matches "${cat}" because cultivarKeyForProduct() only tags flower / pounds / small-sizes (${untagged}/${inCat.length} untagged in this category).`,
        fixable: true,
        avenue: 'Match cultivar names on carts/concentrates/prerolls, or hide Effect chips when a non-flower category is selected.',
      };
    }
    return {
      code: 'no_sku_in_category_has_effect',
      reason: `Category "${cat}" has ${inCat.length} SKUs but none tagged "${effect}" (${untagged} have zero effect tags).`,
      fixable: true,
      avenue: 'Add this effect on matching cultivars, or disable this effect chip once a category is selected (cascading filters).',
    };
  }

  if (type !== 'all' && catType.length === 0) {
    if (cat === 'mushrooms' || inCat.every((p) => p.mushroom)) {
      return {
        code: 'mushrooms_untyped',
        reason: `Mushrooms are intentionally untyped (inferType returns null), so Type "${type}" never matches.`,
        fixable: false,
        avenue: 'Hide Type chips when Mushrooms is selected — not a tagging bug.',
      };
    }
    if (type === 'branded' && inCat.every((p) => p.flowerFamily || p.mushroom)) {
      return {
        code: 'named_category_has_no_branded',
        reason: `Category "${cat}" is named flower (indica/hybrid/sativa). Branded is for flavor lines that come in more than one species.`,
        fixable: false,
        avenue: 'Hide Branded when Flower / Pounds / Small Sizes is selected.',
      };
    }
    return {
      code: 'no_sku_in_category_has_type',
      reason: `Category "${cat}" has ${inCat.length} SKUs but none typed "${type}".`,
      fixable: true,
      avenue: 'Check typing for this category, or hide this Type chip when the category is selected.',
    };
  }

  if (effect !== 'all' && type !== 'all' && effectType.length === 0) {
    if (type === 'branded') {
      return {
        code: 'branded_has_no_effects',
        reason: `Branded flavor lines are not Leafly-tagged, so effect "${effect}" × Branded is always empty.`,
        fixable: true,
        avenue: 'Hide Effect chips when Branded is selected (cascading filters). Do not invent effects for brand lines.',
      };
    }
    return {
      code: 'effect_type_disjoint',
      reason: `No SKU is both effect "${effect}" and type "${type}" (Leafly maps never assign this pair).`,
      fixable: true,
      avenue: 'Retag if Leafly actually reports that effect on this leaning, or hide incompatible Type/Effect chips.',
    };
  }

  return {
    code: 'triple_intersection_empty',
    reason: `"${cat}"∩"${effect}" has ${catEffect.length}, "${cat}"∩"${type}" has ${catType.length}, "${effect}"∩"${type}" has ${effectType.length}, but all three together is empty.`,
    fixable: true,
    avenue: 'Usually a tagging gap on the pairwise SKUs. Cascading chips would hide the last pick.',
  };
}

function enumerate(catalog) {
  const rows = [];
  for (const cat of catalog.cats) {
    for (const effect of catalog.effects) {
      for (const type of catalog.types) {
        const hits = filterAll(catalog.items, cat, effect, type);
        const blank = hits.length === 0;
        rows.push({
          cat,
          effect,
          type,
          count: hits.length,
          blank,
          names: hits.slice(0, 8).map((p) => p.name),
          ...(blank ? classifyBlank(cat, effect, type, catalog.items) : {}),
        });
      }
    }
  }
  return rows;
}

const catalog = loadCatalog();
const rows = enumerate(catalog);
const blanks = rows.filter((r) => r.blank);
const filled = rows.filter((r) => !r.blank);
const byCode = new Map();
for (const b of blanks) {
  const list = byCode.get(b.code) || [];
  list.push(b);
  byCode.set(b.code, list);
}

describe('shop filter combinations', () => {
  test('catalog and chip lists load from the live shop', () => {
    assert.ok(catalog.items.length > 0, 'products array is empty');
    assert.ok(catalog.cats.includes('all') && catalog.cats.includes('flower'));
    assert.ok(catalog.effects.includes('chill') && catalog.effects.includes('all'));
    assert.ok(catalog.types.includes('indica') && catalog.types.includes('branded'));
  });

  test('All × All × All is not blank', () => {
    const all = rows.find((r) => r.cat === 'all' && r.effect === 'all' && r.type === 'all');
    assert.ok(all && all.count === catalog.items.length);
  });

  test('every blank combo has a recorded reason', (t) => {
    t.diagnostic(
      `${rows.length} combos (${catalog.cats.length} cats × ${catalog.effects.length} effects × ${catalog.types.length} types); ${filled.length} filled, ${blanks.length} blank`,
    );

    const unclassified = blanks.filter((b) => !b.code || !b.reason);
    assert.equal(unclassified.length, 0, `unclassified blanks: ${JSON.stringify(unclassified, null, 2)}`);

    const codes = [...byCode.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [code, list] of codes) {
      const tag = list[0].fixable ? 'FIXABLE' : 'BY DESIGN';
      t.diagnostic(`[${tag}] ${code} ×${list.length} — ${list[0].avenue}`);
      if (code === 'effects_gated_to_named_flower') {
        const cats = [...new Set(list.map((b) => b.cat))];
        t.diagnostic(`    categories with no effect tags: ${cats.join(', ')}`);
        continue;
      }
      const show = list.length <= 24 ? list : list.slice(0, 16);
      for (const b of show) {
        t.diagnostic(`    ${b.cat} × ${b.effect} × ${b.type} — ${b.reason}`);
      }
      if (list.length > show.length) t.diagnostic(`    … +${list.length - show.length} more`);
    }
  });

  test('blank reasons are grouped so we can see fix avenues', () => {
    const fixable = blanks.filter((b) => b.fixable);
    const byDesign = blanks.filter((b) => !b.fixable);
    assert.ok(blanks.length > 0, 'expected some stacked filters to be empty');
    assert.ok(fixable.length > 0, 'expected at least one fixable blank class');
    const byDesignCodes = new Set(['empty_category', 'mushrooms_untyped', 'named_category_has_no_branded']);
    assert.ok(
      byDesign.every((b) => byDesignCodes.has(b.code)),
      `unexpected by-design code: ${[...new Set(byDesign.map((b) => b.code))].join(', ')}`,
    );
  });

  test('records SKUs that have a type but no shop effects (main tagging gap)', (t) => {
    const typedNoFx = catalog.items.filter((p) => p.type && p.type !== 'branded' && p.shopEffects.length === 0);
    const withWebFx = typedNoFx.filter((p) => p.extraEffects.length > 0);
    t.diagnostic(
      `${typedNoFx.length} typed SKUs have zero shop effects; ${withWebFx.length} of those already have effects in web-matches.json`,
    );
    for (const p of typedNoFx.slice(0, 40)) {
      const extra = p.extraEffects.length ? ` web-matches=[${p.extraEffects.join(',')}]` : '';
      t.diagnostic(`  ${p.name} type=${p.type} cats=${p.categories.join('|')}${extra}`);
    }
    if (typedNoFx.length > 40) t.diagnostic(`  … +${typedNoFx.length - 40} more`);
    assert.ok(Array.isArray(typedNoFx));
  });

  test('effect × type with category All (tagging conflicts, no category in the way)', (t) => {
    const pairs = rows.filter((r) => r.cat === 'all' && r.effect !== 'all' && r.type !== 'all');
    for (const r of pairs) {
      const status = r.blank ? `BLANK ${r.code}` : `${r.count} SKUs e.g. ${r.names.join(', ')}`;
      t.diagnostic(`${r.effect} × ${r.type}: ${status}`);
    }
    assert.equal(pairs.length, (catalog.effects.length - 1) * (catalog.types.length - 1));
  });

  test('wires web-matches effects onto named house cuts', () => {
    const byName = Object.fromEntries(catalog.items.map((p) => [p.name, p]));
    assert.deepEqual(byName['Sharpiez'].shopEffects, ['euphoric', 'chill', 'creative']);
    assert.ok(byName['Percz'].shopEffects.includes('sleep'));
    assert.ok(byName['Candy Fumes · Pound'].shopEffects.includes('chill'));
    assert.ok(byName['Crème Brûlée · Pound'].shopEffects.includes('sleep'));
    assert.ok(byName['Peach Pie Live Rosin 90u'].shopEffects.includes('chill'));
    assert.ok(byName['Icebox · Quarter Pound'].shopEffects.includes('euphoric'));
    assert.ok(byName['41 Cherries · Zip'].shopEffects.includes('sleep'));
    assert.ok(byName['Noboof OSRS11'].shopEffects.includes('chill'));
    assert.deepEqual(byName['Nectar Berry'].shopEffects, ['chill', 'sleep']);
    assert.deepEqual(byName['Kleenek'].shopEffects, ['chill', 'sleep']);
    assert.deepEqual(byName['Hood Candy'].shopEffects, ['chill', 'sleep']);
    const leftover = blanks.filter((b) => b.code === 'effects_in_web_matches_not_on_shop');
    assert.equal(leftover.length, 0, leftover.map((b) => `${b.cat}/${b.effect}/${b.type}`).join(', '));
  });

  test('cascading chips never reach a blank grid', () => {
    const key = (c, e, t) => `${c}|${e}|${t}`;
    const countAt = (c, e, t) => filterAll(catalog.items, c, e, t).length;
    const start = { cat: 'all', effect: 'all', type: 'all' };
    const seen = new Set([key(start.cat, start.effect, start.type)]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift();
      assert.ok(
        countAt(cur.cat, cur.effect, cur.type) > 0,
        `reachable blank: ${cur.cat} × ${cur.effect} × ${cur.type}`,
      );
      for (const cat of catalog.cats) {
        if (cat !== 'all' && countAt(cat, cur.effect, cur.type) === 0) continue;
        const next = key(cat, cur.effect, cur.type);
        if (!seen.has(next)) {
          seen.add(next);
          queue.push({ cat, effect: cur.effect, type: cur.type });
        }
      }
      for (const effect of catalog.effects) {
        if (effect !== 'all' && countAt(cur.cat, effect, cur.type) === 0) continue;
        const next = key(cur.cat, effect, cur.type);
        if (!seen.has(next)) {
          seen.add(next);
          queue.push({ cat: cur.cat, effect, type: cur.type });
        }
      }
      for (const type of catalog.types) {
        if (type !== 'all' && countAt(cur.cat, cur.effect, type) === 0) continue;
        const next = key(cur.cat, cur.effect, type);
        if (!seen.has(next)) {
          seen.add(next);
          queue.push({ cat: cur.cat, effect: cur.effect, type });
        }
      }
    }
    const unreachableBlanks = [
      { cat: 'carts', effect: 'chill', type: 'all' },
      { cat: 'all', effect: 'energy', type: 'indica' },
      { cat: 'all', effect: 'chill', type: 'branded' },
      { cat: 'mushrooms', effect: 'all', type: 'indica' },
    ];
    for (const b of unreachableBlanks) {
      assert.equal(countAt(b.cat, b.effect, b.type), 0);
      assert.equal(seen.has(key(b.cat, b.effect, b.type)), false);
    }
    assert.ok(seen.size > 0 && seen.size < rows.length);
  });

  test('lists branded SKUs by category (flavor lines vs missed house cuts)', (t) => {
    const branded = catalog.items.filter((p) => p.type === 'branded');
    const byCat = new Map();
    for (const p of branded) {
      for (const c of p.categories) {
        const list = byCat.get(c) || [];
        list.push(p.name);
        byCat.set(c, list);
      }
    }
    t.diagnostic(`${branded.length} branded SKUs`);
    for (const [cat, names] of [...byCat.entries()].sort()) {
      t.diagnostic(`  ${cat} (${names.length}): ${names.join('; ')}`);
    }
    assert.ok(branded.length > 0);
  });

  test('single-chip filters that are themselves empty are called out', (t) => {
    const emptyCats = catalog.cats.filter((c) => c !== 'all' && !catalog.items.some((p) => p.categories.includes(c)));
    const emptyFx = catalog.effects.filter((e) => e !== 'all' && !catalog.items.some((p) => p.shopEffects.includes(e)));
    const emptyTypes = catalog.types.filter((ty) => ty !== 'all' && !catalog.items.some((p) => p.type === ty));
    t.diagnostic(`empty category chips: ${emptyCats.join(', ') || '(none)'}`);
    t.diagnostic(`empty effect chips: ${emptyFx.join(', ') || '(none)'}`);
    t.diagnostic(`empty type chips: ${emptyTypes.join(', ') || '(none)'}`);
    assert.deepEqual(emptyFx, []);
    assert.deepEqual(emptyTypes, []);
  });
});
