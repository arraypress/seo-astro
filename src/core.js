/**
 * @arraypress/seo
 *
 * HTML meta tag builder for SEO. Open Graph, Twitter Cards, canonical URLs,
 * robots directives, hreflang, and site verification.
 *
 * Zero dependencies. Works everywhere.
 *
 * @module @arraypress/seo
 */

/**
 * Escape HTML entities in a string for safe use in attribute values.
 *
 * Replaces `&`, `"`, `<`, and `>` with their HTML entity equivalents.
 *
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string, or empty string if input is falsy.
 *
 * @example
 * escapeHtml('Tom & Jerry');
 * // => 'Tom &amp; Jerry'
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>');
 * // => '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Build a complete `<head>` HTML string from SEO options.
 *
 * Generates `<title>`, canonical URL, meta description, robots directive,
 * Open Graph tags, Twitter Card tags, site verification meta tags, hreflang
 * alternate links, and inline JSON-LD script blocks.
 *
 * @param {Object} [options={}] - SEO configuration.
 * @param {string} [options.title] - Page title (used in `<title>`, OG, and Twitter).
 * @param {string} [options.description] - Meta description (used in meta, OG, and Twitter).
 * @param {string} [options.image] - Image URL for OG and Twitter Card.
 * @param {string} [options.url] - Canonical page URL.
 * @param {string} [options.type='website'] - Open Graph type (e.g. 'website', 'article').
 * @param {string} [options.robots] - Robots directive (e.g. 'noindex, nofollow').
 * @param {string} [options.siteName] - Site name for `og:site_name`.
 * @param {string} [options.twitterCard] - Twitter card type. Defaults to 'summary_large_image' when image is present.
 * @param {string} [options.twitterSite] - Twitter `@username` for the site.
 * @param {string} [options.twitterCreator] - Twitter `@username` for the content creator.
 * @param {string} [options.locale] - Locale string (e.g. 'en_US') for `og:locale`.
 * @param {string} [options.articlePublished] - ISO 8601 date for `article:published_time`.
 * @param {string} [options.articleModified] - ISO 8601 date for `article:modified_time`.
 * @param {string} [options.articleAuthor] - Author name or URL for `article:author`.
 * @param {Object} [options.verification={}] - Site verification tokens.
 * @param {string} [options.verification.google] - Google Search Console verification token.
 * @param {string} [options.verification.bing] - Bing Webmaster verification token.
 * @param {string} [options.verification.pinterest] - Pinterest domain verification token.
 * @param {string} [options.verification.yandex] - Yandex Webmaster verification token.
 * @param {Array<{lang: string, url: string}>} [options.hreflang=[]] - Alternate language links.
 * @param {Object|Object[]} [options.jsonLd] - JSON-LD structured data object(s) to embed.
 * @returns {string} HTML string suitable for injection into `<head>`.
 *
 * @example
 * const head = buildHead({
 *   title: 'My Product',
 *   description: 'The best product ever.',
 *   url: 'https://example.com/products/my-product',
 *   image: 'https://example.com/images/product.jpg',
 *   siteName: 'My Store',
 * });
 *
 * @example
 * // With hreflang and JSON-LD
 * const head = buildHead({
 *   title: 'About Us',
 *   url: 'https://example.com/about',
 *   hreflang: [
 *     { lang: 'en', url: 'https://example.com/about' },
 *     { lang: 'es', url: 'https://example.com/es/about' },
 *   ],
 *   jsonLd: { '@context': 'https://schema.org', '@type': 'Organization', name: 'Acme' },
 * });
 */
