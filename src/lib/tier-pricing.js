/** Quantity-tier unit prices for the new drop. Last tier is the open-ended break. */

export const TIER_CATALOG = {
  'B420-2026-WM-P6V2': {
    tiers: [
      { max: 10, price: 20 },
      { max: 50, price: 19 },
      { max: 99, price: 18 },
      { max: null, price: 17 },
    ],
  },
  'B420-2026-HT-2G': {
    tiers: [
      { max: 10, price: 20 },
      { max: 50, price: 19 },
      { max: 99, price: 18 },
      { max: null, price: 16 },
    ],
  },
  'B420-2026-DEVOUR-1500': {
    tiers: [
      { max: 9, price: 20 },
      { max: 49, price: 18 },
      { max: 99, price: 16.5 },
      { max: null, price: 15 },
    ],
  },
  'B420-2026-DEVOUR-STRIPS': {
    tiers: [
      { max: 9, price: 20 },
      { max: 49, price: 18 },
      { max: 99, price: 16.5 },
      { max: null, price: 15 },
    ],
  },
  'B420-2026-DEVOUR-NANO500': {
    tiers: [
      { max: 9, price: 25 },
      { max: 49, price: 20 },
      { max: 99, price: 17.5 },
      { max: null, price: 16 },
    ],
  },
  'B420-2026-JUUG-2G': {
    tiers: [
      { max: 9, price: 20 },
      { max: 49, price: 18 },
      { max: 99, price: 17 },
      { max: null, price: 15 },
    ],
  },
  'B420-2026-HEADY-1G': {
    tiers: [
      { max: 9, price: 15 },
      { max: 49, price: 13.5 },
      { max: 99, price: 12 },
      { max: null, price: 10 },
    ],
  },
};

export function baseBatchOf(batch) {
  const id = String(batch || '');
  for (const key of Object.keys(TIER_CATALOG)) {
    if (id === key || id.startsWith(`${key}-`)) return key;
  }
  return null;
}

export function unitPriceForQty(base, qty) {
  const cfg = TIER_CATALOG[base];
  if (!cfg) return null;
  const n = Math.max(1, Math.round(Number(qty) || 1));
  for (const tier of cfg.tiers) {
    if (tier.max == null || n <= tier.max) return tier.price;
  }
  return cfg.tiers[cfg.tiers.length - 1].price;
}

/** Mixed flavors of the same product share one quantity break. Mutates lines. */
export function applyTierPrices(items) {
  const groups = new Map();
  for (const item of items || []) {
    const base = baseBatchOf(item?.baseBatch || item?.batch);
    if (!base) continue;
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(item);
  }
  let changed = false;
  for (const [base, list] of groups) {
    const qty = list.reduce((n, it) => {
      const q = Math.round(Number(it.qty) || 1);
      return n + (Number.isFinite(q) && q > 0 ? q : 1);
    }, 0);
    const price = unitPriceForQty(base, qty);
    if (price == null) continue;
    for (const it of list) {
      if (Number(it.price) !== price) {
        it.price = price;
        changed = true;
      }
      if (!it.baseBatch) it.baseBatch = base;
    }
  }
  return changed;
}
