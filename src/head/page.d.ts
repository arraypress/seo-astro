import type { BuildHeadOptions } from '../core.js';
import type { OgCard } from '../og/marker.js';

/** What `<SEO />` reads from `seo({ … })`, through the integration's virtual module. */
export interface HeadConfig {
  /** Site-wide `<SEO />` props, under each page's own. */
  defaults?: BuildHeadOptions;
  /** Site-wide JSON-LD nodes, on every page. */
  jsonLd?: object | object[];
  /** Generated cards, or `false` when they're off. */
  og?:
    | false
    | {
        dir: string;
        base: string;
        width: number;
        height: number;
        eyebrow?: string;
        /** The card footer's name, taken off headlines like the site's name. */
        wordmark?: string;
      };
}

/** `<SEO />` props: `buildHead()`'s options, plus the page's OG card. */
export interface PageHeadProps extends BuildHeadOptions {
  /** What this page's generated card says, or `false` for no card. */
  og?: OgCard | false;
}

/** Build one page's head tags from its props and the site-wide config. */
export function pageHead(
  props: PageHeadProps | undefined,
  context: { config?: HeadConfig; url: URL; site?: URL | string },
): string;
