/**
 * @arraypress/seo-astro — the hand-off between `<SEO />` and the OG renderer.
 *
 * `<SEO />` knows what a page's card should say but runs mid-render, where it
 * can't write files. The integration can write files but runs after the build,
 * when the props are gone. So the component leaves a marker in the page — a
 * JSON data block naming the card's file and its content — and the build step
 * reads it, renders the PNG and removes the marker.
 *
 * A JSON `<script>` never executes, so a marker left behind (in `astro dev`,
 * where no build step runs) is inert.
 *
 * @module @arraypress/seo-astro/og/marker
 */

import { escapeHtml, ldJson } from '../core.js';

/** The attribute that marks the block, and carries the card's file path. */
export const MARKER_ATTR = 'data-seo-og';

const MARKER = new RegExp(`<script type="application/json" ${MARKER_ATTR}="([^"]+)">([\\s\\S]*?)</script>\\n?`, 'g');

/**
 * Where a page's card lives: its file in the build output, and its URL path.
 *
 * The file is named after the page's own path, so `/` is `og/index.png` and
 * `/blog/hello/` is `og/blog/hello.png`. A `base` is part of the URL but not of
 * the build output, so it's stripped from the file and kept on the URL.
 *
 * @param {string} pathname - The page's URL path, e.g. `Astro.url.pathname`.
 * @param {Object} [options={}] - Where cards go.
 * @param {string} [options.dir='og'] - Folder in the build output.
 * @param {string} [options.base='/'] - Astro's `base`.
 * @returns {{file: string, path: string}} `file` relative to the build output,
 *   `path` the URL path to serve it at.
 *
 * @example
 * ogFile('/blog/hello/');                    // { file: 'og/blog/hello.png', path: '/og/blog/hello.png' }
 * ogFile('/docs/start', { base: '/docs' });  // { file: 'og/start.png', path: '/docs/og/start.png' }
 */
export function ogFile(pathname, { dir = 'og', base = '/' } = {}) {
  let path = String(pathname);
  try {
    path = decodeURI(path);
  } catch {
    // A malformed escape: keep the path as it came.
  }
  const prefix = base.replace(/\/+$/, '');
  if (prefix && (path === prefix || path.startsWith(prefix + '/'))) path = path.slice(prefix.length);
  const key = path.replace(/\.html?$/i, '').replace(/^\/+|\/+$/g, '') || 'index';
  const file = `${dir.replace(/^\/+|\/+$/g, '')}/${key}.png`;
  return { file, path: `${prefix}/${file}` };
}

/**
 * The marker `<SEO />` writes into a page for the build step to find.
 *
 * @param {string} file - The card's file, relative to the build output.
 * @param {Object} card - What the card says: `title`, `subtitle`, `eyebrow`,
 *   `chips`, `artwork`.
 * @returns {string} A JSON `<script>` block.
 */
export function ogMarker(file, card) {
  return `<script type="application/json" ${MARKER_ATTR}="${escapeHtml(file)}">${ldJson(card)}</script>`;
}

/**
 * Undo `escapeHtml` on an attribute value.
 *
 * @param {string} value - The escaped value.
 * @returns {string} The original text.
 */
function unescapeAttr(value) {
  return value.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/**
 * Take the markers out of a built page.
 *
 * @param {string} html - The page.
 * @returns {{html: string, cards: Array<{file: string, card: Object}>}} The page
 *   without its markers, and the cards they described. A marker whose JSON
 *   doesn't parse is removed and skipped.
 */
export function takeMarkers(html) {
  const cards = [];
  const out = html.replace(MARKER, (_, file, json) => {
    try {
      cards.push({ file: unescapeAttr(file), card: JSON.parse(json) });
    } catch {
      // Not ours to repair; dropping it keeps the page clean.
    }
    return '';
  });
  return { html: out, cards };
}
