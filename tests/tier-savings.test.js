import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { savePercents } from '../src/lib/tier-savings.js';

describe('tier savings', () => {
  test('Whole Melts quantity tiers save against the $30 single', () => {
    const pct = savePercents([
      { id: 'single', label: '1 Unit · $30', type: 'Dual Chamber Disposable · 1 unit', price: 30 },
      { id: 'ten', label: '10 Units · $200', type: 'Dual Chamber Disposable · 10 units ($20 ea)', price: 200 },
      { id: 'fifty', label: '50 Units · $900', type: 'Dual Chamber Disposable · 50 units ($18 ea)', price: 900 },
      { id: 'hundred', label: '100 Units · $1,800', type: 'Dual Chamber Disposable · 100 units ($18 ea)', price: 1800 },
    ]);
    assert.deepEqual(pct, [0, 33, 40, 40]);
  });

  test('flower weight tiers compare price per gram and hide sub-5% saves', () => {
    const pct = savePercents([
      { id: '3p5', label: '3.5g', type: 'Flower · 3.5g (eighth)', price: 30 },
      { id: '7g', label: '7g', type: 'Flower · 7g (quarter)', price: 60 },
      { id: 'zip', label: 'Zip', type: 'Flower Zip · 28g (1 oz)', price: 200 },
    ]);
    assert.deepEqual(pct, [0, 0, 17]);
  });

  test('zip versus QP uses 28g and 113g', () => {
    const pct = savePercents([
      { id: 'zip', label: 'Zip', type: 'Flower Zip · 28g (1 oz)', price: 200 },
      { id: 'qp', label: 'QP', type: 'Flower · 113g (QP)', price: 625 },
    ]);
    assert.deepEqual(pct, [0, 23]);
  });

  test('multi-zip bundles use total grams', () => {
    const pct = savePercents([
      { id: 'zip', label: '1 Zip', type: 'Premium Flower · 28g (Zip)', price: 250 },
      { id: '3zips', label: '3 Zips', type: 'Premium Flower · 3×28g', price: 450 },
    ]);
    assert.deepEqual(pct, [0, 40]);
  });
});
