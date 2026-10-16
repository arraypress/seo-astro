/** A built page. */
export interface BuiltPage {
  /** Its path in the site, e.g. `/blog/index.html`. */
  path: string;
  /** Its file on disk. */
  file: string;
  /** Its HTML. Build steps that change the page update this too. */
  html: string;
}

/** Read every `.html` file under the build output, sorted by path. */
export function readPages(root: string): Promise<BuiltPage[]>;
