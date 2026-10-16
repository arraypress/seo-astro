import type { BuildOptions } from './core.js';
import type { ListedPage } from './pages.js';

/** What a function given as `seo({ llms })` receives. */
export interface LlmsContext {
  /** The site's origin and base, no trailing slash, e.g. `https://example.com`. */
  origin: string;
  /** Every page the generated file would list. */
  pages: ListedPage[];
}

/** The `llms` option, once `false` has been ruled out. */
export type LlmsSource = true | BuildOptions | ((context: LlmsContext) => BuildOptions | Promise<BuildOptions>);

/** Write the site's llms.txt into the build output. */
export function writeLlms(
  pages: Array<{ path: string; html: string }>,
  llms: LlmsSource,
  context: { root: string; origin: string },
): Promise<{ written: boolean; links: number }>;
