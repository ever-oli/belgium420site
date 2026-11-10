import { unitPriceForQty } from "../lib/tier-pricing.js";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function syncCard(card: HTMLElement) {
  const base = card.getAttribute("data-tier-product");
  const btn = card.querySelector<HTMLButtonElement>(".add-to-cart");
  if (!base || !btn) return;
  const flavor = card.querySelector<HTMLSelectElement>(".flavor-select");
  const qtyEl = card.querySelector<HTMLInputElement>(".drop-qty");
  const priceEl = card.querySelector(".card-price, .drop-price, .product-card-price");
  const lineEl = card.querySelector(".drop-line-total");
  const qty = Math.max(1, Math.round(Number(qtyEl?.value) || 1));
  if (qtyEl) qtyEl.value = String(qty);
  const unit = unitPriceForQty(base, qty);
  if (unit == null) return;
  const flavorId = flavor?.value || "";
  const flavorName = flavor?.selectedOptions?.[0]?.text || "";
  const baseName = btn.dataset.baseName || btn.dataset.name || "";
  const name = flavorName ? `${baseName} · ${flavorName}` : baseName;
  const batch = flavorId ? `${base}-${flavorId}` : base;
  btn.dataset.price = String(unit);
  btn.dataset.qty = String(qty);
  btn.dataset.batch = batch;
  btn.dataset.baseBatch = base;
  btn.dataset.name = name;
  btn.setAttribute("aria-label", `Add ${name} to cart`);
  if (priceEl) priceEl.innerHTML = `${money(unit)} <span class="per">each</span>`;
  if (lineEl) lineEl.textContent = `${qty} × ${money(unit)} = ${money(unit * qty)}`;
}

export function initTierCards() {
  document.querySelectorAll<HTMLElement>("[data-tier-product]").forEach((card) => {
    syncCard(card);
    card.querySelector(".flavor-select")?.addEventListener("change", () => syncCard(card));
    card.querySelector(".drop-qty")?.addEventListener("input", () => syncCard(card));
    card.querySelector(".drop-qty")?.addEventListener("change", () => syncCard(card));
    card.querySelector(".add-to-cart")?.addEventListener("click", () => syncCard(card), true);
  });

  document.querySelectorAll<HTMLElement>(".card-thumbs").forEach((row) => {
    const card = row.closest("article, .product-card, .drop-card");
    const main = card?.querySelector<HTMLImageElement>("[data-gallery-main]");
    row.querySelectorAll<HTMLButtonElement>("[data-full]").forEach((thumb) => {
      thumb.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const src = thumb.getAttribute("data-full");
        if (main && src) main.src = src;
        const atc = card?.querySelector<HTMLButtonElement>(".add-to-cart");
        if (atc && src) atc.dataset.img = src;
        row.querySelectorAll("[data-full]").forEach((b) => b.classList.toggle("is-active", b === thumb));
      });
    });
  });
}