export function buildHead(options = {}) {
  const { title, description, image, imageWidth, imageHeight, imageAlt,
    url, type = 'website', robots, maxSnippet = true, siteName,
    twitterCard, twitterSite, twitterCreator, twitterImageAlt, twitterFallback = true,
    locale, articlePublished, articleModified, articleAuthor,
    verification = {}, hreflang = [], jsonLd,
    meta = [], link = [] } = options;

  const parts = [];

  if (title) parts.push(`<title>${esc(title)}</title>`);

  // Canonical — omitted on noindex pages (per Google's recommendation).
  const noindex = typeof robots === 'string' && /\bnoindex\b/i.test(robots);
  if (url && !noindex) parts.push(`<link rel="canonical" href="${esc(url)}">`);
  if (description) parts.push(`<meta name="description" content="${esc(description)}">`);

  // Robots — merge Google's snippet-size maxima so rich snippets aren't capped
  // (the modern default). `robots: false` opts out of the tag entirely;
  // `maxSnippet: false` keeps only the caller's directive.
  if (robots !== false) {
    const tokens = typeof robots === 'string' ? robots.split(',').map((s) => s.trim()).filter(Boolean) : [];
    if (maxSnippet !== false) {
      for (const d of ['max-image-preview:large', 'max-snippet:-1', 'max-video-preview:-1']) {
        const key = d.slice(0, d.indexOf(':'));
        if (!tokens.some((t) => t.startsWith(key))) tokens.push(d);
      }
    }
    if (tokens.length) parts.push(`<meta name="robots" content="${esc(tokens.join(', '))}">`);
  }

  // Open Graph
  if (title) parts.push(`<meta property="og:title" content="${esc(title)}">`);
  parts.push(`<meta property="og:type" content="${esc(type)}">`);
  if (url) parts.push(`<meta property="og:url" content="${esc(url)}">`);
  if (description) parts.push(`<meta property="og:description" content="${esc(description)}">`);
  if (image) parts.push(`<meta property="og:image" content="${esc(image)}">`);
  if (image && imageWidth) parts.push(`<meta property="og:image:width" content="${esc(imageWidth)}">`);
  if (image && imageHeight) parts.push(`<meta property="og:image:height" content="${esc(imageHeight)}">`);
  if (image && imageAlt) parts.push(`<meta property="og:image:alt" content="${esc(imageAlt)}">`);
  if (siteName) parts.push(`<meta property="og:site_name" content="${esc(siteName)}">`);
  if (locale) parts.push(`<meta property="og:locale" content="${esc(locale)}">`);

  // Article-specific OG
  if (articlePublished) parts.push(`<meta property="article:published_time" content="${esc(articlePublished)}">`);
  if (articleModified) parts.push(`<meta property="article:modified_time" content="${esc(articleModified)}">`);
  if (articleAuthor) parts.push(`<meta property="article:author" content="${esc(articleAuthor)}">`);

  // Twitter Card
  const cardType = twitterCard || (image ? 'summary_large_image' : 'summary');
  parts.push(`<meta name="twitter:card" content="${esc(cardType)}">`);
  // Twitter falls back to the Open Graph title/description/image automatically,
  // so those duplicates are suppressed by default. `twitterFallback: false`
  // emits them explicitly.
  if (twitterFallback === false) {
    if (title) parts.push(`<meta name="twitter:title" content="${esc(title)}">`);
    if (description) parts.push(`<meta name="twitter:description" content="${esc(description)}">`);
    if (image) parts.push(`<meta name="twitter:image" content="${esc(image)}">`);
  }
  const twAlt = twitterImageAlt || imageAlt;
  if (image && twAlt) parts.push(`<meta name="twitter:image:alt" content="${esc(twAlt)}">`);
  if (twitterSite) parts.push(`<meta name="twitter:site" content="${esc(twitterSite)}">`);
  if (twitterCreator) parts.push(`<meta name="twitter:creator" content="${esc(twitterCreator)}">`);

  // Site verification
  if (verification.google) parts.push(`<meta name="google-site-verification" content="${esc(verification.google)}">`);
  if (verification.bing) parts.push(`<meta name="msvalidate.01" content="${esc(verification.bing)}">`);
  if (verification.pinterest) parts.push(`<meta name="p:domain_verify" content="${esc(verification.pinterest)}">`);
  if (verification.yandex) parts.push(`<meta name="yandex-verification" content="${esc(verification.yandex)}">`);

  // hreflang
  for (const tag of hreflang) {
    if (tag.lang && tag.url) parts.push(`<link rel="alternate" hreflang="${esc(tag.lang)}" href="${esc(tag.url)}">`);
  }

  // Extra pass-through <meta>/<link> tags — anything the typed options
  // don't cover (viewport, theme-color, favicon, sitemap link, …). Each
  // object's keys become attributes: `true` → bare attribute, and
  // null/false/undefined → omitted.
  const attrTag = (tag, attrs) => {
    const a = Object.entries(attrs)
      .filter(([, v]) => v != null && v !== false)
      .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(String(v))}"`))
      .join('');
    return `<${tag}${a}>`;
  };
  for (const m of meta) parts.push(attrTag('meta', m));
  for (const l of link) parts.push(attrTag('link', l));

  // JSON-LD injection
  const ldItems = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  for (const ld of ldItems) {
    parts.push(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
  }

  return parts.join('\n');
}

