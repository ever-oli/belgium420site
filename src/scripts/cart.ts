// Cart module — singleton, localStorage-backed.
// Used by every page that needs to read/write the cart (index, checkout).
// Keyed by product `batch` so the same product can't be double-counted.

export type CartItem = {
  batch: string;
  name: string;
  type: string;
  price: number;       // numeric, dollars
  tone: string;
  img: string | null;  // optional, may be null for the placeholder cards
};

const STORAGE_KEY = "b420_cart_v1";

// Drop corrupt lines left by the old multi-price flower card ($30/$60/$220 → millions).
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

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter(isSaneItem);
    if (clean.length !== parsed.length) write(clean);
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
  // Fire a window event so the badge / drawer can re-render without a poll.
  window.dispatchEvent(new CustomEvent("cart:changed"));
}

export function getCart(): CartItem[] {
  return read();
}

export function addToCart(item: CartItem) {
  const items = read();
  // No qty stacking in v1 — each add is a separate line. Simplifies admin view.
  // If a customer wants 2 of the same thing, they add twice.
  items.push(item);
  write(items);
}

export function removeFromCart(batch: string) {
  write(read().filter((i) => i.batch !== batch));
}

export function clearCart() {
  write([]);
}

export function cartCount(): number {
  return read().length;
}

export function cartTotal(): number {
  return read().reduce((sum, i) => sum + i.price, 0);
}

// ---------- discount codes ----------
// Code → fraction off subtotal. Codes are case-insensitive.
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

export function formatPrice(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  return "$" + n.toFixed(2);
}
