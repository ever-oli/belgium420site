// Cart UI — badge in nav + slide-out drawer + add-to-cart wiring.
// Listens for `cart:changed` events from cart.ts to re-render.

import {
  getCart,
  addToCart,
  removeFromCart,
  formatPrice,
  cartBreakdown,
  type CartItem,
} from "./cart";
import {
  captureReferralFromUrl,
  ensureLoyaltyId,
  fetchLoyaltySnapshot,
  getReferralAttribution,
  setLifetimeSpend,
  setLoyaltyPlacedCount,
  shareUrlForCode,
} from "../lib/rewards.js";

// ---------- helpers ----------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("data-") || k.startsWith("aria-")) node.setAttribute(k, v);
    else (node as unknown as Record<string, unknown>)[k] = v;
  }
  for (const c of children) {
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function money(n: number) {
  return formatPrice(n);
}

// ---------- drawer ----------

function buildDrawer(): {
  drawer: HTMLElement;
  body: HTMLElement;
  footer: HTMLElement;
  countEl: HTMLElement;
} {
  const drawer = el("div", { class: "cart-drawer", id: "cartDrawer", "aria-hidden": "true" });
  drawer.innerHTML = `
    <div class="cart-drawer-backdrop" data-cart-close></div>
    <aside class="cart-drawer-panel" role="dialog" aria-label="Your cart">
      <header class="cart-drawer-head">
        <h2>Your Cart</h2>
        <button type="button" class="cart-drawer-close" data-cart-close aria-label="Close cart">&times;</button>
      </header>
      <div class="cart-drawer-body" id="cartDrawerBody"></div>
      <footer class="cart-drawer-foot" id="cartDrawerFoot"></footer>
    </aside>
  `;
  document.body.appendChild(drawer);
  drawer.querySelectorAll<HTMLElement>("[data-cart-close]").forEach((n) =>
    n.addEventListener("click", () => closeDrawer()),
  );
  return {
    drawer,
    body: drawer.querySelector<HTMLElement>("#cartDrawerBody")!,
    footer: drawer.querySelector<HTMLElement>("#cartDrawerFoot")!,
    countEl: document.getElementById("cartCount")!,
  };
}

function openDrawer(refs: ReturnType<typeof buildDrawer>) {
  refs.drawer.classList.add("is-open");
  refs.drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-locked");
}

function closeDrawer() {
  const d = document.getElementById("cartDrawer");
  if (!d) return;
  d.classList.remove("is-open");
  d.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-locked");
}

// ---------- render ----------

let lastBadgeCount = -1;

function paintCartBadge(countEl: HTMLElement, count: number) {
  const num = countEl.querySelector<HTMLElement>(".nav-cart-count-num");
  if (num) num.textContent = String(count);
  else countEl.textContent = String(count);
  const show = count > 0;
  countEl.classList.toggle("is-hidden", !show);
  countEl.setAttribute("data-open", show ? "true" : "false");
  const grew = lastBadgeCount >= 0 && count > lastBadgeCount;
  lastBadgeCount = count;
  if (!grew || !show) return;
  countEl.classList.remove("is-pop");
  void countEl.offsetWidth;
  countEl.classList.add("is-pop");
}

function render(refs: ReturnType<typeof buildDrawer>) {
  const items = getCart();
  paintCartBadge(refs.countEl, items.length);

  if (items.length === 0) {
    refs.body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-mark">✦</div>
        <p>Your cart is empty.</p>
        <a href="/#shop" data-cart-close class="cart-empty-link">Browse the shop</a>
      </div>
    `;
    refs.footer.innerHTML = "";
    refs.body.querySelectorAll<HTMLElement>("[data-cart-close]").forEach((n) =>
      n.addEventListener("click", () => closeDrawer()),
    );
    return;
  }

  refs.body.innerHTML = "";
  for (const it of items) {
    const row = el("div", { class: "cart-row" });
    row.innerHTML = `
      <div class="cart-row-img" data-tone="${it.tone}" ${it.img ? `style="background-image:url('${encodeURI(it.img)}');"` : ""}>
        <span class="cart-row-mark">${it.tone === "black" ? "●" : it.tone === "yellow" ? "◆" : "■"}</span>
      </div>
      <div class="cart-row-meta">
        <div class="cart-row-name">${escapeHtml(it.name)}</div>
        <div class="cart-row-type">${escapeHtml(it.type)}</div>
        <div class="cart-row-batch">Batch ${escapeHtml(it.batch)}</div>
      </div>
      <div class="cart-row-price">${money(it.price)}</div>
      <button type="button" class="cart-row-remove" data-remove="${escapeAttr(it.batch)}" aria-label="Remove ${escapeAttr(it.name)}">&times;</button>
    `;
    refs.body.appendChild(row);
  }

  refs.body.querySelectorAll<HTMLButtonElement>("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const batch = btn.getAttribute("data-remove")!;
      removeFromCart(batch);
    });
  });

  const quote = cartBreakdown();
  const attr = getReferralAttribution();
  const loyaltyRow = quote.loyaltyAmount > 0
    ? `<div class="cart-foot-row is-off"><span>${escapeHtml(quote.loyaltyLabel)}</span><strong>−${money(quote.loyaltyAmount)}</strong></div>`
    : "";
  const refNote = attr?.code
    ? `<p class="cart-foot-note">Referred by <strong>${escapeHtml(attr.code)}</strong> — they get $25 off their next order after yours clears. ${escapeHtml(shareUrlForCode(attr.code))}</p>`
    : "";
  refs.footer.innerHTML = `
    <div class="cart-foot-row">
      <span>Subtotal</span>
      <strong>${money(quote.subtotal)}</strong>
    </div>
    ${loyaltyRow}
    <div class="cart-foot-row">
      <span>Shipping${quote.shipping === 0 ? " (free over $50)" : " (orders under $50)"}</span>
      <strong>${quote.shipping === 0 ? "FREE" : money(quote.shipping)}</strong>
    </div>
    <div class="cart-foot-row">
      <span>Total</span>
      <strong>${money(quote.total)}</strong>
    </div>
    <p class="cart-foot-note">No order minimum. $25 shipping under $50 — free shipping at $50+. Tax confirmed by email. Loyalty: 1% off per $100 merchandise spent (lifetime, cap 25%).</p>
    ${refNote}
    <a href="/checkout/" class="cart-checkout-btn">Checkout</a>
    <button type="button" class="cart-clear-btn" data-cart-clear>Clear cart</button>
  `;
  refs.footer.querySelector("[data-cart-clear]")?.addEventListener("click", () => {
    if (confirm("Clear all items from cart?")) {
      localStorage.removeItem("b420_cart_v1");
      window.dispatchEvent(new CustomEvent("cart:changed"));
    }
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function escapeAttr(s: string) {
  return escapeHtml(s);
}

// ---------- init ----------

export function initCart() {
  captureReferralFromUrl();
  const loyaltyId = ensureLoyaltyId();

  const refs = buildDrawer();
  if (!refs.countEl) {
    console.error("[cart] #cartCount missing — cart UI not wired");
    return;
  }
  render(refs);

  void fetchLoyaltySnapshot(loyaltyId).then((snap) => {
    if (!snap) return;
    setLifetimeSpend(snap.lifetime_spend);
    if (snap.order_count > 0) setLoyaltyPlacedCount(Math.max(snap.order_count, 0));
    render(refs);
  });

  // Re-render on any cart change.
  window.addEventListener("cart:changed", () => render(refs));

  // Cart button in nav opens drawer.
  document.getElementById("cartToggle")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openDrawer(refs);
  });

  // Wire size/variant pickers (e.g. Belgium420 flower 3.5g / 7g / 28g).
  document.querySelectorAll<HTMLElement>(".product-card").forEach((card) => {
    const btn = card.querySelector<HTMLButtonElement>(".add-to-cart");
    const chips = card.querySelectorAll<HTMLButtonElement>(".product-variant");
    if (!btn || chips.length === 0) return;

    const priceEl = card.querySelector(".product-card-price");
    const typeEl = card.querySelector(".product-card-type");
    const baseBatch = btn.dataset.baseBatch || btn.dataset.batch || "";
    const baseName = btn.dataset.baseName || btn.dataset.name || "";

    const applyVariant = (chip: HTMLButtonElement) => {
      chips.forEach((c) => {
        const on = c === chip;
        c.classList.toggle("is-selected", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      const price = parseFloat(chip.dataset.variantPrice || "0");
      const type = chip.dataset.variantType || "";
      const id = chip.dataset.variantId || "";
      const label = chip.dataset.variantLabel || "";
      const name = label ? `${baseName} · ${label}` : baseName;
      btn.dataset.price = String(price);
      btn.dataset.type = type;
      btn.dataset.batch = id ? `${baseBatch}-${id}` : baseBatch;
      btn.dataset.name = name;
      btn.setAttribute("aria-label", `Add ${name} to cart`);
      if (priceEl) priceEl.textContent = money(price);
      if (typeEl && type) typeEl.textContent = type;
    };

    chips.forEach((chip) => {
      chip.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyVariant(chip);
      });
    });
  });

  // Wire Add-to-cart buttons on every product card.
  // The button is a child of .product-card; data-* attrs carry product info.
  document.querySelectorAll<HTMLButtonElement>(".product-card .add-to-cart").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const item: CartItem = {
        batch: btn.dataset.batch || "",
        name: btn.dataset.name || "",
        type: btn.dataset.type || "",
        price: parseFloat(btn.dataset.price || "0"),
        tone: btn.dataset.tone || "black",
        img: btn.dataset.img || null,
      };
      if (!item.batch || !item.name) return;
      if (!Number.isFinite(item.price) || item.price <= 0) return;
      addToCart(item);
      // Let the nav badge finish its spring before the drawer covers it.
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) openDrawer(refs);
      else window.setTimeout(() => openDrawer(refs), 560);
    });
  });
}
