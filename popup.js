const view = document.getElementById("view");
const actions = document.getElementById("actions");
const copyReportBtn = document.getElementById("copyReport");
const copyProductBtn = document.getElementById("copyProduct");
const STORE_KEY = "learnedSignatures";
let lastResult = null;
let learned = [];

const CATEGORIES = [...new Set(SIGNATURES.map(s => s.category)), "Other"];

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const money = (cents, cur) => cents == null ? "—" : (cents / 100).toLocaleString(undefined, { style: cur ? "currency" : "decimal", currency: cur || undefined });

// ---------- Learned signatures (chrome.storage.local) ----------
async function loadLearned() {
  const data = await chrome.storage.local.get(STORE_KEY);
  learned = data[STORE_KEY] || [];
}
async function saveLearned() {
  await chrome.storage.local.set({ [STORE_KEY]: learned });
}

// "cdn.someapp.co.uk" -> "someapp.co.uk", "static.klaviyo.com" -> "klaviyo.com"
function rootDomain(host) {
  const parts = host.split(".");
  const twoPartTld = /^(co|com|net|org|gov|ac)$/.test(parts[parts.length - 2]) && parts[parts.length - 1].length === 2;
  return parts.slice(twoPartTld ? -3 : -2).join(".");
}
function guessName(text) {
  const base = text.split(".")[0].replace(/[-_]+/g, " ");
  return base.replace(/\b\w/g, c => c.toUpperCase());
}
function patternFor(kind, value) {
  return kind === "domain"
    ? reEsc(rootDomain(value))
    : `cdn\\.shopify\\.com/extensions/[^/]+/${reEsc(value)}(-[\\d.]+)?/`;
}

// ---------- Scan ----------
async function scan() {
  view.innerHTML = '<p class="state">Scanning this page…</p>';
  actions.hidden = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https?:/.test(tab.url || "")) {
    return showState("Open a store to scan", "X-Ray works on regular web pages, not browser or extension pages.");
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",               // needed to read window.Shopify
      func: xrayStore,
      args: [[...SIGNATURES, ...learned]]
    });
    lastResult = result;
    if (!result || !result.isShopify) {
      return showState("Not a Shopify store", "No Shopify objects or CDN assets found on this page. Headless storefronts can hide them.");
    }
    render(result);
  } catch (err) {
    showState("Couldn't scan this page", err.message || "The page blocked the scan. Reload it and try again.");
  }
}

function showState(title, body) {
  view.innerHTML = `<p class="state"><strong>${esc(title)}</strong>${esc(body)}</p>`;
}

