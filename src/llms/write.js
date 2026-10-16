/**
 * @arraypress/seo-astro — write `/llms.txt` into the build.
 *
 * @module @arraypress/seo-astro/llms/write
 */

import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from './core.js';
import { listedPages, llmsFromPages } from './pages.js';

/**
 * Write the site's llms.txt.
 *
 * `llms` is `true` for a file made from the built pages, an options object for
 * `build()`, or a function given `{ origin, pages }` that returns one. Name
 * and description fall back to the home page's when the options leave them
 * out.
 *
 * A route (`src/pages/llms.txt.ts`) or a file in `public/` that already put an
 * llms.txt in the build wins over the generated one. If the config asked for
 * content of its own as well, that's two sources for one file, and the build
 * stops rather than silently picking one.
 *
 * @param {Array<{path: string, html: string}>} pages - The built pages.
 * @param {true|Object|Function} llms - The `llms` option.
 * @param {Object} context - Where things are.
 * @param {string} context.root - The build output directory.
 * @param {string} context.origin - The site's origin and base, no trailing slash.
 * @returns {Promise<{written: boolean, links: number}>} Whether a file was
 *   written, and how many links it has.
 * @throws {Error} When the build already has an llms.txt and the config gives
 *   content for one too.
 */
export async function writeLlms(pages, llms, { root, origin }) {
  const file = join(root, 'llms.txt');
  if (existsSync(file)) {
    if (llms === true) return { written: false, links: 0 };
    throw new Error(
      'seo(): the build already has an llms.txt (from a route or public/), and seo({ llms }) gives one too. ' +
        'Keep one: remove the route, or set seo({ llms: true }) to keep the route.',
    );
  }

  const listed = listedPages(pages, origin);
  const auto = llmsFromPages(listed);
  const own = typeof llms === 'function' ? await llms({ origin, pages: listed }) : llms === true ? auto : llms;
  const options = { ...own, name: own.name ?? auto.name, description: own.description ?? auto.description };

  await writeFile(file, build(options));
  const links = (options.sections ?? []).reduce((n, s) => n + (s.links?.length ?? 0), 0);
  return { written: true, links };
}
