// patterns: regex strings matched against loaded URLs
// globals: window properties that point to the app
const SIGNATURES = [
  // Reviews
  { name: "Judge.me", category: "Reviews", patterns: ["judge\\.me", "jdgm"], globals: ["jdgm"] },
  { name: "Yotpo", category: "Reviews", patterns: ["yotpo\\.com"], globals: ["yotpo"] },
  { name: "Okendo", category: "Reviews", patterns: ["okendo\\.io"], globals: ["okeWidgetApi"] },
  { name: "Loox", category: "Reviews", patterns: ["loox\\.io"] },
  { name: "Stamped", category: "Reviews", patterns: ["stamped\\.io"] },

  // Email & SMS
  { name: "Klaviyo", category: "Email & SMS", patterns: ["klaviyo\\.com"], globals: ["klaviyo", "_learnq"] },
  { name: "Attentive", category: "Email & SMS", patterns: ["attn\\.tv", "attentivemobile"] },
  { name: "Postscript", category: "Email & SMS", patterns: ["postscript\\.io"] },
  { name: "Privy", category: "Email & SMS", patterns: ["privy\\.com"] },

  // Subscriptions
  { name: "Recharge", category: "Subscriptions", patterns: ["rechargecdn", "rechargeassets", "rechargepayments"], globals: ["ReCharge"] },
  { name: "Skio", category: "Subscriptions", patterns: ["skio\\.com"] },

  // Upsell & bundles
  { name: "Rebuy", category: "Upsell & bundles", patterns: ["rebuyengine\\.com"], globals: ["Rebuy"] },
  { name: "ReConvert", category: "Upsell & bundles", patterns: ["reconvert"] },
  { name: "Zipify", category: "Upsell & bundles", patterns: ["zipify"] },
  { name: "Bold", category: "Upsell & bundles", patterns: ["boldapps\\.net", "boldcommerce"] },

  // Testing
  { name: "Shoplift", category: "Testing", patterns: ["shoplift"], globals: ["shoplift"] },
  { name: "Intelligems", category: "Testing", patterns: ["intelligems"], globals: ["igData"] },
  { name: "VWO", category: "Testing", patterns: ["visualwebsiteoptimizer\\.com"], globals: ["VWO"] },
  { name: "Optimizely", category: "Testing", patterns: ["optimizely\\.com"], globals: ["optimizely"] },
  { name: "Convert", category: "Testing", patterns: ["convertexperiments\\.com"] },

  // Analytics & pixels
  { name: "Google Tag Manager", category: "Analytics", patterns: ["googletagmanager\\.com/gtm\\.js"], globals: ["google_tag_manager"] },
  { name: "Google Analytics 4", category: "Analytics", patterns: ["googletagmanager\\.com/gtag/js"] },
  { name: "Meta Pixel", category: "Analytics", patterns: ["connect\\.facebook\\.net"], globals: ["fbq"] },
  { name: "TikTok Pixel", category: "Analytics", patterns: ["analytics\\.tiktok\\.com"], globals: ["ttq"] },
  { name: "Pinterest Tag", category: "Analytics", patterns: ["s\\.pinimg\\.com/ct"], globals: ["pintrk"] },
  { name: "Hotjar", category: "Analytics", patterns: ["hotjar\\.com"], globals: ["hj"] },
  { name: "Microsoft Clarity", category: "Analytics", patterns: ["clarity\\.ms"], globals: ["clarity"] },
  { name: "Lucky Orange", category: "Analytics", patterns: ["luckyorange"] },
  { name: "Elevar", category: "Analytics", patterns: ["getelevar\\.com"] },
  { name: "Triple Whale", category: "Analytics", patterns: ["triplewhale", "triplepixel"] },

  // Page builders
  { name: "Replo", category: "Page builder", patterns: ["replo\\b", "reploapp"] },
  { name: "PageFly", category: "Page builder", patterns: ["pagefly"] },
  { name: "GemPages", category: "Page builder", patterns: ["gempages"] },
  { name: "Shogun", category: "Page builder", patterns: ["getshogun"] },

  // Search & filters
  { name: "Searchanise", category: "Search & filters", patterns: ["searchanise"] },
  { name: "Boost Commerce", category: "Search & filters", patterns: ["boostcommerce", "bc-sf-filter"] },
  { name: "Algolia", category: "Search & filters", patterns: ["algolia"] },
  { name: "Nosto", category: "Search & filters", patterns: ["nosto\\.com"] },

  // Loyalty
  { name: "Smile.io", category: "Loyalty", patterns: ["smile\\.io"] },
  { name: "LoyaltyLion", category: "Loyalty", patterns: ["loyaltylion"] },
  { name: "Rivo", category: "Loyalty", patterns: ["rivo\\.io"] },
  { name: "Growave", category: "Loyalty", patterns: ["growave"] },
  { name: "Swym Wishlist", category: "Loyalty", patterns: ["swym"] },

  // Support
  { name: "Gorgias", category: "Support", patterns: ["gorgias"] },
  { name: "Tidio", category: "Support", patterns: ["tidio"] },
  { name: "Zendesk", category: "Support", patterns: ["zdassets\\.com"] },

  // Checkout, shipping, translation
  { name: "Afterpay", category: "Checkout & shipping", patterns: ["afterpay"] },
  { name: "Klarna", category: "Checkout & shipping", patterns: ["klarna"] },
  { name: "Route", category: "Checkout & shipping", patterns: ["routeapp\\.io"] },
  { name: "AfterShip", category: "Checkout & shipping", patterns: ["aftership"] },
  { name: "Weglot", category: "Translation", patterns: ["weglot"] },
  { name: "Langify", category: "Translation", patterns: ["langify"] }
];