// ---------- Render ----------
function render(r) {
  const t = r.theme;
  let themeHtml;
  if (t) {
    const real = t.schemaName || t.name || "Unknown theme";
    const source = t.themeStoreId ? `Theme Store #${esc(t.themeStoreId)}` : "Custom or unlisted theme";
    const renamed = t.name && t.schemaName && t.name !== t.schemaName
      ? `<p class="renamed">Renamed in admin as <q>${esc(t.name)}</q></p>` : "";
    themeHtml = `
      <section class="theme">
        <p class="theme-name">${esc(real)}</p>
        <p class="theme-sub">${t.schemaVersion ? `Version <b>${esc(t.schemaVersion)}</b> · ` : ""}${source}</p>
        ${renamed}
        ${r.shop ? `<p class="shop">${esc(r.shop)}</p>` : ""}
      </section>`;
  } else {
    themeHtml = `<section class="theme"><p class="theme-name">Theme hidden</p>
      <p class="theme-sub">Shopify is present but the theme object isn't exposed on this page.</p></section>`;
  }

  const facts = `
    <dl class="facts">
      <div class="fact"><dt>Page</dt><dd>${esc(r.pageType || "—")}</dd></div>
      <div class="fact"><dt>Currency</dt><dd>${esc(r.currency || "—")}</dd></div>
      <div class="fact"><dt>Locale</dt><dd>${esc(r.locale || "—")}${r.country ? "-" + esc(r.country) : ""}</dd></div>
    </dl>`;

  const groups = {};
  r.apps.forEach(a => (groups[a.category] ||= []).push(a));
  const appsHtml = r.apps.length
    ? Object.entries(groups).map(([cat, list]) => `
        <div class="group"><h3>${esc(cat)}</h3>
          ${list.map(a => `<div class="app">
              <span class="app-name">${esc(a.name)}${a.learned ? ' <span class="tag">Learned</span>' : ""}</span>
              <span class="app-ev" title="${esc(a.evidence)}">${esc(a.evidence)}</span>
            </div>`).join("")}
        </div>`).join("")
    : `<p class="state">No known apps matched. Label the unknowns below to teach X-Ray.</p>`;

  const chip = (kind, value, label, warn) =>
    `<button type="button" class="chip${warn ? " warn" : ""}" data-kind="${kind}" data-value="${esc(value)}" title="Label this app">${esc(label)}</button>`;

  const extHtml = r.extensions.length ? `
    <details open><summary>Unmatched theme app extensions (${r.extensions.length})</summary>
      <p class="hint">Click one to name it. X-Ray will recognize it on every store from now on.</p>
      <div class="chips">${r.extensions.map(e => chip("extension", e.handle, e.handle, true)).join("")}</div>
      <div class="form-slot" data-slot="extension"></div>
    </details>` : "";

  const unknownHtml = r.unknownDomains.length ? `
    <details ${r.extensions.length ? "" : "open"}><summary>Unrecognized third-party domains (${r.unknownDomains.length})</summary>
      <p class="hint">Click one to name it. X-Ray will recognize it on every store from now on.</p>
      <div class="chips">${r.unknownDomains.map(d => chip("domain", d, d)).join("")}</div>
      <div class="form-slot" data-slot="domain"></div>
    </details>` : "";

  const p = r.product;
  const productHtml = p ? `
    <h2>Product</h2>
    <div class="product">
      <p><strong>${esc(p.title)}</strong></p>
      <p class="muted">${esc(p.vendor || "")}${p.type ? " · " + esc(p.type) : ""}</p>
      <p class="muted">${p.variants} variant${p.variants === 1 ? "" : "s"} · ${money(p.priceMin, r.currency)}${p.priceMax !== p.priceMin ? " – " + money(p.priceMax, r.currency) : ""} · ${p.available ? "In stock" : "Sold out"}</p>
    </div>` : "";

  view.innerHTML = `
    ${themeHtml}
    ${facts}
    <h2>Detected apps <span class="count">${r.apps.length}</span></h2>
    ${appsHtml}
    ${extHtml}
    ${unknownHtml}
    ${productHtml}
    ${learnedHtml()}
    <p class="note">Only apps that load front-end code can be detected. Backend-only apps won't appear.</p>`;

  actions.hidden = false;
  copyProductBtn.hidden = !p;
}

function learnedHtml() {
  if (!learned.length) return "";
  return `
    <details class="learned"><summary>Your learned apps (${learned.length})</summary>
      <ul class="learned-list">
        ${learned.map((s, i) => `<li>
            <span><strong>${esc(s.name)}</strong> <span class="muted">${esc(s.category)} · ${esc(s.source)}</span></span>
            <button type="button" class="link" data-forget="${i}" aria-label="Forget ${esc(s.name)}">Forget</button>
          </li>`).join("")}
      </ul>
      <button type="button" class="ghost small" id="exportLearned">Copy as signatures.js entries</button>
    </details>`;
}

