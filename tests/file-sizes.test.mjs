import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { check, limitFor, MAX_BYTES } from '../scripts/check-file-sizes.mjs';

test('new source files are capped, media and generated files are ignored', () => {
  assert.equal(limitFor('src/lib/new.js'), MAX_BYTES);
  assert.deepEqual(check(['src/lib/big.js'], () => MAX_BYTES + 1).length, 1);
  assert.deepEqual(check(['public/inventory/x.jpg', 'dist/index.html'], () => 9e9), []);
});
test('grandfathered files may only grow 10% over their baseline', () => {
  const lim = limitFor('src/pages/index.astro');
  assert.ok(lim > MAX_BYTES);
  assert.equal(check(['src/pages/index.astro'], () => lim + 1).length, 1);
});
test('every tracked file in the repo is within its limit right now', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const bad = check(files, (f) => { try { return statSync(f).size; } catch { return 0; } });
  assert.deepEqual(bad, []);
});
