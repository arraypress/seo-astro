/** A page as llms.txt lists it. */
export interface ListedPage {
  /** Its path in the build, normalised: `/`, `/blog/hello`. */
  path: string;
  /** Its absolute URL — the canonical when it has one. */
  url: string;
  title?: string;
  description?: string;
  /** `og:site_name`, when the page has one. */
  siteName?: string;
}

/** The indexable, self-canonical, non-error pages, home first. */
export function listedPages(pages: Array<{ path: string; html: string }>, origin: string): ListedPage[];

/** llms.txt options from the listed pages. */
export function llmsFromPages(listed: ListedPage[]): import('./core.js').BuildOptions;
