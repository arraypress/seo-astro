/**
 * @arraypress/seo-astro — the built pages, read once for every build step.
 *
 * The OG cards, llms.txt, the audit and the CSP scan all work from the
 * finished HTML. Reading it once and handing the same list to each keeps a
 * 1,400-page build from walking the output four times.
 *
 * @module @arraypress/seo-astro/integration/pages
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

/**
 * Read every `.html` file under the build output.
 *
 * @param {string} root - The build output directory.
 * @returns {Promise<Array<{path: string, file: string, html: string}>>} Each
 *   page's site path (`/blog/index.html`), its file on disk and its HTML,
 *   sorted by path so every step sees the same order.
 * @throws {Error} When the directory can't be read.
 */
export async function readPages(root) {
  const pages = [];

  /**
   * Walk one directory, collecting pages.
   *
   * @param {string} dir - The directory.
   * @returns {Promise<void>}
   */
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith('.html')) {
        pages.push({ path: '/' + relative(root, file).split(sep).join('/'), file, html: await readFile(file, 'utf8') });
      }
    }
  }

  await walk(root);
  return pages.sort((a, b) => a.path.localeCompare(b.path));
}