// ---------- Label form ----------
function openForm(kind, value) {
  document.querySelectorAll(".form-slot").forEach(s => (s.innerHTML = ""));
  document.querySelectorAll(".chip.active").forEach(c => c.classList.remove("active"));
  document.querySelector(`.chip[data-kind="${kind}"][data-value="${CSS.escape(value)}"]`)?.classList.add("active");

  const slot = document.querySelector(`.form-slot[data-slot="${kind}"]`);
  const source = kind === "domain" ? rootDomain(value) : value;
  slot.innerHTML = `
    <form class="label-form" data-kind="${kind}" data-value="${esc(value)}">
      <p class="form-title">Name <b>${esc(source)}</b></p>
      <label>App name<input name="name" required value="${esc(guessName(source))}" autocomplete="off"></label>
      <label>Category
        <select name="category">${CATEGORIES.map(c => `<option>${esc(c)}</option>`).join("")}</select>
      </label>
      <div class="form-actions">
        <button type="submit">Save app</button>
        <button type="button" class="ghost" data-cancel>Cancel</button>
      </div>
    </form>`;
  const input = slot.querySelector("input");
  input.focus();
  input.select();
}

async function saveLabel(form) {
  const kind = form.dataset.kind;
  const value = form.dataset.value;
  const name = form.name.value.trim();
  if (!name) return;
  learned.push({
    name,
    category: form.category.value,
    patterns: [patternFor(kind, value)],
    source: kind === "domain" ? rootDomain(value) : value,
    learned: true,
    addedAt: new Date().toISOString()
  });
  await saveLearned();
  await scan();
}

// ---------- Events (delegated, since view re-renders) ----------
view.addEventListener("click", async e => {
  const chipEl = e.target.closest(".chip[data-kind]");
  if (chipEl) return openForm(chipEl.dataset.kind, chipEl.dataset.value);

  if (e.target.closest("[data-cancel]")) {
    e.target.closest(".form-slot").innerHTML = "";
    document.querySelectorAll(".chip.active").forEach(c => c.classList.remove("active"));
    return;
  }

  const forget = e.target.closest("[data-forget]");
  if (forget) {
    learned.splice(Number(forget.dataset.forget), 1);
    await saveLearned();
    return scan();
  }

  if (e.target.id === "exportLearned") {
    const text = learned.map(({ name, category, patterns }) =>
      `  { name: ${JSON.stringify(name)}, category: ${JSON.stringify(category)}, patterns: ${JSON.stringify(patterns)} },`).join("\n");
    copy(text, e.target);
  }
});

view.addEventListener("submit", e => {
  e.preventDefault();
  saveLabel(e.target);
});

// ---------- Report & clipboard ----------
function buildReport(r) {
  const t = r.theme || {};
  const lines = [
    `# Store X-Ray: ${r.shop || new URL(r.url).hostname}`,
    `URL: ${r.url}`,
    "",
    `Theme: ${t.schemaName || t.name || "Unknown"}${t.schemaVersion ? " v" + t.schemaVersion : ""}`,
    `Theme Store ID: ${t.themeStoreId || "none (custom/unlisted)"}`,
    t.name && t.name !== t.schemaName ? `Renamed as: ${t.name}` : null,
    `Page type: ${r.pageType || "—"} | Currency: ${r.currency || "—"} | Locale: ${r.locale || "—"}`,
    "",
    `## Apps (${r.apps.length})`,
    ...r.apps.map(a => `- ${a.name} (${a.category}) — ${a.evidence}`),
    r.extensions.length ? `\n## Unmatched app extensions\n${r.extensions.map(e => "- " + e.handle).join("\n")}` : null,
    r.unknownDomains.length ? `\n## Unrecognized domains\n${r.unknownDomains.map(d => "- " + d).join("\n")}` : null
  ];
  return lines.filter(l => l !== null).join("\n");
}

async function copy(text, btn) {
  const label = btn.textContent;
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
  } catch {
    btn.textContent = "Copy failed";
  }
  setTimeout(() => (btn.textContent = label), 1400);
}

copyReportBtn.addEventListener("click", () => lastResult && copy(buildReport(lastResult), copyReportBtn));
copyProductBtn.addEventListener("click", () => lastResult?.product && copy(JSON.stringify(lastResult.product.raw, null, 2), copyProductBtn));
document.getElementById("rescan").addEventListener("click", scan);

loadLearned().then(scan);
