// One sold-out rule for the whole shop: a product is sold out when its manual `soldOut` flag is
// set OR every size it offers (variants) is marked `soldOut`. Cards, the size picker and the cart
// all go through these helpers instead of trusting a hand-set flag in one place.
// Mark stock in the catalog:  { name: 'X', soldOut: true }  or  variants: [{ id: 'qp', soldOut: true }]
export const variantsOf = (p) => (Array.isArray(p?.variants) ? p.variants : []);

export function isSoldOut(p) {
  if (!p) return true;
  if (p.soldOut) return true;
  const v = variantsOf(p);
  return v.length > 0 && v.every((x) => !!x.soldOut);
}

/** First size still in stock (the card's default pick), else the first size. */
export const defaultVariantOf = (p) => variantsOf(p).find((v) => !v.soldOut) || variantsOf(p)[0];

/** Can this product (and size, when it has sizes) go in the cart? */
export function canAddToCart(p, variantId) {
  if (isSoldOut(p) || p.inquiryOnly) return false;
  const v = variantsOf(p);
  if (!v.length) return true;
  const pick = variantId ? v.find((x) => x.id === variantId) : defaultVariantOf(p);
  return !!pick && !pick.soldOut;
}
