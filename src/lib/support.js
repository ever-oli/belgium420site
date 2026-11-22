/** Monitored shopper support inbox. Operator order alerts stay on OWNER_EMAIL. */
export const SUPPORT_EMAIL = "support@belgium420.com";

export function supportMailto(subject = "", body = "") {
  const query = [];
  if (subject) query.push(`subject=${encodeURIComponent(subject)}`);
  if (body) query.push(`body=${encodeURIComponent(body)}`);
  return query.length ? `mailto:${SUPPORT_EMAIL}?${query.join("&")}` : `mailto:${SUPPORT_EMAIL}`;
}

/** Schema.org contact point shared by the pages that publish JSON-LD. */
export function supportContactPoint() {
  return {
    "@type": "ContactPoint",
    email: SUPPORT_EMAIL,
    contactType: "customer support",
    availableLanguage: "English",
    url: "https://belgium420.com/contact",
  };
}

/**
 * Markup for client-rendered spots (cart drawer, checkout success).
 * The address is a constant, so the markup does not include shopper input.
 */
export function supportHelpHtml(className = "support-line") {
  const cls = String(className || "support-line").replace(/[^a-zA-Z0-9_\- ]/g, "") || "support-line";
  return `<p class="${cls}">Need help? Email <a href="${supportMailto()}">${SUPPORT_EMAIL}</a></p>`;
}
