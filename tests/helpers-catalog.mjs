// Reads the live `products` array out of src/pages/index.astro so tests run on the real catalog.
import { readFileSync } from 'node:fs';
export function loadProducts() {
  const src = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  const start = src.indexOf('const products = [');
  let depth = 0;
  for (let i = src.indexOf('[', start); i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']' && --depth === 0) return Function(`return ${src.slice(src.indexOf('[', start), i + 1)}`)();
  }
  throw new Error('products array not found');
}
