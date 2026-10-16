/**
 * @module @arraypress/seo-astro/types
 */
import type { PageHeadProps } from './head/page.js';

/**
 * Props for `<SEO />` — `buildHead()`'s options (`title`, `titleTemplate`,
 * `description`, `url`, `image`, `type`, `robots`, `siteName`, the Twitter and
 * article fields, `locale`, `verification`, `hreflang`, `jsonLd`, `meta`,
 * `link`), plus `og` for the page's generated card.
 */
export type SEOProps = PageHeadProps;
export type { OgCard } from './og/marker.js';
