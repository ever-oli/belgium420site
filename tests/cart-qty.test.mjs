import assert from 'node:assert/strict';
import { describe, test, beforeEach } from 'node:test';

// --- minimal browser globals so cart.ts can run under node --test ---
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const events = [];
globalThis.window = {
  dispatchEvent: (e) => events.push(e),
};
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

const { addToCart, getCart, cartTotal, cartCount, cartBreakdown, removeFromCart, stepQty, setQty, itemLineTotal, itemQty } = await import('../src/scripts/cart.ts');

const judge = {
  batch: 'JUDGE-1700', name: 'The Judge', type: 'Hybrid • 1700g jar', price: 1700,
  tone: 'yellow', img: '/inventory/pounds/the-judge-1700-pound.jpeg', categories: ['pounds'], isPound: true,
};
const sharp = { ...judge, batch: 'SHARP-1900', name: 'Sharpiez', price: 1900, categories: ['pounds'] };

describe('cart qty', () => {
  beforeEach(() => store.clear());

  test('adding same batch twice merges into one line with qty 2', () => {
    addToCart(judge);
    addToCart(judge);
    const items = getCart();
    assert.equal(items.length, 1);
    assert.equal(items[0].qty, 2);
    assert.equal(cartTotal(), 3400);
    assert.equal(cartCount(), 2);
  });

  test('different batches stay separate lines', () => {
    addToCart(judge);
    addToCart(sharp);
    addToCart(judge);
    const items = getCart();
    assert.equal(items.length, 2);
    assert.equal(cartTotal(), 1700 * 2 + 1900);
    assert.equal(cartCount(), 3);
  });

  test('stepQty increments and decrements; removing last unit drops the line', () => {
    addToCart(sharp);
    stepQty(sharp.batch, 2);
    assert.equal(getCart()[0].qty, 3);
    stepQty(sharp.batch, -1);
    assert.equal(getCart()[0].qty, 2);
    stepQty(sharp.batch, -1); // → 1, still a line
    assert.equal(itemQty(getCart()[0]), 1);
    stepQty(sharp.batch, -1); // → 0, line drops
    assert.equal(getCart().length, 0);
  });

  test('setQty clamps and removes below 1', () => {
    addToCart(judge);
    setQty(judge.batch, 0);
    assert.equal(getCart().length, 0);
    addToCart(judge);
    setQty(judge.batch, 5000);
    assert.equal(getCart()[0].qty, 999);
    assert.equal(itemLineTotal(getCart()[0]), 1700 * 999);
  });

  test('legacy duplicate lines are merged on read', () => {
    store.set('b420_cart_v1', JSON.stringify([judge, judge, judge, { batch: 'BAD', name: 'x', price: 'n/a' }]));
    const items = getCart();
    assert.equal(items.length, 1);
    assert.equal(items[0].qty, 3);
    assert.equal(cartTotal(), 5100);
  });

  test('High 90s and Devour Sour Mango charge the quantity tier', () => {
    const high = {
      batch: 'B420-2026-1409',
      baseBatch: 'B420-2026-1409',
      name: 'High 90s 2g Vape',
      type: 'Disposable Vape · 2g',
      price: 20,
      tone: 'red',
      img: null,
      qty: 10,
    };
    const devour = {
      batch: 'B420-2026-1602',
      baseBatch: 'B420-2026-1602',
      name: 'Devour Sour Mango Gummies',
      type: 'Gummies · Sour Mango',
      price: 20,
      tone: 'yellow',
      img: null,
      qty: 100,
    };
    addToCart(high);
    addToCart(devour);
    const items = getCart();
    const highLine = items.find((it) => it.batch === high.batch);
    const devourLine = items.find((it) => it.batch === devour.batch);
    assert.equal(highLine.price, 18);
    assert.equal(itemLineTotal(highLine), 180);
    assert.equal(devourLine.price, 15);
    assert.equal(itemLineTotal(devourLine), 1500);
    assert.equal(cartTotal(), 1680);

    setQty(high.batch, 9);
    setQty(devour.batch, 50);
    const after = getCart();
    assert.equal(after.find((it) => it.batch === high.batch).price, 20);
    assert.equal(after.find((it) => it.batch === devour.batch).price, 16.5);

    setQty(high.batch, 100);
    assert.equal(getCart().find((it) => it.batch === high.batch).price, 15);
    assert.equal(itemLineTotal(getCart().find((it) => it.batch === high.batch)), 1500);
  });

  test('disposables and carts use the Hollow Tips breaks; High 90s does not', () => {
    const bodega = {
      batch: 'B420-2026-1402',
      baseBatch: 'B420-2026-1402',
      name: 'Bodega Boyz Cart',
      type: 'Live Resin Cart · 2g',
      price: 25,
      tone: 'yellow',
      img: null,
      qty: 11,
    };
    const melts = {
      batch: 'B420-2026-WM-P6V2-wifi-og',
      baseBatch: 'B420-2026-WM-P6V2',
      name: 'Whole Melts Phase 6 V2 · Wifi OG',
      type: 'WM Extracts Dual Chamber Disposable Vaporizer',
      price: 20,
      tone: 'yellow',
      img: null,
      qty: 100,
    };
    addToCart(bodega);
    addToCart(melts);
    const items = getCart();
    const bodegaLine = items.find((it) => it.batch === bodega.batch);
    const meltsLine = items.find((it) => it.batch === melts.batch);
    assert.equal(bodegaLine.price, 19);
    assert.equal(itemLineTotal(bodegaLine), 209);
    assert.equal(meltsLine.price, 16);
    assert.equal(itemLineTotal(meltsLine), 1600);

    addToCart({
      batch: 'B420-2026-MUHA-AIO-arctic-blueberry',
      baseBatch: 'B420-2026-MUHA-AIO',
      name: 'Muha Meds All-In-One · Arctic Blueberry (Hybrid)',
      type: 'All-In-One · 2000mg · 0.071 oz',
      price: 20,
      tone: 'yellow',
      img: null,
      qty: 11,
    });
    const muha = getCart().find((it) => it.batch.startsWith('B420-2026-MUHA-AIO'));
    assert.equal(muha.price, 19);
    assert.equal(itemLineTotal(muha), 209);

    setQty(bodega.batch, 10);
    setQty(melts.batch, 51);
    const mid = getCart();
    assert.equal(mid.find((it) => it.batch === bodega.batch).price, 20);
    assert.equal(mid.find((it) => it.batch === melts.batch).price, 18);

    const high = getCart().find((it) => it.batch === 'B420-2026-1409');
    assert.equal(high, undefined);
  });

  test('Sherb x Doja Live Resin Vape stays a flat $45', () => {
    addToCart({
      batch: 'B420-2026-SHERB-DOJA-zoap-sour-x-kalimotas',
      baseBatch: 'B420-2026-SHERB-DOJA',
      name: 'Sherb x Doja Live Resin Vape · Zoap Sour x Kalimotas',
      type: 'Quattro quad-coil dual chamber · 2.0g',
      price: 45,
      tone: 'black',
      img: null,
      qty: 100,
    });
    assert.equal(getCart()[0].price, 45);
    assert.equal(cartTotal(), 4500);
  });

  test('a non-tier product keeps its unit price when quantity changes', () => {
    addToCart({ ...judge, qty: 100 });
    assert.equal(getCart()[0].price, 1700);
    assert.equal(cartTotal(), 170000);
  });

  test('breakdown totals and pounds subtotal scale with qty', () => {
    addToCart(judge); // pound
    addToCart(judge);
    addToCart(sharp);
    const b = cartBreakdown({});
    assert.equal(b.subtotal, 1700 * 2 + 1900);
    // both test items are pounds → whole subtotal counts as pounds
    assert.equal(b.poundsSubtotal, 5300);
    assert.equal(b.otherSubtotal, 0);
  });

  test('removeFromCart removes whole stacked line', () => {
    addToCart(judge);
    addToCart(judge);
    removeFromCart(judge.batch);
    assert.equal(getCart().length, 0);
  });
});
