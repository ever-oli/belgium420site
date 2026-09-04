/** Shop Type chips: indica / hybrid / sativa / branded. Mushrooms stay untyped. */

export const typeDefs = [
  { id: 'indica', label: 'Indica' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'sativa', label: 'Sativa' },
  { id: 'branded', label: 'Branded' },
];

export const leaflyEffectsByKey = {
  gg4: ['chill', 'sleep'],
  runtz: ['euphoric', 'social'],
  gelato: ['euphoric', 'chill', 'focus'],
  'wedding-cake': ['chill', 'euphoric', 'sleep'],
  'animal-mints': ['chill', 'sleep', 'euphoric'],
  'apple-fritter': ['euphoric', 'chill', 'social'],
  'la-confidential': ['chill', 'sleep'],
  headband: ['focus', 'chill', 'euphoric', 'creative'],
  diesel: ['energy', 'euphoric', 'focus'],
  'og-kush': ['chill', 'euphoric', 'sleep'],
  cookies: ['chill', 'euphoric'],
  sherbert: ['creative', 'chill', 'euphoric'],
  zushi: ['chill', 'euphoric'],
  'styrofoam-cup': ['chill', 'sleep', 'creative'],
  'french-laundry': ['chill', 'euphoric', 'energy'],
  'black-widow': ['energy', 'creative', 'focus'],
};

// Leaning, not strict Leafly "hybrid" labels — otherwise dessert cuts collapse to one chip.
export const cultivarToType = {
  gg4: 'indica',
  'wedding-cake': 'indica',
  'animal-mints': 'indica',
  'la-confidential': 'indica',
  'og-kush': 'indica',
  sherbert: 'indica',
  'styrofoam-cup': 'indica',
  zushi: 'indica',
  runtz: 'hybrid',
  gelato: 'hybrid',
  cookies: 'hybrid',
  'apple-fritter': 'hybrid',
  'french-laundry': 'hybrid',
  diesel: 'sativa',
  'black-widow': 'sativa',
  headband: 'sativa',
};

/** Owner + Leafly/web names that cultivarKeyForProduct does not catch. */
export const namedStrainToType = {
  'nectar berry': 'hybrid',
  kleenek: 'hybrid',
  'candy crusher': 'hybrid',
  'candy mediums': 'hybrid',
  'raz daz': 'hybrid',
  'snow bunnies': 'hybrid',
  'purple pez': 'hybrid',
  'belgium420 flower': 'hybrid',
  'strawberry zinger': 'sativa',
  'strawberry candy': 'sativa',
  sharpiez: 'hybrid',
  percz: 'hybrid',
  'blue tomyz': 'hybrid',
  'hood candy': 'hybrid',
  'candy fumes': 'hybrid',
  'miracle candy': 'hybrid',
  smores: 'hybrid',
  'blue nerds': 'hybrid',
  'blue candy': 'hybrid',
  'black dahlia': 'hybrid',
  'candy fuel': 'hybrid',
  tarts: 'hybrid',
  'creme brulee': 'indica',
  lance: 'hybrid',
  '41 cherries': 'hybrid',
  'private reserve': 'hybrid',
  icebox: 'hybrid',
  'peach pie': 'hybrid',
  'noboof osrs11': 'hybrid',
};

/** House / web-matched cuts that cultivarKeyForProduct does not catch. Do not invent. */
export const namedStrainToEffects = {
  sharpiez: ['euphoric', 'chill', 'creative'],
  percz: ['chill', 'sleep'],
  'blue tomyz': ['euphoric', 'chill'],
  'candy fumes': ['euphoric', 'chill'],
  'black dahlia': ['chill', 'sleep'],
  'creme brulee': ['chill', 'sleep', 'euphoric'],
  'peach pie': ['chill', 'euphoric'],
  '41 cherries': ['chill', 'sleep'],
  icebox: ['chill', 'euphoric'],
  'noboof osrs11': ['chill', 'euphoric'],
  'nectar berry': ['chill', 'sleep'],
  kleenek: ['chill', 'sleep'],
  'hood candy': ['chill', 'sleep'],
};

export function isFlowerFamily(p) {
  const cats = p.categories || [];
  return cats.includes('flower') || cats.includes('pounds') || cats.includes('small-sizes');
}

export function isMushroomOnly(p) {
  const cats = p.categories || [];
  return cats.includes('mushrooms') && !cats.includes('flower');
}

export function strainKey(p) {
  return String(p.name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/\s*·\s*.*$/, '')
    .replace(/\s+live rosin.*$/i, '')
    .replace(/\s+jr$/i, '')
    .trim();
}

export function cultivarKeyForProduct(p) {
  if (!isFlowerFamily(p)) return null;
  const n = `${p.name}`.toLowerCase();
  if (/gg4|gorilla glue/.test(n)) return 'gg4';
  if (/headband/.test(n)) return 'headband';
  if (/la confidential/.test(n)) return 'la-confidential';
  if (/black\s*widow/.test(n)) return 'black-widow';
  if (/animal mints/.test(n)) return 'animal-mints';
  if (/apple fritter/.test(n)) return 'apple-fritter';
  if (/french laundry/.test(n)) return 'french-laundry';
  if (/styrofoam/.test(n)) return 'styrofoam-cup';
  if (/wedding cake/.test(n)) return 'wedding-cake';
  if (/gelato|jetlato/.test(n)) return 'gelato';
  if (/zushi/.test(n)) return 'zushi';
  if (/diesel/.test(n)) return 'diesel';
  if (/\bog\b/.test(n)) return 'og-kush';
  if (/cookies/.test(n)) return 'cookies';
  if (/sherbanger|sherbinski|sherbert|sherbet|sherb\b/.test(n)) return 'sherbert';
  if (/runtz/.test(n)) return 'runtz';
  return null;
}

export function inferEffects(p) {
  if (Array.isArray(p.vibes) && p.vibes.length) return p.vibes;
  if (Array.isArray(p.effects) && p.effects.length) return p.effects;
  const key = cultivarKeyForProduct(p);
  if (key && leaflyEffectsByKey[key]) return leaflyEffectsByKey[key];
  return namedStrainToEffects[strainKey(p)] || [];
}

export function inferType(p) {
  if (p.strainType) return p.strainType;
  if (isMushroomOnly(p)) return null;
  const key = cultivarKeyForProduct(p);
  if (key && cultivarToType[key]) return cultivarToType[key];
  const named = namedStrainToType[strainKey(p)];
  if (named) return named;
  if (/strawberry/.test(`${p.name}`.toLowerCase())) return 'sativa';
  return 'branded';
}
