---
name: belgium420-inventory
description: >-
  Matches Belgium420 catalog SKUs to indica/hybrid/sativa/branded and effects
  (Leafly first, then web search), updates src/lib/strain-types.js, rebuilds
  inventory/belgium420-inventory.xlsx, and updates inventory/web-matches.json.
  Use when adding a new inventory item, adding a product to the catalog, an
  unmatched Type appears, rebuilding the inventory log/xlsx, Leafly scraping,
  or strain type matching.
---

# Belgium420 inventory matching

Live Type chips read `inferType()` in `src/lib/strain-types.js`. Keep that file and the workbook in sync. Do not edit inventory plan files. Never invent types.

Shop types: **Indica / Hybrid / Sativa / Branded**. Mushrooms have no cannabis type (n/a).

## Workflow

1. Add/edit the SKU in the `products` array in `src/pages/index.astro` and put a photo in `public/inventory/`.
2. If it is a named flower/concentrate, add it to `namedStrainToType` or `cultivarToType` in `src/lib/strain-types.js`. If web-matches has effects, also add `namedStrainToEffects` — do not invent effects.
3. Rebuild:
   ```bash
   node scripts/build-inventory-log.mjs
   ```
4. Read `inventory/build-report.json`.
5. For each name in `unmatchedNames`:
   - Try Leafly slug variants first. Add hits to `SLUG_ALIASES` in `scripts/build-inventory-log.mjs`.
   - If Leafly misses, web-search **brand + product/strain**. Prefer Leafly, then AllBud / Weedmaps / reputable strain DBs.
   - If sources **agree** on type, write/update `inventory/web-matches.json` and `namedStrainToType`.
   - Flavor lines (carts/edibles that come in indica *and* hybrid *and* sativa) → Type **branded**, match `brand-line`.
6. Rebuild the workbook again.
7. Report leafly / site-map / web-search / brand-line / n/a / unmatched, plus indica / hybrid / sativa / branded counts.

## web-matches.json

Keys: exact product `name`, `batch`, or cleaned strain name.

```json
{
  "match": "web-search | brand-line | n/a | site-map",
  "type": "indica | hybrid | sativa | branded | \"\"",
  "effects": [],
  "url": "source url or empty",
  "confidence": "high | medium | low",
  "notes": "why this assignment"
}
```

## Accuracy rules

- Goal is all cannabis SKUs typed: indica, hybrid, sativa, or branded.
- **Branded**: brand/flavor line where the customer can get indica, hybrid, or sativa. Not one species.
- **Mushrooms / psilocybin edibles**: `n/a` — no Type chip.
- **House indica-hybrids** (owner): Nectar Berry, Kleenek, Candy Crusher, Candy Mediums, Raz Daz, Snow Bunnies, Purple Pez, Belgium420 Flower → `hybrid`.
- **Strawberry Zinger and Strawberry Candy** (owner): `sativa`.
- Cite a source URL in web-matches when the type is from the web, not owner.
- Prefer `cultivarToType` leanings for mapped flower families. Prefer Leafly over web when Leafly actually hits.
- Skip Leafly for mushrooms, generic names (cart/gummies/chocolate/pre-roll/blunt/pound/zip), and brand lines with no extractable cultivar.

## Output

- Shop types: `src/lib/strain-types.js`
- Workbook: `inventory/belgium420-inventory.xlsx`
- Cache: `inventory/leafly-cache.json`
- Report: `inventory/build-report.json`
