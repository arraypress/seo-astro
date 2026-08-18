/**
 * @module @arraypress/seo-astro
 *
 * An idiomatic `<SEO />` component for Astro — a thin wrapper over
 * @arraypress/seo's `buildHead()`. Same options, rendered as real tags.
 *
 * ```astro
 * ---
 * import { SEO } from '@arraypress/seo-astro';
 * ---
 * <head>
 *   <meta charset="utf-8" />
 *   <SEO title="My Page" description="…" url={Astro.url.href} image="/og.png" />
 * </head>
 * ```
 */

import SEO from './SEO.astro';

export { SEO };
export type * from './types';
export default SEO;

/*
 * The core's non-component surface, re-exported so an Astro project needs
 * only this package. `<SEO />` covers the `<head>`, but a site still reaches
 * for `robotsTxt()` in `src/pages/robots.txt.ts`, and occasionally for
 * `buildHead()` directly (a Response built outside a component, say). Without
 * these, every consumer would have to depend on @arraypress/seo as well —
 * two packages, two version ranges, for one concern.
 */
export { buildHead, injectHead, robotsTxt, canonicalize, escapeHtml } from '@arraypress/seo';
export type { BuildHeadOptions, RobotsTxtOptions } from '@arraypress/seo';
