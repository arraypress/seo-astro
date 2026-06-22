/**
 * @module @arraypress/seo-astro/types
 */
import type { BuildHeadOptions } from '@arraypress/seo';

/**
 * Props for `<SEO />` — identical to `buildHead()`'s options:
 * `title`, `description`, `url`, `image`, `type`, `robots`, `siteName`,
 * `twitterCard`/`twitterSite`/`twitterCreator`, `locale`,
 * `articlePublished`/`articleModified`/`articleAuthor`, `verification`,
 * `hreflang`, and `jsonLd`.
 */
export type SEOProps = BuildHeadOptions;
