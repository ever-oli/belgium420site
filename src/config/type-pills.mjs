// Single source of truth for the shop's pill rows (order = display order).
// TYPE pills are the strain types (from strain-types.js). WEIGHT pills are derived from the
// sizes a product actually offers (its type line + every variant), so a card with a 3.5g / 7g /
// Zip picker lands under Eighths, Quarters and Zips. QP = quarter POUND (not a quarter oz).
// Counts are computed client-side from each card's data-sizes, so they follow other filters.
import { typeDefs } from '../lib/strain-types.js';

export const TYPE_PILLS = typeDefs;
export const WEIGHT_PILLS = [
  { id: 'eighth', label: 'Eighths · 3.5g' },
  { id: 'quarter', label: 'Quarters · 7g' },
  { id: 'half', label: 'Halfs · 14g' },
  { id: 'zip', label: 'Zips · 28g' },
  { id: 'qp', label: 'QPs' },
  { id: 'half-lb', label: 'Half lbs' },
  { id: 'lb', label: 'Pounds' },
];
export const WEIGHT_PILL_IDS = WEIGHT_PILLS.map((p) => p.id);

// Sold by the unit, not by weight: a "2g cart" or "14 × 0.5g" pre-roll pack is not a weight tier.
const UNIT_CATS = ['carts', 'edibles', 'prerolls', 'mushrooms'];
const RULES = [
  ['eighth', /(^|[^\d.])3\.5\s?g\b|1\/8|\beighth/],
  ['quarter', /(^|[^\d.])7\s?g\b|1\/4\s?oz|\(quarter\)/],
  ['half', /(^|[^\d.])14\s?g\b|1\/2\s?oz|half\s?oz/],
  ['zip', /\bzips?\b|(^|[^\d.])28\s?g\b|(^|[^\d.])1\s?oz\b/],
  ['qp', /\bqp\b|113\s?g|quarter\s?pound|(^|[^\d.])4\s?oz\b/],
  ['half-lb', /half\s?pound|\bhp\b|(^|[^\d.])8\s?oz\b|227\s?g/],
  ['lb', /\b1\s?lb\b|\blbs?\b|454\s?g|\bpounds?\b|\b\d+\s?kg\b/],
];

/** Text describing every size a product offers. */
export const sizeText = (p) => [p.type, ...(p.variants || []).flatMap((v) => [v.label, v.type])].filter(Boolean).join(' | ').toLowerCase();

/** Weight pill ids a product belongs to, in pill order. */
export function weightPillsFor(p) {
  if ((p.categories || []).some((c) => UNIT_CATS.includes(c))) return [];
  const raw = sizeText(p);
  const out = new Set();
  for (const [id, re] of RULES) {
    // "quarter pound" / "half pound" must not also count as a whole pound.
    const s = id === 'lb' ? raw.replace(/(quarter|half)\s?pound/g, '') : raw;
    if (re.test(s)) out.add(id);
  }
  return WEIGHT_PILL_IDS.filter((id) => out.has(id));
}
