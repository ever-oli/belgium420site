/**
 * Belgium420 loyalty + referral rewards (client).
 * Pure helpers are safe to import from node:test; storage helpers no-op without a window.
 */

export const REFERRAL_CREDIT_GRANT = 25;
export const ATTRIBUTION_DAYS = 30;
export const LOYALTY_ID_DAYS = 400;
export const SHARE_ORIGIN = "https://belgium420.com";

export const LOYALTY_DOLLARS_PER_PERCENT = 100;
export const LOYALTY_PERCENT_CAP = 25;

export const STORAGE_KEYS = {
  ref: "b420_ref_v1",
  loyaltyId: "b420_loyalty_id_v1",
  loyaltySpend: "b420_loyalty_spend_v1",
  loyaltyPlaced: "b420_loyalty_placed_v1",
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

/** Integer percent: floor(lifetime merch $ / 100), capped at 25. */
export function loyaltyPercentFromSpend(spendUsd) {
  const spend = Math.max(0, Number(spendUsd) || 0);
  const pct = Math.floor(spend / LOYALTY_DOLLARS_PER_PERCENT);
  return Math.min(LOYALTY_PERCENT_CAP, Math.max(0, pct));
}

/** Fraction 0–0.25 for money math. */
export function loyaltyRateFromSpend(spendUsd) {
  return loyaltyPercentFromSpend(spendUsd) / 100;
}

export function loyaltyLabel(percentOrRate, spendUsd) {
  let points = Number(percentOrRate);
  if (!Number.isFinite(points) || points <= 0) {
    points = loyaltyPercentFromSpend(spendUsd);
  } else if (points > 0 && points <= 1) {
    points = Math.round(points * 100);
  }
  points = Math.min(LOYALTY_PERCENT_CAP, Math.max(0, Math.floor(points)));
  if (points <= 0) return "";
  const spend = Number(spendUsd);
  if (Number.isFinite(spend) && spend > 0) {
    return `Loyalty: ${points}% off ($${Math.floor(spend)} spent, cap ${LOYALTY_PERCENT_CAP}%)`;
  }
  return `Loyalty: ${points}% off (cap ${LOYALTY_PERCENT_CAP}%)`;
}

export function nextSpendMilestone(spendUsd) {
  const spend = Math.max(0, Number(spendUsd) || 0);
  const current = loyaltyPercentFromSpend(spend);
  if (current >= LOYALTY_PERCENT_CAP) {
    return {
      nextPercent: LOYALTY_PERCENT_CAP,
      spendNeeded: 0,
      atSpend: spend,
      capped: true,
      label: `Capped at ${LOYALTY_PERCENT_CAP}% off`,
    };
  }
  const nextPercent = current + 1;
  const atSpend = nextPercent * LOYALTY_DOLLARS_PER_PERCENT;
  const spendNeeded = roundMoney(atSpend - spend);
  return {
    nextPercent,
    spendNeeded,
    atSpend,
    capped: false,
    label: `$${atSpend} lifetime → ${nextPercent}% off ($${spendNeeded.toFixed(2)} to go)`,
  };
}

/**
 * @param {{
 *   subtotal: number,
 *   promoPercent?: number,
 *   promoCode?: string,
 *   loyaltyPercent?: number,
 *   lifetimeSpend?: number,
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
  const lifetimeSpend = roundMoney(input.lifetimeSpend || 0);
  return {
    subtotal,
    promoCode: input.promoCode ? String(input.promoCode).trim().toUpperCase() : "",
    promoPercent,
    promoAmount,
    lifetimeSpend,
    loyaltyPercent,
    loyaltyAmount,
    loyaltyLabel: loyaltyLabel(loyaltyPercent, lifetimeSpend),
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
export function getLifetimeSpend(storage) {
  const store = storage === undefined ? defaultStorage() : storage;
  const n = Number(store?.getItem(STORAGE_KEYS.loyaltySpend) || 0);
  return Number.isFinite(n) && n > 0 ? roundMoney(n) : 0;
}

/** @param {number} n @param {Storage | null} [storage] */
export function setLifetimeSpend(n, storage) {
  const store = storage === undefined ? defaultStorage() : storage;
  const v = roundMoney(Math.max(0, Number(n) || 0));
  try {
    store?.setItem(STORAGE_KEYS.loyaltySpend, String(v));
  } catch {
    /* ignore */
  }
  return v;
}

/** @param {number} merch @param {Storage | null} [storage] */
export function addLifetimeSpend(merch, storage) {
  return setLifetimeSpend(getLifetimeSpend(storage) + roundMoney(merch), storage);
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

/**
 * @param {string} loyaltyId
 * @returns {Promise<{ lifetime_spend: number, loyalty_percent: number, loyalty_percent_points: number, order_count: number, next_milestone: object } | null>}
 */
export async function fetchLoyaltySnapshot(loyaltyId) {
  const id = String(loyaltyId || "").trim();
  if (!id || typeof fetch === "undefined") return null;
  try {
    const r = await fetch(`/api/referrals.php?loyalty_id=${encodeURIComponent(id)}&_t=${Date.now()}`);
    if (!r.ok) return null;
    const data = await r.json();
    if (!data?.ok) return null;
    const spend = Number(data.lifetime_spend) || 0;
    return {
      lifetime_spend: spend,
      loyalty_percent: Number(data.loyalty_percent) || loyaltyRateFromSpend(spend),
      loyalty_percent_points: Number(data.loyalty_percent_points) || loyaltyPercentFromSpend(spend),
      order_count: Number(data.order_count || data.placed_count) || 0,
      next_milestone: data.next_milestone || nextSpendMilestone(spend),
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
