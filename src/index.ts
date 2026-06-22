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
