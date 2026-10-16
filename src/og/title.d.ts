/** The card's headline: the page's title without the site's name, by its title template or at either end. */
export function cardTitle(
  title: string | undefined,
  site?: { titleTemplate?: string; siteName?: string },
): string | undefined;
