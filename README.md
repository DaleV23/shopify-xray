# Shopify Store X-Ray

A Chrome extension that reveals what's behind any Shopify storefront: the real theme (even when renamed), installed apps, and store details.

## Features
- **Real theme detection**: reads `Shopify.theme.schema_name`, so "Dawn - Copy (Aug)" shows up as Dawn, with version and Theme Store ID
- **App detection** across 50+ apps, grouped by category, with the evidence for each match
- **Theme app extensions** and **unrecognized third-party domains** surfaced for manual review
- **Product snapshot** on product pages, with one-click copy of the product JSON
- **Copy report** as Markdown for audits and client notes

## Self-learning
Click any unmatched extension or unrecognized domain to name it and pick a category. X-Ray saves it to `chrome.storage.local` and recognizes it on every store from then on, tagged **Learned**.
- Manage or forget learned apps under **Your learned apps**
- **Copy as signatures.js entries** exports them so you can make them permanent or share them with your team

## How it works
Full technical walkthrough: [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)

The popup injects `detect.js` into the page's **main world** via `chrome.scripting.executeScript({ world: "MAIN" })`. Content scripts run in an isolated world and can't read `window.Shopify`, so this step is required.

Detection sources:
1. `window.Shopify` and `ShopifyAnalytics.meta` for theme, currency, locale, and page type
2. Every loaded URL: `<script>`, `<link>`, and `performance.getEntriesByType("resource")`
3. App script tags listed in Shopify's `asyncLoad` function
4. `cdn.shopify.com/extensions/...` paths for theme app extensions
5. App-specific window globals as backup signals

## Install (dev)
1. Go to `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked** and select this folder
4. Open any Shopify store and click the extension icon

## Adding apps
Add an entry to `signatures.js`:
```js
{ name: "App Name", category: "Reviews", patterns: ["appdomain\\.com"], globals: ["AppGlobal"] }
```

## Limitations
Only apps that load front-end code can be detected. Backend-only apps (inventory, ERP sync, etc.) are invisible, and headless storefronts may hide Shopify objects entirely.

## Credits
Designed and built by Dale. See more of my work at [dale-portfolio.vercel.app](https://dale-portfolio.vercel.app/).
