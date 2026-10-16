/** Where the brand lives: the `url` of the site-wide Organization, else Person, else WebSite. */
export function brandUrl(jsonLd: object | object[] | undefined): string | undefined;

/** A URL's host without a leading `www.`. */
export function bareHost(url: string | URL | undefined): string | undefined;

/** The card footer's wordmark and domain. */
export function cardBrand(
  og: { wordmark?: string; domain?: string | false },
  site: { siteName?: string; jsonLd?: object | object[]; site?: string },
): { wordmark?: string; domain?: string };
