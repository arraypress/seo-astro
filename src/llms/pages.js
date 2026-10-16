/**
 * @arraypress/seo-astro — llms.txt from the built pages.
 *
 * With no content of its own, the integration's llms.txt says what the home
 * page says about the site and lists every page a search engine would index,
 * each with its title and description. That's an honest index of the site
 * with nothing to write, and a site with more to say passes its own.
 *
 * @module @arraypress/seo-astro/llms/pages
 */

import { ERROR_PAGES, normalizePath, readPage } from '../audit/core.js';

/**
 * A URL reduced for comparison: no query, hash, `index.html`, extension or
 * trailing slash.
 *
 * @param {string} url - The URL.
 * @returns {string} The comparable form.
 */
const comparable = (url) => url.split(/[?#]/)[0].replace(/\/index\.html?$|\.html?$/i, '').replace(/\/+$/, '');

/**
 * The pages worth listing: indexable, not an error page, and canonical to
 * themselves rather than a duplicate of another page.
 *
 * @param {Array<{path: string, html: string}>} pages - The built pages.
 * @param {string} origin - The site's origin and base, no trailing slash.
 *   Empty when Astro has no `site`, which leaves the URLs root-relative.
 * @returns {Array<{path: string, url: string, title?: string, description?: string, siteName?: string}>}
 *   One entry per page, home first, then by path.
 */
export function listedPages(pages, origin) {
  const out = [];
  for (const page of pages) {
    const path = normalizePath(page.path);
    if (ERROR_PAGES.has(path)) continue;
    const read = readPage(page.html);
    if (/\bnoindex\b/i.test(read.robots ?? '')) continue;
    const url = origin + (path === '/' ? '/' : path);
    // A page canonical to another is a duplicate of it; the other is listed.
    if (origin && read.canonical && comparable(read.canonical) !== comparable(url)) continue;
    out.push({ path, url: read.canonical ?? url, title: read.title, description: read.description, siteName: read.og.siteName });
  }
  return out.sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path)));
}

/**
 * llms.txt options for a site from its built pages: the home page's site name
 * (or title) and description, then a section linking every listed page.
 *
 * @param {Array<{path: string, url: string, title?: string, description?: string, siteName?: string}>} listed -
 *   From {@link listedPages}.
 * @returns {{name?: string, description?: string, sections: Array<Object>}} Options for `build()`.
 */
export function llmsFromPages(listed) {
  const home = listed.find((p) => p.path === '/');
  const links = listed
    .filter((p) => p.title)
    .map((p) => ({ label: p.title, url: p.url, ...(p.description ? { description: p.description } : {}) }));
  return {
    name: home?.siteName ?? home?.title,
    description: home?.description,
    sections: links.length ? [{ title: 'Pages', links }] : [],
  };
}
