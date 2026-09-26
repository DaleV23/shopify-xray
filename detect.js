// Runs inside the page's MAIN world (injected by popup.js), so it can read
// window.Shopify. Must be fully self-contained: no outside variables.
async function xrayStore(signatures) {
  const S = window.Shopify;
  const hasCdn = !!document.querySelector('script[src*="cdn.shopify.com"], link[href*="cdn.shopify.com"]');
  if (!S && !hasCdn) return { isShopify: false };

  // Theme: schema_name is the real theme even if the merchant renamed it
  const t = S && S.theme;
  const theme = t ? {
    name: t.name || null,
    schemaName: t.schema_name || null,
    schemaVersion: t.schema_version || null,
    themeStoreId: t.theme_store_id || null,
    id: t.id || null,
    role: t.role || null
  } : null;

  const meta = (window.ShopifyAnalytics && window.ShopifyAnalytics.meta) || {};
  const pageType = (meta.page && meta.page.pageType) || null;

  // Collect every URL the page loaded
  const urls = new Set();
  document.querySelectorAll("script[src]").forEach(s => urls.add(s.src));
  document.querySelectorAll("link[href]").forEach(l => urls.add(l.href));
  performance.getEntriesByType("resource").forEach(r => urls.add(r.name));

  // Script tags registered by apps live inside Shopify's asyncLoad function
  document.querySelectorAll("script:not([src])").forEach(s => {
    const txt = s.textContent || "";
    if (!txt.includes("asyncLoad")) return;
    const m = txt.match(/var urls\s*=\s*(\[[\s\S]*?\]);/);
    if (m) { try { JSON.parse(m[1]).forEach(u => urls.add(u)); } catch (e) {} }
  });
  const urlList = [...urls];

  const getGlobal = path => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), window);

  // Match known apps
  const apps = [];
  for (const sig of signatures) {
    let evidence = null;
    for (const p of sig.patterns || []) {
      const re = new RegExp(p, "i");
      const hit = urlList.find(u => re.test(u));
      if (hit) {
        const ext = hit.match(/cdn\.shopify\.com\/extensions\/[^/]+\/([^/]+)\//i);
        if (ext) evidence = "App extension " + ext[1].replace(/-\d+(\.\d+)*$/, "");
        else { try { evidence = "Loads " + new URL(hit).hostname; } catch (e) { evidence = "Loads matching script"; } }
        break;
      }
    }
    if (!evidence) {
      const g = (sig.globals || []).find(name => getGlobal(name) !== undefined);
      if (g) evidence = "window." + g + " exists";
    }
    if (evidence) apps.push({ name: sig.name, category: sig.category, evidence, learned: !!sig.learned });
  }

  // Theme app extensions: cdn.shopify.com/extensions/<uuid>/<handle>-<version>/...
  const known = apps.map(a => a.name.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const extensions = new Map();
  urlList.forEach(u => {
    const m = u.match(/cdn\.shopify\.com\/extensions\/([0-9a-f-]+)\/([^/]+)\//i);
    if (!m) return;
    if (signatures.some(sig => (sig.patterns || []).some(p => new RegExp(p, "i").test(u)))) return;
    const handle = m[2].replace(/-\d+(\.\d+)*$/, "");
    const flat = handle.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (known.some(k => flat.includes(k) || k.includes(flat))) return;
    extensions.set(m[1], { handle, uuid: m[1] });
  });

  // Third-party domains nobody matched: raw material for new signatures
  const ignore = [location.hostname, "cdn.shopify.com", "shopify.com", "shopifycdn.com", "shopifysvc.com",
    "shopifycloud.com", "fonts.googleapis.com", "fonts.gstatic.com", "monorail-edge.shopifysvc.com"];
  const unknownDomains = new Set();
  urlList.forEach(u => {
    let host; try { host = new URL(u).hostname; } catch (e) { return; }
    if (!host || ignore.some(i => host === i || host.endsWith("." + i))) return;
    const matched = signatures.some(sig => (sig.patterns || []).some(p => new RegExp(p, "i").test(u)));
    if (!matched) unknownDomains.add(host);
  });

  // Product JSON on product pages
  let product = null;
  if (pageType === "product" || /\/products\/[^/]+/.test(location.pathname)) {
    try {
      const path = location.pathname.replace(/\/$/, "") + ".js";
      const res = await fetch(path, { credentials: "same-origin" });
      if (res.ok) {
        const p = await res.json();
        product = {
          title: p.title, vendor: p.vendor, type: p.type, handle: p.handle,
          variants: (p.variants || []).length,
          priceMin: p.price_min, priceMax: p.price_max,
          available: p.available, raw: p
        };
      }
    } catch (e) {}
  }

  return {
    isShopify: true,
    url: location.href,
    shop: (S && S.shop) || null,
    theme,
    pageType,
    currency: (S && S.currency && S.currency.active) || null,
    locale: (S && S.locale) || null,
    country: (S && S.country) || null,
    apps,
    extensions: [...extensions.values()],
    unknownDomains: [...unknownDomains].sort(),
    product
  };
}
