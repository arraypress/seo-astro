/**
 * @arraypress/seo-astro — render every page's OG card after the build.
 *
 * Reads the markers `<SEO />` left in the built pages, renders each card with
 * `@arraypress/og-image`, writes the PNGs into the output and takes the
 * markers out of the pages.
 *
 * `@arraypress/og-image` (Satori and resvg, with native binaries) is an
 * optional peer dependency, loaded only here and only when cards are on, so a
 * site with `og: false` never installs or loads it.
 *
 * Cards are cached between builds, keyed on everything that changes the
 * picture: the card, the options, the font, logo and artwork bytes, and the
 * renderer's own source. A rebuild re-renders only what changed — the
 * difference between seconds and minutes on a site with a thousand pages.
 *
 * @module @arraypress/seo-astro/og/build
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { takeMarkers } from './marker.js';

/** Options this module handles itself; everything else goes to the renderer. */
const OWN = new Set(['dir', 'eyebrow', 'cache', 'fonts', 'logo']);

/**
 * Load the renderer.
 *
 * Through Node's own `require`, which loads ES modules since Node 22.12. A
 * dynamic `import()` here would go through Vite: Astro loads this file with
 * Vite's module runner while reading `astro.config`, rewrites its imports to
 * use that runner, and closes the runner before the build hooks run.
 *
 * @returns {{renderOgImage: Function, source: string}} The render function,
 *   and the file it came from (for the cache key).
 * @throws {Error} When `@arraypress/og-image` isn't installed, saying how to fix it.
 */
export function loadRenderer() {
  const require = createRequire(import.meta.url);
  let source;
  try {
    source = require.resolve('@arraypress/og-image');
  } catch (error) {
    throw new Error(
      'seo(): OG cards need @arraypress/og-image. Install it (npm install @arraypress/og-image), ' +
        'or turn cards off with seo({ og: false }).',
      { cause: error },
    );
  }
  return { renderOgImage: require(source).renderOgImage, source };
}

/**
 * A file's path, resolved against the project root when it's relative.
 *
 * @param {string} path - A path from the config.
 * @param {string} projectRoot - The Astro project root.
 * @returns {string} An absolute path.
 */
const fromProject = (path, projectRoot) => (isAbsolute(path) ? path : resolve(projectRoot, path));

/**
 * Read the fonts and logo the config names by path.
 *
 * @param {Object} og - The `og` options.
 * @param {string} projectRoot - The Astro project root.
 * @returns {Promise<{fonts?: Object[], logo?: string|Uint8Array}>} Renderer-ready values.
 * @throws {Error} When a named file can't be read.
 */
async function loadAssets(og, projectRoot) {
  const fonts = og.fonts
    ? await Promise.all(
        og.fonts.map(async ({ path, ...font }) =>
          path ? { name: 'Inter', style: 'normal', ...font, data: await readFile(fromProject(path, projectRoot)) } : font,
        ),
      )
    : undefined;
  const logo =
    typeof og.logo === 'string' && !/^(https?:|data:)/.test(og.logo)
      ? await readFile(fromProject(og.logo, projectRoot))
      : og.logo;
  return { fonts, logo };
}

/**
 * Turn a card's `artwork` into something the renderer takes. A path in the
 * site is read from the build output, so anything in `public/` works.
 *
 * @param {string|undefined} artwork - The card's artwork.
 * @param {Object} where - Where to look.
 * @param {string} where.root - The build output directory.
 * @param {string} where.base - Astro's `base`, stripped from site paths.
 * @returns {Promise<{artwork?: string|Uint8Array, problem?: string}>} The
 *   artwork, or why there isn't any.
 */
