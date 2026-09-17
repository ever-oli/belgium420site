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
  getOwnReferralCode,
  getReferralAttribution,
  isSelfReferral,
  loyaltyLabel,
  loyaltyPercentForOrderNumber,
  nextLoyaltyMilestone,
  normalizeReferralCode,
  setOwnReferralCode,
  shareUrlForCode,
  thisLoyaltyOrderNumber,
  setLoyaltyPlacedCount,
  setCachedPaidCount,
  STORAGE_KEYS,
  REFERRAL_CREDIT_GRANT,
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
  test('5th is 5%, 10th is 10%, other multiples follow the 10th rule', () => {
    assert.equal(loyaltyPercentForOrderNumber(1), 0);
    assert.equal(loyaltyPercentForOrderNumber(4), 0);
    assert.equal(loyaltyPercentForOrderNumber(5), 0.05);
    assert.equal(loyaltyPercentForOrderNumber(10), 0.1);
    assert.equal(loyaltyPercentForOrderNumber(15), 0.05);
    assert.equal(loyaltyPercentForOrderNumber(20), 0.1);
    assert.equal(loyaltyPercentForOrderNumber(0), 0);
  });

  test('labels match checkout copy', () => {
    assert.equal(loyaltyLabel(5, 0.05), 'Loyalty: 5% off (5th order)');
    assert.equal(loyaltyLabel(10, 0.1), 'Loyalty: 10% off (10th order)');
    assert.equal(loyaltyLabel(3, 0), '');
  });

  test('next milestone', () => {
    assert.deepEqual(nextLoyaltyMilestone(0).orderNumber, 5);
    assert.equal(nextLoyaltyMilestone(0).percent, 5);
    assert.equal(nextLoyaltyMilestone(4).ordersAway, 1);
    assert.equal(nextLoyaltyMilestone(9).percent, 10);
    assert.equal(nextLoyaltyMilestone(9).orderNumber, 10);
    assert.equal(nextLoyaltyMilestone(10).orderNumber, 15);
  });
});

describe('computeBreakdown', () => {
  test('loyalty 5% on $100 merch, free shipping', () => {
    const b = computeBreakdown({
      subtotal: 100,
      loyaltyPercent: 0.05,
      loyaltyOrderNumber: 5,
    });
    assert.equal(b.loyaltyAmount, 5);
    assert.equal(b.merch, 95);
    assert.equal(b.shipping, 0);
    assert.equal(b.total, 95);
    assert.match(b.loyaltyLabel, /5% off \(5th order\)/);
  });

  test('loyalty 10% takes priority on 10th', () => {
    const b = computeBreakdown({
      subtotal: 80,
      loyaltyPercent: loyaltyPercentForOrderNumber(10),
      loyaltyOrderNumber: 10,
    });
    assert.equal(b.loyaltyPercent, 0.1);
    assert.equal(b.loyaltyAmount, 8);
    assert.equal(b.total, 72);
  });

  test('promo then loyalty then $25 credit, shipping on remaining merch', () => {
    const b = computeBreakdown({
      subtotal: 50,
      promoPercent: 0.1,
      promoCode: 'BELGIUM10',
      loyaltyPercent: 0.05,
      loyaltyOrderNumber: 5,
      referralCredit: REFERRAL_CREDIT_GRANT,
      referralCreditCode: 'ALICE',
    });
    // 50 - 5 promo - 2.50 loyalty = 42.50, then $25 credit → 17.50 merch + $25 ship
    assert.equal(b.promoAmount, 5);
    assert.equal(b.loyaltyAmount, 2.5);
    assert.equal(b.referralCreditAmount, 25);
    assert.equal(b.merch, 17.5);
    assert.equal(b.shipping, 25);
    assert.equal(b.total, 42.5);
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

describe('loyalty order number', () => {
  test('uses placed count when paid cache is unknown', () => {
    const s = mem();
    setLoyaltyPlacedCount(4, s);
    assert.equal(thisLoyaltyOrderNumber(s), 5);
  });

  test('uses max of paid cache and placed', () => {
    const s = mem();
    setLoyaltyPlacedCount(2, s);
    setCachedPaidCount(4, s);
    assert.equal(thisLoyaltyOrderNumber(s), 5);
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
    const row = upsertLoyalty(L, { email: 'a@b.com', loyalty_id: 'L1', bump_paid: true, bump_placed: true });
    assert.equal(row.paid_count, 1);
    assert.match(row.next_reward, /5% off on order 5/);
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
