/**
 * Belgium420 loyalty + referral rewards (client).
 * Pure helpers are safe to import from node:test; storage helpers no-op without a window.
 */

export const REFERRAL_CREDIT_GRANT = 25;
export const ATTRIBUTION_DAYS = 30;
export const LOYALTY_ID_DAYS = 400;
export const SHARE_ORIGIN = "https://belgium420.com";

export const STORAGE_KEYS = {
  ref: "b420_ref_v1",
  loyaltyId: "b420_loyalty_id_v1",
  loyaltyPlaced: "b420_loyalty_placed_v1",
  loyaltyPaid: "b420_loyalty_paid_v1",
  loyaltyPaidKnown: "b420_loyalty_paid_known_v1",
  ownCode: "b420_my_ref_code_v1",
  ledger: "b420_rewards_ledger_v1",
};

export const COOKIE_KEYS = {
  ref: "b420_ref",
  loyaltyId: "b420_loyalty_id",
};

/** @param {unknown} raw */
export function normalizeReferralCode(raw) {
  if (raw == null) return "";
  const code = String(raw)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 24);
  return code.length >= 2 ? code : "";
}

/** @param {string} name */
export function codeFromName(name) {
  const base = normalizeReferralCode(String(name || "").replace(/\s+/g, ""));
  if (base.length >= 3) return base.slice(0, 16);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return normalizeReferralCode((base || "B420") + suffix);
}

export function shareUrlForCode(code) {
  const c = normalizeReferralCode(code);
  return c ? `${SHARE_ORIGIN}/?ref=${encodeURIComponent(c)}` : `${SHARE_ORIGIN}/?ref=YOURCODE`;
}

/** Every 5th → 5%, every 10th (20th, …) → 10%. */
export function loyaltyPercentForOrderNumber(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return 0;
  const order = Math.floor(num);
  if (order % 10 === 0) return 0.1;
  if (order % 5 === 0) return 0.05;
  return 0;
}

export function loyaltyLabel(orderNumber, percent) {
  const pct = percent ?? loyaltyPercentForOrderNumber(orderNumber);
  if (pct >= 0.1) return `Loyalty: 10% off (${orderNumber}th order)`;
  if (pct >= 0.05) return `Loyalty: 5% off (${orderNumber}th order)`;
  return "";
}

/**
 * @param {number} completedCount paid/placed orders already on file
 */
export function nextLoyaltyMilestone(completedCount) {
  const done = Math.max(0, Math.floor(Number(completedCount) || 0));
  let n = done + 1;
  while (n % 5 !== 0) n += 1;
  const percent = n % 10 === 0 ? 10 : 5;
  return {
    orderNumber: n,
    percent,
    ordersAway: n - done,
    label: `${percent}% off on order ${n}`,
  };
}

/**
 * @param {{
 *   subtotal: number,
 *   promoPercent?: number,
 *   promoCode?: string,
 *   loyaltyPercent?: number,
 *   loyaltyOrderNumber?: number,
 *   referralCredit?: number,
 *   referralCode?: string,
 *   referralCreditCode?: string,
 * }} input
 */
export function computeBreakdown(input) {
  const subtotal = Math.max(0, roundMoney(input.subtotal || 0));
  const promoPercent = Math.max(0, Number(input.promoPercent) || 0);
  const loyaltyPercent = Math.max(0, Number(input.loyaltyPercent) || 0);
  const promoAmount = roundMoney(subtotal * promoPercent);
  const loyaltyAmount = roundMoney(subtotal * loyaltyPercent);
  const afterPercents = Math.max(0, roundMoney(subtotal - promoAmount - loyaltyAmount));
  const wantCredit = Math.max(0, Number(input.referralCredit) || 0);
  const referralCreditAmount = roundMoney(Math.min(wantCredit, afterPercents));
  const merch = Math.max(0, roundMoney(afterPercents - referralCreditAmount));
  const shipping = merch > 0 && merch < 50 ? 25 : 0;
  const total = roundMoney(merch + shipping);
  const loyaltyOrderNumber = Math.max(0, Math.floor(Number(input.loyaltyOrderNumber) || 0));
  return {
    subtotal,
    promoCode: input.promoCode ? String(input.promoCode).trim().toUpperCase() : "",
    promoPercent,
    promoAmount,
    loyaltyOrderNumber,
    loyaltyPercent,
    loyaltyAmount,
    loyaltyLabel: loyaltyLabel(loyaltyOrderNumber, loyaltyPercent),
    referralCode: normalizeReferralCode(input.referralCode || ""),
    referralCreditCode: normalizeReferralCode(input.referralCreditCode || ""),
    referralCreditAmount,
    merch,
    shipping,
    total,
  };
}

