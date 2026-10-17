import {
  computeBreakdown,
  getLifetimeSpend,
  getReferralAttribution,
  loyaltyRateFromSpend,
  poundsSubtotalFromLines,
  SHIPPING_FEE,
} from "../lib/rewards.js";

export { SHIPPING_FEE };

export type CartItem = {
  batch: string;
  name: string;
  type: string;
  price: number;
  tone: string;
  img: string | null;
  categories?: string[];
  isPound?: boolean;
  qty?: number;
};

const STORAGE_KEY = "b420_cart_v1";
const MAX_QTY = 999;

/** Integer quantity between 1 and MAX_QTY. Missing/invalid → 1. */
export function normalizeQty(raw: unknown): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_QTY, n);
}

export function itemQty(it: CartItem): number {
  return normalizeQty(it.qty);
}

// Drop corrupt lines left by the old multi-price flower card ($30/$60/$200 → millions).
function isSaneItem(i: unknown): i is CartItem {
  if (!i || typeof i !== "object") return false;
  const it = i as CartItem;
  return (
    typeof it.batch === "string" &&
    it.batch.length > 0 &&
    typeof it.name === "string" &&
    it.name.length > 0 &&
    typeof it.price === "number" &&
    Number.isFinite(it.price) &&
    it.price > 0 &&
    it.price < 100000
  );
}

function normalizeCategories(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: string[] = [];
  for (const c of raw) {
    if (out.length >= 12) break;
    const s = String(c).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!s || s.length > 40 || out.includes(s)) continue;
    out.push(s);
  }
  return out.length ? out : undefined;
}

function sanitizeItem(item: CartItem): CartItem {
  const categories = normalizeCategories(item.categories);
  const next: CartItem = {
    batch: item.batch,
    name: item.name,
    type: item.type,
    price: item.price,
    tone: item.tone,
    img: item.img ?? null,
    qty: normalizeQty(item.qty),
  };
  if (categories) next.categories = categories;
  if (item.isPound === true) next.isPound = true;
  return next;
}

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const sane = parsed.filter(isSaneItem).map(sanitizeItem);
    // Merge duplicate batches (legacy carts stored one line per add).
    const merged: CartItem[] = [];
    for (const it of sane) {
      const existing = merged.find((m) => m.batch === it.batch);
      if (existing) existing.qty = normalizeQty((existing.qty ?? 1) + (it.qty ?? 1));
      else merged.push(it);
    }
    const clean = merged;
    const categoriesChanged = clean.some((it, i) => {
      const prev = sane[i].categories;
      const next = it.categories;
      if (!prev && !next && sane[i].isPound === it.isPound) return false;
      return JSON.stringify(prev ?? null) !== JSON.stringify(next ?? null) || Boolean(sane[i].isPound) !== Boolean(it.isPound);
    });
    const shrank = clean.length !== sane.length;
    if (shrank || categoriesChanged) write(clean);
    return clean;
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota or disabled — silent */
  }
  window.dispatchEvent(new CustomEvent("cart:changed"));
}

export function getCart(): CartItem[] {
  return read();
}

export function addToCart(item: CartItem) {
  const items = read();
  const incoming = sanitizeItem(item);
  const existing = items.find((i) => i.batch === incoming.batch);
  if (existing) existing.qty = normalizeQty(itemQty(existing) + itemQty(incoming));
  else items.push(incoming);
  write(items);
}

/** Set an exact quantity for a line; qty < 1 removes the line. */
export function setQty(batch: string, qty: number) {
  const items = read();
  const it = items.find((i) => i.batch === batch);
  if (!it) return;
  if (!Number.isFinite(qty) || qty < 1) {
    write(items.filter((i) => i.batch !== batch));
    return;
  }
  const next = normalizeQty(qty);
  if (next === itemQty(it)) return;
  it.qty = next;
  write(items);
}

export function stepQty(batch: string, delta: number) {
  const items = read();
  const it = items.find((i) => i.batch === batch);
  if (!it) return;
  setQty(batch, itemQty(it) + delta);
}

/** Fill categories on lines saved before pounds were tracked. No-op when already set. */
export function backfillCategories(lookup: (item: CartItem) => string[] | undefined) {
  const items = read();
  let changed = false;
  const next = items.map((it) => {
    if ((it.categories && it.categories.length) || it.isPound) return it;
    const categories = normalizeCategories(lookup(it));
    if (!categories) return it;
    changed = true;
    return { ...it, categories };
  });
  if (changed) write(next);
}

export function removeFromCart(batch: string) {
  write(read().filter((i) => i.batch !== batch));
}

export function clearCart() {
  write([]);
}

export function cartCount(): number {
  return read().reduce((n, i) => n + itemQty(i), 0);
}

export function cartTotal(): number {
  return read().reduce((sum, i) => sum + i.price * itemQty(i), 0);
}

export function itemLineTotal(i: CartItem): number {
  return i.price * itemQty(i);
}

const DISCOUNTS: Record<string, number> = {
  "BELGIUM10": 0.10,
  "BELGIUM20": 0.20,
  "BELGIUM25": 0.25,
};

export function getDiscountPercent(code: string): number {
  const key = code.trim().toUpperCase();
  return DISCOUNTS[key] ?? 0;
}

export function isValidDiscount(code: string): boolean {
  return getDiscountPercent(code) > 0;
}

export function discountedTotal(code: string): number {
  const pct = getDiscountPercent(code);
  const total = cartTotal();
  if (pct <= 0) return total;
  return Math.max(0, total * (1 - pct));
}

export function discountAmount(code: string): number {
  return cartTotal() - discountedTotal(code);
}


export function shippingCost(merchandiseTotal: number): number {
  if (!Number.isFinite(merchandiseTotal) || merchandiseTotal <= 0) return 0;
  return SHIPPING_FEE;
}

export type RewardsQuote = {
  promoCode?: string;
  referralCredit?: number;
  referralCreditCode?: string;
  lifetimeSpend?: number;
};

export function cartBreakdown(opts: RewardsQuote = {}) {
  const items = read();
  const subtotal = items.reduce((sum, i) => sum + i.price * itemQty(i), 0);
  const promoCode = (opts.promoCode || "").trim();
  const promoPercent = promoCode && isValidDiscount(promoCode) ? getDiscountPercent(promoCode) : 0;
  const lifetimeSpend = opts.lifetimeSpend ?? getLifetimeSpend();
  const loyaltyPercent = loyaltyRateFromSpend(lifetimeSpend);
  const attr = getReferralAttribution();
  return computeBreakdown({
    subtotal,
    poundsSubtotal: poundsSubtotalFromLines(items),
    promoPercent,
    promoCode,
    loyaltyPercent,
    lifetimeSpend,
    referralCredit: opts.referralCredit || 0,
    referralCreditCode: opts.referralCreditCode || "",
    referralCode: attr?.code || "",
  });
}

export function orderTotal(code: string = "", extras: RewardsQuote = {}): number {
  return cartBreakdown({ promoCode: code, ...extras }).total;
}

export function formatPrice(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  return "$" + n.toFixed(2);
}
