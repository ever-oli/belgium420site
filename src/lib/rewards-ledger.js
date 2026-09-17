/**
 * Client-side rewards ledger (admin localStorage fallback + export/import).
 * Mirrors the PHP ledger enough that ops can keep working if /api/referrals.php
 * is unreachable (local astro preview). Order payloads remain the source of truth.
 */

import {
  REFERRAL_CREDIT_GRANT,
  STORAGE_KEYS,
  loyaltyPercentFromSpend,
  nextSpendMilestone,
  normalizeEmail,
  normalizeReferralCode,
  roundMoney,
} from "./rewards.js";

export function emptyLedger() {
  return {
    version: 1,
    codes: {},
    events: [],
    loyalty: [],
    updated_at: new Date().toISOString(),
  };
}

export function loadLocalLedger(storage) {
  const store = storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  try {
    const raw = store?.getItem(STORAGE_KEYS.ledger);
    if (!raw) return emptyLedger();
    const parsed = JSON.parse(raw);
    return normalizeLedger(parsed);
  } catch {
    return emptyLedger();
  }
}

export function saveLocalLedger(ledger, storage) {
  const store = storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  const next = normalizeLedger(ledger);
  next.updated_at = new Date().toISOString();
  try {
    store?.setItem(STORAGE_KEYS.ledger, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}

export function normalizeLedger(raw) {
  const base = emptyLedger();
  if (!raw || typeof raw !== "object") return base;
  const codesIn = raw.codes && typeof raw.codes === "object" ? raw.codes : {};
  for (const [k, v] of Object.entries(codesIn)) {
    const code = normalizeReferralCode(v?.code || k);
    if (!code) continue;
    base.codes[code] = normalizeCodeRow(v, code);
  }
  if (Array.isArray(raw.events)) {
    base.events = raw.events.map(normalizeEvent).filter(Boolean);
  }
  if (Array.isArray(raw.loyalty)) {
    base.loyalty = raw.loyalty.map(normalizeLoyalty).filter(Boolean);
  }
  base.updated_at = raw.updated_at || base.updated_at;
  return base;
}

function normalizeCodeRow(v, code) {
  return {
    code,
    owner_email: normalizeEmail(v?.owner_email),
    note: String(v?.note || "").slice(0, 500),
    pending: roundMoney(v?.pending),
    available: roundMoney(v?.available),
    redeemed: roundMoney(v?.redeemed),
    referred_orders: Math.max(0, Math.floor(Number(v?.referred_orders) || 0)),
    created_at: v?.created_at || new Date().toISOString(),
    updated_at: v?.updated_at || new Date().toISOString(),
  };
}

function normalizeEvent(e) {
  if (!e || typeof e !== "object") return null;
  const code = normalizeReferralCode(e.code);
  const type = String(e.type || "");
  if (!code || !type) return null;
  return {
    id: String(e.id || newEventId()),
    at: e.at || new Date().toISOString(),
    type,
    code,
    order_id: String(e.order_id || ""),
    amount: roundMoney(e.amount),
    note: String(e.note || "").slice(0, 300),
  };
}

function normalizeLoyalty(row) {
  if (!row || typeof row !== "object") return null;
  const loyalty_id = String(row.loyalty_id || "").trim();
  const email = normalizeEmail(row.email);
  if (!loyalty_id && !email) return null;
  const placed = Math.max(0, Math.floor(Number(row.placed_count) || 0));
  const paid = Math.max(0, Math.floor(Number(row.paid_count) || 0));
  const lifetime_spend = roundMoney(row.lifetime_spend);
  const current_percent = loyaltyPercentFromSpend(lifetime_spend);
  const next = nextSpendMilestone(lifetime_spend);
  const history = Array.isArray(row.order_history)
    ? row.order_history
        .filter((h) => h && typeof h === "object")
        .slice(-20)
        .map((h) => ({
          id: String(h.id || ""),
          at: h.at || "",
          merch: roundMoney(h.merch),
          status: String(h.status || ""),
        }))
    : [];
  return {
    loyalty_id,
    email,
    own_code: normalizeReferralCode(row.own_code),
    placed_count: placed,
    paid_count: paid,
    lifetime_spend,
    current_percent,
    last_order_id: String(row.last_order_id || ""),
    last_order_at: row.last_order_at || "",
    note: String(row.note || "").slice(0, 500),
    next_reward: next.label,
    order_history: history,
  };
}

function newEventId() {
  return "EVT-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function ensureCode(ledger, code, extra = {}) {
  const c = normalizeReferralCode(code);
  if (!c) return null;
  if (!ledger.codes[c]) {
    ledger.codes[c] = normalizeCodeRow({ ...extra, code: c, created_at: new Date().toISOString() }, c);
  } else {
    if (extra.owner_email && !ledger.codes[c].owner_email) {
      ledger.codes[c].owner_email = normalizeEmail(extra.owner_email);
    }
    if (extra.note) ledger.codes[c].note = String(extra.note).slice(0, 500);
  }
  ledger.codes[c].updated_at = new Date().toISOString();
  return ledger.codes[c];
}

export function recordReferredOrder(ledger, { code, orderId, selfReferral = false, note = "" }) {
  const row = ensureCode(ledger, code);
  if (!row) return ledger;
  row.referred_orders += 1;
  if (!selfReferral) {
    row.pending = roundMoney(row.pending + REFERRAL_CREDIT_GRANT);
    ledger.events.push({
      id: newEventId(),
      at: new Date().toISOString(),
      type: "referred_order",
      code: row.code,
      order_id: orderId || "",
      amount: REFERRAL_CREDIT_GRANT,
      note: note || "pending $25 until order clears",
    });
  } else {
    ledger.events.push({
      id: newEventId(),
      at: new Date().toISOString(),
      type: "self_referral_blocked",
      code: row.code,
      order_id: orderId || "",
      amount: 0,
      note: "ops: reject self-referrals",
    });
  }
  return ledger;
}

/** Move pending $25 for an order (or all pending for a code) to available. */
export function markCleared(ledger, { code, orderId = "" }) {
  const row = ensureCode(ledger, code);
  if (!row) return ledger;
  const c = row.code;
  let moved = 0;
  if (orderId) {
    const pending = ledger.events.filter(
      (e) => e.code === c && e.type === "referred_order" && e.order_id === orderId,
    );
    const already = ledger.events.some(
      (e) => e.code === c && e.type === "cleared" && e.order_id === orderId,
    );
    if (already) return ledger;
    for (const e of pending) {
      moved = roundMoney(moved + e.amount);
    }
    if (moved <= 0 && row.pending > 0) moved = Math.min(row.pending, REFERRAL_CREDIT_GRANT);
  } else {
    moved = row.pending;
  }
  if (moved <= 0) return ledger;
  moved = Math.min(moved, row.pending);
  row.pending = roundMoney(row.pending - moved);
  row.available = roundMoney(row.available + moved);
  ledger.events.push({
    id: newEventId(),
    at: new Date().toISOString(),
    type: "cleared",
    code: c,
    order_id: orderId,
    amount: moved,
    note: "pending → available",
  });
  return ledger;
}

export function redeemCredit(ledger, { code, orderId = "", amount }) {
  const row = ensureCode(ledger, code);
  if (!row) return { ledger, applied: 0 };
  const want = roundMoney(amount);
  const applied = roundMoney(Math.min(Math.max(0, want), row.available));
  if (applied <= 0) return { ledger, applied: 0 };
  row.available = roundMoney(row.available - applied);
  row.redeemed = roundMoney(row.redeemed + applied);
  ledger.events.push({
    id: newEventId(),
    at: new Date().toISOString(),
    type: "redeemed",
    code: row.code,
    order_id: orderId,
    amount: applied,
    note: "checkout referral credit",
  });
  return { ledger, applied };
}

export function adjustAvailable(ledger, { code, delta, note = "" }) {
  const row = ensureCode(ledger, code);
  if (!row) return ledger;
  const d = roundMoney(delta);
  row.available = roundMoney(Math.max(0, row.available + d));
  ledger.events.push({
    id: newEventId(),
    at: new Date().toISOString(),
    type: "adjust",
    code: row.code,
    order_id: "",
    amount: d,
    note: note || "manual adjust",
  });
  return ledger;
}

export function upsertLoyalty(ledger, patch) {
  const loyalty_id = String(patch.loyalty_id || "").trim();
  const email = normalizeEmail(patch.email);
  if (!loyalty_id && !email) return null;
  let row = ledger.loyalty.find(
    (r) => (loyalty_id && r.loyalty_id === loyalty_id) || (email && r.email && r.email === email),
  );
  if (!row) {
    row = normalizeLoyalty({
      loyalty_id,
      email,
      own_code: patch.own_code,
      placed_count: 0,
      paid_count: 0,
      lifetime_spend: 0,
      order_history: [],
    });
    ledger.loyalty.push(row);
  }
  if (loyalty_id) row.loyalty_id = loyalty_id;
  if (email) row.email = email;
  if (patch.own_code) row.own_code = normalizeReferralCode(patch.own_code);
  if (patch.note != null) row.note = String(patch.note).slice(0, 500);
  if (patch.last_order_id) row.last_order_id = patch.last_order_id;
  if (patch.last_order_at) row.last_order_at = patch.last_order_at;
  if (patch.bump_placed) row.placed_count += 1;
  if (patch.bump_paid) row.paid_count += 1;
  if (Number.isFinite(Number(patch.placed_count))) row.placed_count = Math.max(0, Math.floor(patch.placed_count));
  if (Number.isFinite(Number(patch.paid_count))) row.paid_count = Math.max(0, Math.floor(patch.paid_count));
  if (Number.isFinite(Number(patch.lifetime_spend))) row.lifetime_spend = roundMoney(Math.max(0, patch.lifetime_spend));
  if (Number.isFinite(Number(patch.add_spend))) {
    row.lifetime_spend = roundMoney((row.lifetime_spend || 0) + Number(patch.add_spend));
  }
  if (patch.history_entry && typeof patch.history_entry === "object") {
    if (!Array.isArray(row.order_history)) row.order_history = [];
    row.order_history.push({
      id: String(patch.history_entry.id || ""),
      at: patch.history_entry.at || new Date().toISOString(),
      merch: roundMoney(patch.history_entry.merch),
      status: String(patch.history_entry.status || "received"),
    });
    row.order_history = row.order_history.slice(-20);
  }
  const next = nextSpendMilestone(row.lifetime_spend || 0);
  row.current_percent = loyaltyPercentFromSpend(row.lifetime_spend || 0);
  row.next_reward = next.label;
  return row;
}

export function mergeLedgers(base, incoming) {
  const a = normalizeLedger(base);
  const b = normalizeLedger(incoming);
  for (const [code, row] of Object.entries(b.codes)) {
    if (!a.codes[code]) a.codes[code] = row;
    else {
      a.codes[code] = {
        ...a.codes[code],
        owner_email: a.codes[code].owner_email || row.owner_email,
        note: row.note || a.codes[code].note,
        pending: roundMoney(Math.max(a.codes[code].pending, row.pending)),
        available: roundMoney(Math.max(a.codes[code].available, row.available)),
        redeemed: roundMoney(Math.max(a.codes[code].redeemed, row.redeemed)),
        referred_orders: Math.max(a.codes[code].referred_orders, row.referred_orders),
        updated_at: new Date().toISOString(),
      };
    }
  }
  const seen = new Set(a.events.map((e) => e.id));
  for (const e of b.events) {
    if (!seen.has(e.id)) a.events.push(e);
  }
  for (const row of b.loyalty) {
    upsertLoyalty(a, row);
  }
  return a;
}

export function ledgerToCsv(ledger) {
  const L = normalizeLedger(ledger);
  const lines = ["type,code,pending,available,redeemed,referred_orders,email,lifetime_spend,current_percent,note"];
  for (const row of Object.values(L.codes)) {
    lines.push(
      [
        "referral",
        csv(row.code),
        row.pending,
        row.available,
        row.redeemed,
        row.referred_orders,
        csv(row.owner_email),
        "",
        "",
        csv(row.note),
      ].join(","),
    );
  }
  for (const row of L.loyalty) {
    lines.push(
      [
        "loyalty",
        csv(row.own_code),
        "",
        "",
        "",
        "",
        csv(row.email || row.loyalty_id),
        row.lifetime_spend,
        row.current_percent,
        csv(row.next_reward),
      ].join(","),
    );
  }
  return lines.join("\n");
}

function csv(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function codesTable(ledger) {
  return Object.values(normalizeLedger(ledger).codes).sort((a, b) =>
    (b.updated_at || "").localeCompare(a.updated_at || ""),
  );
}