/**
 * Inject head HTML into an existing HTML document string.
 *
 * Removes any existing `<title>` tag and inserts the provided HTML
 * immediately before the closing `</head>` tag.
 *
 * @param {string} html - The full HTML document string.
 * @param {string} headHtml - The HTML to inject (typically from {@link buildHead}).
 * @returns {string} The modified HTML document.
 *
 * @example
 * const doc = '<html><head><title>Old</title></head><body></body></html>';
 * const head = buildHead({ title: 'New Title', description: 'Updated.' });
 * const result = injectHead(doc, head);
 * // Old <title> removed, new head tags injected before </head>
 */
export function injectHead(html, headHtml) {
  let result = html.replace(/<title>[^<]*<\/title>/, '');
  return result.replace('</head>', headHtml + '\n</head>');
}

/**
 * Generate a `robots.txt` file content string.
 *
 * @param {Object} [options={}] - Robots.txt configuration.
 * @param {string} [options.sitemapUrl] - Absolute URL to the sitemap (appended at the end).
 * @param {string[]} [options.allow=[]] - Paths to allow (e.g. `['/']`).
 * @param {string[]} [options.disallow=[]] - Paths to disallow (e.g. `['/admin', '/api']`).
 * @param {number} [options.crawlDelay] - Crawl delay in seconds.
 * @param {string[]} [options.customRules=[]] - Additional raw lines to include.
 * @returns {string} The complete robots.txt content, newline-terminated.
 *
 * @example
 * const txt = robotsTxt({
 *   sitemapUrl: 'https://example.com/sitemap.xml',
 *   disallow: ['/admin', '/api'],
 * });
 * // => "User-agent: *\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://example.com/sitemap.xml\n"
 *
 * @example
 * const txt = robotsTxt({ allow: ['/'], crawlDelay: 10 });
 * // => "User-agent: *\nAllow: /\nCrawl-delay: 10\n"
 */
export function robotsTxt(options = {}) {
  const { sitemapUrl, allow = [], disallow = [], crawlDelay, customRules = [] } = options;
  const lines = ['User-agent: *'];
  for (const path of allow) lines.push(`Allow: ${path}`);
  for (const path of disallow) lines.push(`Disallow: ${path}`);
  if (crawlDelay) lines.push(`Crawl-delay: ${crawlDelay}`);
  for (const rule of customRules) lines.push(rule);
  if (sitemapUrl) lines.push('', `Sitemap: ${sitemapUrl}`);
  return lines.join('\n') + '\n';
}

/**
 * Strip tracking query parameters (and the hash) from a URL to derive a clean
 * canonical — so UTM tags and ad-click ids don't fork a page into duplicate
 * canonicals. Returns the input unchanged if it can't be parsed.
 *
 * @param {string} input - The URL to clean.
 * @returns {string} The canonicalised URL.
 *
 * @example
 * canonicalize('https://example.com/p?utm_source=x&id=7');
 * // => 'https://example.com/p?id=7'
 */
export function canonicalize(input) {
  try {
    const u = new URL(input);
    const tracking = /^(utm_[\w-]+|gclid|gbraid|wbraid|dclid|fbclid|msclkid|yclid|igshid|mc_eid|mc_cid|_hsenc|_hsmi|vero_id|oly_anon_id|oly_enc_id)$/i;
    for (const key of [...u.searchParams.keys()]) {
      if (tracking.test(key)) u.searchParams.delete(key);
    }
    u.hash = '';
    return u.toString();
  } catch {
    return input;
  }
}

/** @see esc */
export { esc as escapeHtml };
