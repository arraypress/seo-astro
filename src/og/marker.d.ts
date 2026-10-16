/** What a page's OG card says. Every field but `title` is optional. */
export interface OgCard {
  /** Headline. Defaults to the page's own `title`, without the site's name or any `titleTemplate`. */
  title?: string;
  /** Sub-line. Defaults to the page's `description`. */
  subtitle?: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  /** Keyword pills under the subtitle. */
  chips?: string[];
  /**
   * Image for the right-hand tile: a path in the built site (`/img/x.png`), an
   * https URL or a `data:` URI. PNG, JPEG, GIF or SVG; WebP and AVIF from the
   * build are converted when `sharp` is installed.
   */
  artwork?: string;
}

/** The attribute that marks the block, and carries the card's file path. */
export const MARKER_ATTR: string;

/** Where a page's card lives: its file in the build output, and its URL path. */
export function ogFile(pathname: string, options?: { dir?: string; base?: string }): { file: string; path: string };

/** The absolute URL of a page's card, from `Astro.url` or a path. */
export function cardUrl(page: URL | string, options?: { dir?: string; base?: string }, site?: URL | string): string;

/** The marker `<SEO />` writes into a page for the build step to find. */
export function ogMarker(file: string, card: OgCard): string;

/** Take the markers out of a built page. */
export function takeMarkers(html: string): { html: string; cards: Array<{ file: string; card: OgCard }> };
