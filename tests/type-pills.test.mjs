import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TYPE_PILLS, WEIGHT_PILLS, weightPillsFor } from '../src/config/type-pills.mjs';
import { loadProducts } from './helpers-catalog.mjs';

const astro = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const products = loadProducts();

test('pill rows equal the spec, in order', () => {
  assert.deepEqual(TYPE_PILLS.map((p) => p.id), ['indica', 'hybrid', 'sativa', 'branded']);
  assert.deepEqual(WEIGHT_PILLS.map((p) => p.id), ['eighth', 'quarter', 'half', 'zip', 'qp', 'half-lb', 'lb']);
});
test('weight pills come from offered sizes; QP is a quarter POUND', () => {
  const v = (...labels) => ({ categories: ['flower'], type: 'Flower', variants: labels.map((l) => ({ label: l, type: l })) });
  assert.deepEqual(weightPillsFor(v('3.5g', '7g', 'Zip')), ['eighth', 'quarter', 'zip']);
  assert.deepEqual(weightPillsFor({ categories: ['flower'], type: 'Flower · Zip – QP' }), ['zip', 'qp']);
  assert.deepEqual(weightPillsFor({ categories: ['concentrates'], type: 'Live Resin Sugar · Half Pound' }), ['half-lb']);
  assert.deepEqual(weightPillsFor({ categories: ['flower', 'pounds'], type: 'CBD Flower · 1lb (Bulk)' }), ['lb']);
  assert.deepEqual(weightPillsFor({ categories: ['carts'], type: 'Live Resin Cart · 2g' }), []);
  assert.deepEqual(weightPillsFor({ categories: ['prerolls'], type: 'Pre-roll · 14 × 0.5g (7g)' }), []);
});
test('real catalog: every Pounds product is under the Pounds weight pill', () => {
  for (const p of products.filter((x) => x.categories.includes('pounds') && /1\s?lb|454g/i.test(x.type))) {
    assert.ok(weightPillsFor(p).includes('lb'), p.name);
  }
});
test('real catalog: every flower product lands in at least one weight pill', () => {
  const miss = products.filter((p) => p.categories.includes('flower') && !p.inquiryOnly && weightPillsFor(p).length === 0).map((p) => `${p.name} (${p.type})`);
  assert.deepEqual(miss, []);
});
test('cards carry data-sizes and the Size rows render from WEIGHT_PILLS', () => {
  assert.match(astro, /data-sizes=\{weightPillsFor\(p\)/);
  assert.equal((astro.match(/WEIGHT_PILLS\.map/g) || []).length, 2);
});
