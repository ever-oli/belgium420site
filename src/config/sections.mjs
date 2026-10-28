// Single source of truth for every homepage section (page order).
// Drives the nav links, the scroll pill jump bar + current-section highlight,
// the scroll offset under the fixed nav, deep-link aliases and the admin
// "Open site section" dropdown. Add a section here and every surface picks it up.
export const SECTIONS = [
  { id: 'top', label: 'Home', nav: false, aliases: ['home'] },
  { id: 'shop', label: 'Shop', aliases: ['menu', 'store', 'products'] },
  { id: 'lab', label: 'Lab', navLabel: 'Lab Results', aliases: ['coa', 'coas', 'labs', 'lab-results'] },
  { id: 'shipping', label: 'Shipping', aliases: ['ship', 'delivery'] },
  { id: 'rewards', label: 'Rewards', aliases: ['points', 'ref', 'referral'] },
  { id: 'about', label: 'About', aliases: ['info', 'us'] },
];
export const SECTION_IDS = SECTIONS.map((s) => s.id);
export const NAV_SECTIONS = SECTIONS.filter((s) => s.nav !== false);

// Fixed nav height (px) used for the scroll offset, desktop vs mobile.
export const SCROLL_OFFSET = { desktop: 64, mobile: 60, breakpoint: 900, gap: 8 };

// Shop category deep links: #pounds, #carts, #lbs ... land on the shop with that category picked.
export const CATEGORY_ALIASES = {
  lbs: 'pounds', lb: 'pounds', pound: 'pounds',
  vapes: 'carts', vape: 'carts', cart: 'carts',
  shrooms: 'mushrooms', gummies: 'edibles', edible: 'edibles',
  'pre-rolls': 'prerolls', preroll: 'prerolls', concentrate: 'concentrates', wax: 'concentrates',
  small: 'small-sizes', zips: 'small-sizes',
};

/** '#coa' -> { section: 'lab' }, '#pounds' -> { section: 'shop', cat: 'pounds' }, unknown -> null. */
export function resolveAnchor(hash, catIds = []) {
  const h = decodeURIComponent(String(hash || '')).replace(/^#/, '').trim().toLowerCase();
  if (!h) return null;
  for (const s of SECTIONS) if (s.id === h || (s.aliases || []).includes(h)) return { section: s.id };
  const cat = catIds.includes(h) ? h : CATEGORY_ALIASES[h];
  if (cat && cat !== 'all' && (catIds.length === 0 || catIds.includes(cat))) return { section: 'shop', cat };
  return null;
}