async function resolveArtwork(artwork, { root, base }) {
  if (!artwork) return {};
  if (/^(https?:|data:)/.test(artwork)) return { artwork };
  if (!artwork.startsWith('/')) return { problem: `artwork "${artwork}" isn't a site path, URL or data: URI` };
  const prefix = base.replace(/\/+$/, '');
  const path = prefix && artwork.startsWith(prefix + '/') ? artwork.slice(prefix.length) : artwork;
  const file = join(root, decodeURI(path.split(/[?#]/)[0]));
  if (!existsSync(file)) return { problem: `artwork ${artwork} isn't in the build` };
  return { artwork: await readFile(file) };
}

/**
 * A hash over strings and byte arrays.
 *
 * @param {Array<string|Uint8Array|undefined>} parts - What to hash, in order.
 *   Data is hashed as it is; `undefined` counts as empty.
 * @returns {string} Hex SHA-256.
 */
function hash(parts) {
  const h = createHash('sha256');
  for (const part of parts) h.update(part ?? '').update('\0');
  return h.digest('hex');
}

/**
 * Render the OG cards for a built site.
 *
 * @param {Array<{path: string, file: string, html: string}>} pages - The built
 *   pages. Their markers are removed, on disk and in `html`.
 * @param {Object} og - The resolved `og` options.
 * @param {Object} context - Where things are.
 * @param {string} context.root - The build output directory.
 * @param {string} context.projectRoot - The Astro project root, for relative paths in `og`.
 * @param {string} [context.cacheDir] - Where cards are cached between builds.
 * @param {string} [context.base='/'] - Astro's `base`.
 * @param {{warn: Function}} context.logger - For artwork that can't be used.
 * @returns {Promise<{cards: number, rendered: number, reused: number}>} What was done.
 * @throws {Error} When the renderer is missing, or a card fails to render.
 */
export async function buildOgImages(pages, og, { root, projectRoot, cacheDir, base = '/', logger }) {
  const jobs = new Map();
  for (const page of pages) {
    const { html, cards } = takeMarkers(page.html);
    if (!cards.length) continue;
    page.html = html;
    await writeFile(page.file, html);
    for (const { file, card } of cards) jobs.set(file, card);
  }
  if (!jobs.size) return { cards: 0, rendered: 0, reused: 0 };

  const { renderOgImage, source } = loadRenderer();
  const { fonts, logo } = await loadAssets(og, projectRoot);
  const options = Object.fromEntries(Object.entries(og).filter(([key]) => !OWN.has(key)));
  if (fonts) options.fonts = fonts;
  if (logo) options.logo = logo;

  const cache = og.cache !== false && cacheDir ? cacheDir : undefined;
  const optionsKey = hash([
    await readFile(source),
    JSON.stringify({ ...options, fonts: undefined, logo: undefined }),
    ...(fonts ?? []).flatMap((f) => [`${f.name}/${f.weight}/${f.style}`, f.data]),
    logo,
  ]);

  const used = new Set();
  let rendered = 0;
  for (const [file, card] of jobs) {
    const { artwork, problem } = await resolveArtwork(card.artwork, { root, base });
    if (problem) logger.warn(`${file}: ${problem}; rendered without it.`);
    const input = { ...card, artwork };

    const target = join(root, file);
    await mkdir(dirname(target), { recursive: true });

    const key = `${hash([optionsKey, JSON.stringify({ ...card, artwork: undefined }), artwork])}.png`;
    used.add(key);
    if (cache && existsSync(join(cache, key))) {
      await copyFile(join(cache, key), target);
      continue;
    }

    let png;
    try {
      png = await renderOgImage(input, options);
    } catch (error) {
      throw new Error(`seo(): the OG card ${file} failed to render: ${error.message}`, { cause: error });
    }
    await writeFile(target, png);
    rendered++;
    if (cache) {
      await mkdir(cache, { recursive: true });
      await writeFile(join(cache, key), png);
    }
  }

  // Cards no page asked for this time belong to pages that changed or went away.
  if (cache && existsSync(cache)) {
    for (const name of await readdir(cache)) if (!used.has(name)) await rm(join(cache, name));
  }

  return { cards: jobs.size, rendered, reused: jobs.size - rendered };
}
