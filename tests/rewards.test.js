/**
 * Rewards math + attribution + ledger helpers.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  captureReferralFromUrl,
  codeFromName,
  computeBreakdown,
  getLifetimeSpend,
  getOwnReferralCode,
  getReferralAttribution,
  isSelfReferral,
  loyaltyLabel,
  loyaltyPercentFromSpend,
  loyaltyRateFromSpend,
  nextSpendMilestone,
  normalizeReferralCode,
  setOwnReferralCode,
  shareUrlForCode,
  setLifetimeSpend,
  addLifetimeSpend,
  STORAGE_KEYS,
  REFERRAL_CREDIT_GRANT,
  LOYALTY_PERCENT_CAP,
} from '../src/lib/rewards.js';
import {
  emptyLedger,
  recordReferredOrder,
  markCleared,
  redeemCredit,
  adjustAvailable,
  upsertLoyalty,
  mergeLedgers,
} from '../src/lib/rewards-ledger.js';

function mem() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      m.set(k, String(v));
    },
    removeItem: (k) => {
      m.delete(k);
    },
  };
}

describe('normalizeReferralCode', () => {
  test('uppercases and strips junk', () => {
    assert.equal(normalizeReferralCode(' test '), 'TEST');
    assert.equal(normalizeReferralCode('Jane_Doe-1'), 'JANE_DOE-1');
    assert.equal(normalizeReferralCode('x'), '');
    assert.equal(normalizeReferralCode('ab'), 'AB');
  });
});

describe('loyalty percents', () => {
  test('1% per $100 spent, integer floor, cap 25%', () => {
    assert.equal(loyaltyPercentFromSpend(0), 0);
    assert.equal(loyaltyPercentFromSpend(99), 0);
    assert.equal(loyaltyPercentFromSpend(100), 1);
    assert.equal(loyaltyPercentFromSpend(199), 1);
    assert.equal(loyaltyPercentFromSpend(250), 2);
    assert.equal(loyaltyPercentFromSpend(1000), 10);
    assert.equal(loyaltyPercentFromSpend(2500), 25);
    assert.equal(loyaltyPercentFromSpend(9999), 25);
    assert.equal(LOYALTY_PERCENT_CAP, 25);
    assert.equal(loyaltyRateFromSpend(250), 0.02);
  });

  test('labels match checkout copy', () => {
    assert.match(loyaltyLabel(0.02, 250), /Loyalty: 2% off/);
    assert.match(loyaltyLabel(2, 250), /cap 25%/);
    assert.equal(loyaltyLabel(0, 50), '');
  });

  test('next spend milestone', () => {
    assert.equal(nextSpendMilestone(0).nextPercent, 1);
    assert.equal(nextSpendMilestone(0).spendNeeded, 100);
    assert.equal(nextSpendMilestone(250).nextPercent, 3);
    assert.equal(nextSpendMilestone(2500).capped, true);
  });
});

describe('computeBreakdown', () => {
  test('loyalty 2% on $100 merch after $250 lifetime, free shipping', () => {
    const b = computeBreakdown({
      subtotal: 100,
      loyaltyPercent: loyaltyRateFromSpend(250),
      lifetimeSpend: 250,
    });
    assert.equal(b.loyaltyAmount, 2);
    assert.equal(b.merch, 98);
    assert.equal(b.shipping, 0);
    assert.equal(b.total, 98);
    assert.match(b.loyaltyLabel, /2% off/);
  });

  test('this order does not include itself in spend', () => {
    const prior = 90;
    const b = computeBreakdown({
      subtotal: 50,
      loyaltyPercent: loyaltyRateFromSpend(prior),
      lifetimeSpend: prior,
    });
    assert.equal(b.loyaltyPercent, 0);
    assert.equal(b.loyaltyAmount, 0);
  });

  test('promo then loyalty then $25 credit, shipping on remaining merch', () => {
    const b = computeBreakdown({
      subtotal: 50,
      promoPercent: 0.1,
      promoCode: 'BELGIUM10',
      loyaltyPercent: 0.02,
      lifetimeSpend: 250,
      referralCredit: REFERRAL_CREDIT_GRANT,
      referralCreditCode: 'ALICE',
    });
    // 50 - 5 promo - 1.00 loyalty = 44.00, then $25 credit → 19.00 merch + $25 ship
    assert.equal(b.promoAmount, 5);
    assert.equal(b.loyaltyAmount, 1);
    assert.equal(b.referralCreditAmount, 25);
    assert.equal(b.merch, 19);
    assert.equal(b.shipping, 25);
    assert.equal(b.total, 44);
  });

  test('credit cannot exceed merch after percents', () => {
    const b = computeBreakdown({
      subtotal: 20,
      referralCredit: 25,
    });
    assert.equal(b.referralCreditAmount, 20);
    assert.equal(b.merch, 0);
    assert.equal(b.shipping, 0);
    assert.equal(b.total, 0);
  });
});

describe('referral attribution', () => {
  test('?ref=TEST last-click wins over older code', () => {
    const s = mem();
    captureReferralFromUrl('?ref=OLD', s);
    captureReferralFromUrl('?referral=TEST', s);
    const rec = getReferralAttribution(s);
    assert.equal(rec.code, 'TEST');
    assert.ok(rec.expiresAt > Date.now());
  });

  test('expired attribution is ignored', () => {
    const s = mem();
    s.setItem(
      STORAGE_KEYS.ref,
      JSON.stringify({ code: 'OLD', capturedAt: 1, expiresAt: 2 }),
    );
    assert.equal(getReferralAttribution(s), null);
  });

  test('own code + share URL', () => {
    const s = mem();
    assert.equal(setOwnReferralCode('jane', s), 'JANE');
    assert.equal(getOwnReferralCode(s), 'JANE');
    assert.equal(shareUrlForCode('JANE'), 'https://belgium420.com/?ref=JANE');
    assert.ok(codeFromName('Jane Doe').startsWith('JANEDOE') || codeFromName('Jane Doe').length >= 3);
  });

  test('self-referral when codes match or emails match', () => {
    assert.equal(isSelfReferral('TEST', 'TEST', '', ''), true);
    assert.equal(isSelfReferral('TEST', 'OTHER', 'a@b.com', 'a@b.com'), true);
    assert.equal(isSelfReferral('TEST', 'OTHER', 'a@b.com', 'z@b.com'), false);
  });
});

describe('lifetime spend', () => {
  test('stores spend used for the next order percent', () => {
    const s = mem();
    assert.equal(getLifetimeSpend(s), 0);
    addLifetimeSpend(80, s);
    assert.equal(loyaltyPercentFromSpend(getLifetimeSpend(s)), 0);
    addLifetimeSpend(40, s);
    assert.equal(getLifetimeSpend(s), 120);
    assert.equal(loyaltyPercentFromSpend(getLifetimeSpend(s)), 1);
    setLifetimeSpend(1000, s);
    assert.equal(loyaltyPercentFromSpend(getLifetimeSpend(s)), 10);
  });
});

describe('ledger', () => {
  test('referred order pending → cleared → redeem', () => {
    let L = emptyLedger();
    recordReferredOrder(L, { code: 'TEST', orderId: 'B420-1' });
    assert.equal(L.codes.TEST.pending, 25);
    assert.equal(L.codes.TEST.referred_orders, 1);
    markCleared(L, { code: 'TEST', orderId: 'B420-1' });
    assert.equal(L.codes.TEST.pending, 0);
    assert.equal(L.codes.TEST.available, 25);
    const { applied } = redeemCredit(L, { code: 'TEST', orderId: 'B420-2', amount: 25 });
    assert.equal(applied, 25);
    assert.equal(L.codes.TEST.available, 0);
    assert.equal(L.codes.TEST.redeemed, 25);
  });

  test('self-referral does not grant credit', () => {
    const L = emptyLedger();
    recordReferredOrder(L, { code: 'ME', orderId: '1', selfReferral: true });
    assert.equal(L.codes.ME.pending, 0);
    assert.equal(L.codes.ME.referred_orders, 1);
  });

  test('adjust and loyalty upsert', () => {
    const L = emptyLedger();
    adjustAvailable(L, { code: 'TEST', delta: 25 });
    assert.equal(L.codes.TEST.available, 25);
    const row = upsertLoyalty(L, { email: 'a@b.com', loyalty_id: 'L1', add_spend: 250, bump_placed: true });
    assert.equal(row.lifetime_spend, 250);
    assert.equal(row.current_percent, 2);
    assert.match(row.next_reward, /3% off/);
  });

  test('merge keeps higher balances', () => {
    const a = emptyLedger();
    const b = emptyLedger();
    recordReferredOrder(a, { code: 'TEST', orderId: '1' });
    recordReferredOrder(b, { code: 'TEST', orderId: '2' });
    markCleared(b, { code: 'TEST', orderId: '2' });
    const m = mergeLedgers(a, b);
    assert.ok(m.codes.TEST.referred_orders >= 1);
    assert.ok(m.events.length >= 2);
  });
});
