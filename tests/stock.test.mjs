import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isSoldOut, canAddToCart, defaultVariantOf } from '../src/lib/stock.js';
import { loadProducts } from './helpers-catalog.mjs';

test('manual flag OR every size out = sold out', () => {
  assert.equal(isSoldOut({ soldOut: true }), true);
  assert.equal(isSoldOut({ variants: [{ id: 'a', soldOut: true }, { id: 'b', soldOut: true }] }), true);
  assert.equal(isSoldOut({ variants: [{ id: 'a', soldOut: true }, { id: 'b' }] }), false);
  assert.equal(isSoldOut({ name: 'plain' }), false);
});
test('one size out: the in-stock size is the default and the out size cannot be added', () => {
  const p = { variants: [{ id: 'zip', soldOut: true }, { id: 'qp' }] };
  assert.equal(defaultVariantOf(p).id, 'qp');
  assert.equal(canAddToCart(p), true);
  assert.equal(canAddToCart(p, 'zip'), false);
  assert.equal(canAddToCart(p, 'qp'), true);
});
test('real catalog: no all-out-of-stock product can be added to the cart', () => {
  for (const p of loadProducts()) {
    if (isSoldOut(p)) {
      assert.equal(canAddToCart(p), false, p.name);
      for (const v of p.variants || []) assert.equal(canAddToCart(p, v.id), false, `${p.name} ${v.id}`);
    }
  }
});
test('real catalog with every size forced out: nothing is addable', () => {
  for (const p of loadProducts()) {
    const forced = p.variants?.length ? { ...p, variants: p.variants.map((v) => ({ ...v, soldOut: true })) } : { ...p, soldOut: true };
    assert.equal(canAddToCart(forced), false, p.name);
  }
});
test('card markup and cart both honour the rule', () => {
  const astro = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  const cart = readFileSync(new URL('../src/scripts/cart-ui.ts', import.meta.url), 'utf8');
  assert.match(astro, /disabled=\{soldOut\}/);
  assert.match(cart, /btn\.disabled \|\| btn\.dataset\.soldOut === "true"/);
});
