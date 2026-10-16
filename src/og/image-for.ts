/**
 * @module @arraypress/seo-astro/og/image-for
 *
 * `ogImageFor()` — the URL of the card `seo()` renders for a page, for the
 * places that need it besides `og:image`: a BlogPosting's `image`, a
 * Product's, a feed. It reads the same settings `<SEO />` does, so a layout
 * never copies the `/og/<path>.png` naming rule.
 */
import config from 'virtual:@arraypress/seo-astro/config';
import { cardUrl } from './marker.js';

/**
 * The absolute URL of a page's generated card.
 *
 * The card exists when the page renders `<SEO />` with a title, no `image`
 * and `og` not `false` — the same page this is asked about.
 *
 * @param page - The page: `Astro.url`, or its path (`/blog/hello/`).
 * @param site - The site URL, `Astro.site`. Without it, a `URL` page's own
 *   origin is used, and a path is returned as a path.
 * @returns e.g. `https://example.com/og/blog/hello.png`, or undefined when
 *   cards are off.
 *
 * @example
 * ---
 * import { ogImageFor } from '@arraypress/seo-astro';
 * const image = post.data.cover ?? ogImageFor(Astro.url, Astro.site);
 * ---
 */
export function ogImageFor(page: URL | string, site?: URL | string): string | undefined {
	return config.og ? cardUrl(page, config.og, site) : undefined;
}
