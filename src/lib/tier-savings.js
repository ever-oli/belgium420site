/**
 * Per-unit savings for size and quantity tiers.
 * Weight tiers compare price per gram (a zip is 28g, a QP is 113g).
 * Quantity tiers compare price per unit. The baseline is the smallest tier.
 * Returns a rounded percent, or 0 when the option is the baseline or saves under 5%.
 */

const QP_GRAMS = 113;
const ZIP_GRAMS = 28;

export function tierQuantity(variant) {
  const text = `${variant.label || ''} ${variant.type || ''} ${variant.id || ''}`;
  const multiG = text.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*g\b/i);
  if (multiG) {
    return { kind: 'g', qty: parseFloat(multiG[1]) * parseFloat(multiG[2]) };
  }
  const grams = text.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (grams) return { kind: 'g', qty: parseFloat(grams[1]) };
  if (/\bqp\b|quarter\s*pound/i.test(text)) return { kind: 'g', qty: QP_GRAMS };
  const zips = text.match(/(\d+(?:\.\d+)?)\s*zips?\b/i);
  if (zips) return { kind: 'g', qty: parseFloat(zips[1]) * ZIP_GRAMS };
  if (/\bzip\b/i.test(text)) return { kind: 'g', qty: ZIP_GRAMS };
  const units = text.match(/(\d+(?:\.\d+)?)\s*units?\b/i);
  if (units) return { kind: 'unit', qty: parseFloat(units[1]) };
  return null;
}

export function savePercents(variants) {
  if (!Array.isArray(variants) || variants.length < 2) return variants.map(() => 0);
  const parsed = variants.map((variant) => ({ variant, q: tierQuantity(variant) }));
  if (parsed.some((row) => !row.q || !(row.variant.price > 0))) return variants.map(() => 0);
  const kind = parsed[0].q.kind;
  if (parsed.some((row) => row.q.kind !== kind)) return variants.map(() => 0);
  const smallest = parsed.reduce((best, row) => (row.q.qty < best.q.qty ? row : best));
  const baseRate = smallest.variant.price / smallest.q.qty;
  if (!(baseRate > 0)) return variants.map(() => 0);
  return parsed.map((row) => {
    if (row.q.qty === smallest.q.qty) return 0;
    const rate = row.variant.price / row.q.qty;
    const pct = ((baseRate - rate) / baseRate) * 100;
    if (pct < 5) return 0;
    return Math.round(pct);
  });
}