export function roundMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

export function isSelfReferral(attributionCode, ownCode, buyerEmail, ownerEmail) {
  const a = normalizeReferralCode(attributionCode);
  const own = normalizeReferralCode(ownCode);
  if (a && own && a === own) return true;
  const buyer = normalizeEmail(buyerEmail);
  const owner = normalizeEmail(ownerEmail);
  if (a && buyer && owner && buyer === owner) return true;
  return false;
}

export function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function parseCookie(cookieStr, name) {
  if (!cookieStr || !name) return "";
  const parts = String(cookieStr).split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return part.slice(idx + 1).trim();
    }
  }
  return "";
}

function defaultStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* disabled */
  }
  return null;
}

function writeCookie(name, value, days) {
  if (typeof document === "undefined") return;
  const maxAge = Math.round(Math.max(0, days) * 86400);
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

/**
 * Last-click wins. Accepts ?ref= and ?referral=.
 * @param {string | URLSearchParams} [search]
 * @param {Storage | null} [storage]
 */
export function captureReferralFromUrl(search, storage) {
  const store = storage === undefined ? defaultStorage() : storage;
  let params;
  if (search instanceof URLSearchParams) params = search;
  else if (typeof search === "string") params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  else if (typeof window !== "undefined") params = new URLSearchParams(window.location.search);
  else params = new URLSearchParams();

  const raw = params.get("ref") || params.get("referral") || "";
  const code = normalizeReferralCode(raw);
  if (!code) return getReferralAttribution(store);

  const now = Date.now();
  const record = {
    code,
    capturedAt: now,
    expiresAt: now + ATTRIBUTION_DAYS * 86400 * 1000,
  };
  try {
    store?.setItem(STORAGE_KEYS.ref, JSON.stringify(record));
  } catch {
    /* quota */
  }
  writeCookie(COOKIE_KEYS.ref, code, ATTRIBUTION_DAYS);
  return record;
}

/** @param {Storage | null} [storage] */
export function getReferralAttribution(storage) {
  const store = storage === undefined ? defaultStorage() : storage;
  const now = Date.now();
  try {
    const raw = store?.getItem(STORAGE_KEYS.ref);
    if (raw) {
      const parsed = JSON.parse(raw);
      const code = normalizeReferralCode(parsed?.code);
      if (code && Number(parsed.expiresAt) > now) return { ...parsed, code };
    }
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    const fromCookie = normalizeReferralCode(parseCookie(document.cookie, COOKIE_KEYS.ref));
    if (fromCookie) {
      const record = {
        code: fromCookie,
        capturedAt: now,
        expiresAt: now + ATTRIBUTION_DAYS * 86400 * 1000,
      };
      try {
        store?.setItem(STORAGE_KEYS.ref, JSON.stringify(record));
      } catch {
        /* ignore */
      }
      return record;
    }
  }
  return null;
}

/** @param {Storage | null} [storage] */
export function getOwnReferralCode(storage) {
  const store = storage === undefined ? defaultStorage() : storage;
  return normalizeReferralCode(store?.getItem(STORAGE_KEYS.ownCode) || "");
}

/** @param {string} code @param {Storage | null} [storage] */
export function setOwnReferralCode(code, storage) {
  const store = storage === undefined ? defaultStorage() : storage;
  const normalized = normalizeReferralCode(code);
  if (!normalized) return "";
  try {
    store?.setItem(STORAGE_KEYS.ownCode, normalized);
  } catch {
    /* ignore */
  }
  return normalized;
}

export function newLoyaltyId() {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `B420-L-${hex}`.toUpperCase();
}

/** @param {Storage | null} [storage] */
export function ensureLoyaltyId(storage) {
  const store = storage === undefined ? defaultStorage() : storage;
  let id = "";
  try {
    id = String(store?.getItem(STORAGE_KEYS.loyaltyId) || "").trim();
  } catch {
    id = "";
  }
  if (!id && typeof document !== "undefined") {
    id = parseCookie(document.cookie, COOKIE_KEYS.loyaltyId);
  }
  if (!id) id = newLoyaltyId();
  try {
    store?.setItem(STORAGE_KEYS.loyaltyId, id);
  } catch {
    /* ignore */
  }
  writeCookie(COOKIE_KEYS.loyaltyId, id, LOYALTY_ID_DAYS);
  return id;
}

/** @param {Storage | null} [storage] */
export function getLoyaltyPlacedCount(storage) {
  const store = storage === undefined ? defaultStorage() : storage;
  const n = Number(store?.getItem(STORAGE_KEYS.loyaltyPlaced) || 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** @param {number} n @param {Storage | null} [storage] */
export function setLoyaltyPlacedCount(n, storage) {
  const store = storage === undefined ? defaultStorage() : storage;
  const v = Math.max(0, Math.floor(Number(n) || 0));
  try {
    store?.setItem(STORAGE_KEYS.loyaltyPlaced, String(v));
  } catch {
    /* ignore */
  }
  return v;
}

/** @param {Storage | null} [storage] */
export function bumpLoyaltyPlacedCount(storage) {
  return setLoyaltyPlacedCount(getLoyaltyPlacedCount(storage) + 1, storage);
}

/** @param {Storage | null} [storage] */
export function getCachedPaidCount(storage) {
  const store = storage === undefined ? defaultStorage() : storage;
  if (store?.getItem(STORAGE_KEYS.loyaltyPaidKnown) !== "1") return null;
  const n = Number(store?.getItem(STORAGE_KEYS.loyaltyPaid) || 0);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/** @param {number} n @param {Storage | null} [storage] */
export function setCachedPaidCount(n, storage) {
  const store = storage === undefined ? defaultStorage() : storage;
  const v = Math.max(0, Math.floor(Number(n) || 0));
  try {
    store?.setItem(STORAGE_KEYS.loyaltyPaid, String(v));
    store?.setItem(STORAGE_KEYS.loyaltyPaidKnown, "1");
  } catch {
    /* ignore */
  }
  return v;
}

/**
 * Next order number for this shopper. Prefers server paid count when known,
 * otherwise same-browser placed count so 5th/10th still works without PHP.
 * @param {Storage | null} [storage]
 */
export function thisLoyaltyOrderNumber(storage) {
  const paid = getCachedPaidCount(storage);
  const placed = getLoyaltyPlacedCount(storage);
  const completed = paid == null ? placed : Math.max(paid, placed);
  return completed + 1;
}

/**
 * @param {string} loyaltyId
 * @returns {Promise<{ paid_count: number, placed_count: number, this_order_number: number, loyalty_percent: number } | null>}
 */
export async function fetchLoyaltySnapshot(loyaltyId) {
  const id = String(loyaltyId || "").trim();
  if (!id || typeof fetch === "undefined") return null;
  try {
    const r = await fetch(`/api/referrals.php?loyalty_id=${encodeURIComponent(id)}&_t=${Date.now()}`);
    if (!r.ok) return null;
    const data = await r.json();
    if (!data?.ok) return null;
    return {
      paid_count: Number(data.paid_count) || 0,
      placed_count: Number(data.placed_count) || 0,
      this_order_number: Number(data.this_order_number) || 0,
      loyalty_percent: Number(data.loyalty_percent) || 0,
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} code
 * @returns {Promise<number>}
 */
export async function fetchReferralCreditAvailable(code) {
  const c = normalizeReferralCode(code);
  if (!c || typeof fetch === "undefined") return 0;
  try {
    const r = await fetch(`/api/referrals.php?code=${encodeURIComponent(c)}&_t=${Date.now()}`);
    if (!r.ok) return 0;
    const data = await r.json();
    if (!data?.ok) return 0;
    const n = Number(data.available);
    return Number.isFinite(n) && n > 0 ? roundMoney(n) : 0;
  } catch {
    return 0;
  }
}
