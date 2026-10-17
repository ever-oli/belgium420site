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
