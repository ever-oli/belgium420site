import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SECTIONS, SECTION_IDS, NAV_SECTIONS, resolveAnchor, CATEGORY_ALIASES } from '../src/config/sections.mjs';

const astro = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const CATS = ['all', 'flower', 'carts', 'concentrates', 'small-sizes', 'pounds', 'mushrooms', 'edibles', 'prerolls'];

test('section ids and aliases are unique', () => {
  const all = SECTIONS.flatMap((s) => [s.id, ...(s.aliases || [])]);
  assert.equal(new Set(all).size, all.length);
});
test('every configured section has a matching id on the homepage', () => {
  for (const id of SECTION_IDS) assert.match(astro, new RegExp(`<section[^>]*id="${id}"`), id);
});
test('nav and jump bar render from the config, not hand-written lists', () => {
  assert.ok(NAV_SECTIONS.length >= 4);
  assert.doesNotMatch(astro, /<li><a href="#lab">/);
  assert.doesNotMatch(astro, /<a href="#rewards">Rewards<\/a>/);
});
test('aliases resolve to sections and categories', () => {
  assert.deepEqual(resolveAnchor('#coa', CATS), { section: 'lab' });
  assert.deepEqual(resolveAnchor('#Shop', CATS), { section: 'shop' });
  assert.deepEqual(resolveAnchor('#pounds', CATS), { section: 'shop', cat: 'pounds' });
  assert.deepEqual(resolveAnchor('#lbs', CATS), { section: 'shop', cat: 'pounds' });
  assert.equal(resolveAnchor('#all', CATS), null);
  assert.equal(resolveAnchor('#nope', CATS), null);
  assert.equal(resolveAnchor('', CATS), null);
});
test('every category alias points at a real category', () => {
  for (const [a, c] of Object.entries(CATEGORY_ALIASES)) assert.ok(CATS.includes(c), a);
});
