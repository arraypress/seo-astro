/**
 * @arraypress/seo-astro/jsonld
 *
 * The JSON-LD builders from `@arraypress/jsonld`, so a site building its
 * structured data needs only this package: `organization()` and `webSite()`
 * for `seo({ jsonLd })`, `article()`, `product()` and the rest for a page's
 * own `<SEO jsonLd>`. `<SEO />` joins the two with `buildGraph()`.
 *
 * @module @arraypress/seo-astro/jsonld
 */
export * from '@arraypress/jsonld';
