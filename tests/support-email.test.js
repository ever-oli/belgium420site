import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { SUPPORT_EMAIL, supportContactPoint, supportMailto } from '../src/lib/support.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const STALE_CONTACT = 'mstwntdpacks@gmail.com';

function walk(dir) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) out.push(...walk(file));
    else out.push(file);
  }
  return out;
}

describe('support email', () => {
  test('the shared constant is the monitored inbox', () => {
    assert.equal(SUPPORT_EMAIL, 'support@belgium420.com');
    assert.equal(supportMailto(), `mailto:${SUPPORT_EMAIL}`);
    assert.equal(
      supportMailto('Inquiry: Kleenek', 'Hi there'),
      `mailto:${SUPPORT_EMAIL}?subject=Inquiry%3A%20Kleenek&body=Hi%20there`,
    );
    assert.equal(supportContactPoint().email, SUPPORT_EMAIL);
    assert.equal(supportContactPoint().contactType, 'customer support');
  });

  test('shopper pages import the constant and do not hard-code an address', () => {
    const expected = [
      'src/pages/index.astro',
      'src/pages/checkout.astro',
      'src/pages/contact.astro',
      'src/pages/privacy.astro',
      'src/pages/refund.astro',
      'src/pages/terms.astro',
      'src/pages/404.astro',
      'src/pages/admin.astro',
      'src/layouts/PlainPage.astro',
      'src/scripts/cart-ui.ts',
    ];
    for (const rel of expected) {
      const text = readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(text, /from ['"][^'"]*support\.js['"]/, `${rel} should import support.js`);
      assert.match(text, /SUPPORT_EMAIL|supportMailto|supportHelpHtml|supportContactPoint/, `${rel} should use the helper`);
      assert.equal(text.includes(SUPPORT_EMAIL), false, `${rel} hard-codes the support address`);
      assert.equal(text.includes(STALE_CONTACT), false, `${rel} still has the old contact address`);
    }
  });

  test('no stale public contact address remains in shopper source', () => {
    const roots = ['src/pages', 'src/layouts', 'src/components', 'src/scripts', 'src/lib'];
    const hits = [];
    for (const rel of roots) {
      for (const file of walk(path.join(ROOT, rel))) {
        const text = readFileSync(file, 'utf8');
        if (!text.includes(STALE_CONTACT)) continue;
        hits.push(path.relative(ROOT, file));
      }
    }
    assert.deepEqual(hits, []);
  });

  test('the support address is defined once', () => {
    const roots = ['src/pages', 'src/layouts', 'src/components', 'src/scripts', 'src/lib'];
    const hits = [];
    for (const rel of roots) {
      for (const file of walk(path.join(ROOT, rel))) {
        const text = readFileSync(file, 'utf8');
        if (!text.includes(SUPPORT_EMAIL)) continue;
        hits.push(path.relative(ROOT, file));
      }
    }
    assert.deepEqual(hits, ['src/lib/support.js']);
  });

  test('operator order alerts still use the owner inbox', () => {
    const php = readFileSync(path.join(ROOT, 'public/api/orders.php'), 'utf8');
    assert.match(php, /const OWNER_EMAIL\s+=\s+'mstwntdpacks@gmail.com'/);
    assert.match(php, /const FROM_EMAIL\s+=\s+'orders@belgium420.com'/);
  });
});
