/**
 * @arraypress/seo-astro — the name and host in a card's footer.
 *
 * The footer shows the site's name on the left and its domain on the right.
 * Astro's `site` is where the build is deployed, which isn't always where the
 * brand lives: a theme's demo, a staging host, a store still on its old
 * domain. The site's own structured data says where the brand lives — the
 * Organization's (or Person's, or WebSite's) `url` — so that comes first.
 *
 * @module @arraypress/seo-astro/og/brand
 */

/** Node types whose `url` is the brand's home, most telling first. */
const BRAND_TYPES = ['Organization', 'Person', 'WebSite'];

/**
 * Every node in some JSON-LD: a node, an array of them, or a `@graph`.
 *
 * @param {*} jsonLd - The site-wide JSON-LD.
 * @returns {Object[]} The nodes, in order.
 */
function nodesOf(jsonLd) {
  if (Array.isArray(jsonLd)) return jsonLd.flatMap(nodesOf);
  if (!jsonLd || typeof jsonLd !== 'object') return [];
  return Array.isArray(jsonLd['@graph']) ? jsonLd['@graph'].flatMap(nodesOf) : [jsonLd];
}

/**
 * Where the brand lives, by the site's own structured data.
 *
 * @param {Object|Object[]|undefined} jsonLd - The site-wide JSON-LD.
 * @returns {string|undefined} The `url` of its Organization, else its Person,
 *   else its WebSite; undefined when none has one.
 */
export function brandUrl(jsonLd) {
  const nodes = nodesOf(jsonLd);
  for (const type of BRAND_TYPES) {
    const node = nodes.find((n) => [n['@type']].flat().includes(type) && typeof n.url === 'string');
    if (node) return node.url;
  }
  return undefined;
}

/**
 * A URL's host without a leading `www.`, as a card's footer shows it.
 *
 * @param {string|URL|undefined} url - The URL.
 * @returns {string|undefined} e.g. `acme.com`, or undefined when it doesn't parse.
 */
export function bareHost(url) {
  if (!url) return undefined;
  try {
    return new URL(String(url)).host.replace(/^www\./i, '');
  } catch {
    return undefined;
  }
}

/**
 * The footer's wordmark and domain, for the options as given.
 *
 * @param {Object} og - The `og` options: `wordmark` and `domain` win as given,
 *   `domain: false` for none.
 * @param {Object} site - What the site says about itself.
 * @param {string} [site.siteName] - `defaults.siteName`.
 * @param {Object|Object[]} [site.jsonLd] - The site-wide JSON-LD.
 * @param {string} [site.site] - Astro's `site`.
 * @returns {{wordmark?: string, domain?: string}} What to draw.
 */
export function cardBrand(og, { siteName, jsonLd, site }) {
  const host = bareHost(brandUrl(jsonLd)) ?? bareHost(site);
  return {
    wordmark: og.wordmark ?? siteName ?? host,
    domain: og.domain === false ? undefined : (og.domain ?? host),
  };
}
