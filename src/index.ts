/**
 * @module @arraypress/seo-astro
 *
 * The components: `<SEO />` for a page's head tags and `<Breadcrumbs />` for
 * a trail and its structured data. `<SEO />` needs the `seo()` integration
 * from `@arraypress/seo-astro/integration` in `astro.config`.
 *
 * ```astro
 * ---
 * import { SEO } from '@arraypress/seo-astro';
 * ---
 * <head>
 *   <meta charset="utf-8" />
 *   <SEO title="My Page" description="…" />
 * </head>
 * ```
 */

import SEO from './SEO.astro';
import Breadcrumbs from './Breadcrumbs.astro';

export { SEO, Breadcrumbs };
export type * from './types';
export default SEO;

/*
 * The builders behind the components. `<SEO />` covers the `<head>`, but a
 * site still reaches for `robotsTxt()` in `src/pages/robots.txt.ts`, and
 * occasionally for `buildHead()` directly (a Response built outside a
 * component, say).
 */
export { buildHead, injectHead, robotsTxt, canonicalize, escapeHtml, breadcrumbList, ldJson } from './core.js';
export type { BuildHeadOptions, RobotsTxtOptions, BreadcrumbItem } from './core.js';
