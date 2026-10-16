/**
 * @arraypress/seo-astro — one page's `<head>` tags, from its `<SEO />` props
 * and the site-wide settings in `seo({ … })`.
 *
 * Kept out of the component so it can be tested as a plain function: the
 * component passes in its props, `Astro.url`, `Astro.site` and the config.
 *
 * @module @arraypress/seo-astro/head/page
 */

import { buildGraph } from '@arraypress/jsonld';
import { absUrl } from '@arraypress/site-url';
import { buildHead, canonicalize } from '../core.js';
import { ogFile, ogMarker } from '../og/marker.js';
import { cardTitle } from '../og/title.js';

/**
 * Put a value that may be one item, several or none into an array.
 *
 * @param {*} value - An item, an array of items, or nothing.
 * @returns {Array} The items.
 */
const list = (value) => (Array.isArray(value) ? value : value ? [value] : []);

/**
 * The page's JSON-LD: the site-wide nodes from `seo({ jsonLd })`, then the
 * page's own.
 *
 * More than one node is joined into a single `@graph` by
 * `@arraypress/jsonld`'s `buildGraph()`, which gives each an `@id` and wires
 * the references between them — so the page's Article names the site's
 * Organization as its publisher instead of standing beside it, unconnected.
 * One node is emitted as it is, and so is anything that's already a graph.
 *
 * @param {Object|Object[]} [site] - Site-wide nodes.
 * @param {Object|Object[]} [page] - The page's nodes.
 * @param {Object} graph - Where the page is.
 * @param {string} graph.url - The page's canonical URL.
 * @param {string} [graph.origin] - The site's origin.
 * @returns {Object|Object[]|undefined} What to pass `buildHead()` as `jsonLd`.
 */
function jsonLdFor(site, page, { url, origin }) {
  const nodes = [...list(site), ...list(page)];
  if (nodes.length < 2 || nodes.some((n) => n['@graph'])) return nodes.length ? nodes : undefined;
  return buildGraph(nodes, { url, ...(origin ? { origin } : {}) });
}

/**
 * Build one page's head tags.
 *
 * - The site-wide `defaults` sit under the page's own props.
 * - The canonical comes from the page URL, tracking parameters stripped,
 *   unless `url` is passed.
 * - A relative `image` is made absolute: social scrapers have no base URL to
 *   resolve it against, so `/og.png` would give no card at all.
 * - With no `image` and OG cards on, the page gets a generated card: its
 *   `og:image` points at the file the build will write, and a marker tells the
 *   build what to draw. `og={false}` opts a page out; `og={{ … }}` changes
 *   what the card says. The card's headline is the title without the site's
 *   name, which the card's footer already shows.
 *
 * @param {Object} [props={}] - The `<SEO />` props.
 * @param {Object} context - Where the page is.
 * @param {Object} [context.config={}] - The integration's config: `defaults`,
 *   `jsonLd`, and `og` (`false`, or `{ dir, base, width, height, eyebrow }`).
 * @param {URL} context.url - The page URL (`Astro.url`).
 * @param {URL|string} [context.site] - The site URL (`Astro.site`).
 * @returns {string} The head HTML, the OG marker after it when there is one.
 */
export function pageHead(props = {}, { config = {}, url, site }) {
  const { og: card, ...own } = props;
  const options = { ...config.defaults, ...own };
  const canonical = options.url ?? canonicalize(url.href);
  let marker = '';

  if (options.image) {
    options.image = absUrl(options.image, site, url);
  } else if (config.og && card !== false) {
    const content = {
      title: card?.title ?? cardTitle(options.title, options),
      subtitle: card?.subtitle ?? options.description,
      eyebrow: card?.eyebrow ?? config.og.eyebrow,
      chips: card?.chips,
      artwork: card?.artwork,
    };
    // Satori needs a title; a page without one gets no card rather than a blank one.
    if (content.title) {
      const { file, path } = ogFile(url.pathname, config.og);
      options.image = absUrl(path, site, url);
      options.imageWidth ??= config.og.width;
      options.imageHeight ??= config.og.height;
      options.imageAlt ??= content.title;
      marker = ogMarker(file, content);
    }
  }

  const origin = site ? new URL(String(site)).origin : undefined;
  const jsonLd = jsonLdFor(config.jsonLd, options.jsonLd, { url: canonical, origin });
  const head = buildHead({ ...options, url: canonical, jsonLd });
  return marker ? `${head}\n${marker}` : head;
}
