/**
 * @module @arraypress/seo-astro/integration
 *
 * `seo()` — the one integration a site adds to be found. It feeds `<SEO />`
 * its site-wide settings, and when the build is done it:
 *
 *   1. renders an Open Graph card for every page that asked for one,
 *   2. writes `/llms.txt`,
 *   3. audits the built pages, failing the build on an error,
 *   4. writes `_headers`, with a CSP hashed from the finished pages.
 *
 * In that order, because each step reads the pages the one before it may have
 * changed: the cards come out of the HTML before anything hashes it.
 *
 * ```js
 * // astro.config.mjs
 * import seo from '@arraypress/seo-astro/integration';
 *
 * export default defineConfig({
 *   site: 'https://example.com',
 *   integrations: [seo({ defaults: { siteName: 'Example' } })],
 * });
 * ```
 */
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration, AstroIntegrationLogger } from 'astro';
import { mergeScans, scanHtml } from '@arraypress/security-headers/scan';
import { writeHeadersFile } from '@arraypress/security-headers/write';
import { reportAudit } from '../audit/report';
import type { SeoAuditOptions } from '../audit/report';
import type { HeadConfig } from '../head/page.js';
import { writeLlms } from '../llms/write.js';
import { cardBrand } from '../og/brand.js';
import { buildOgImages, loadRenderer } from '../og/build.js';
import { configModule } from './config-module';
import { readPages } from './pages.js';
import type { HeadersOptions, OgOptions, SeoOptions } from './types';

export type * from './types';
export type { SeoAuditOptions } from '../audit/report';

/** What every part is when `seo()` is given nothing. */
const OG_DEFAULTS = { dir: 'og', tile: 'artwork', width: 1200, height: 630 } as const;

/**
 * Turn a part's option into its settings: `false` is off, `true` or nothing
 * is the defaults, an object is laid over them.
 *
 * @param value - The option as given.
 * @param defaults - The part's defaults.
 * @returns The settings, or `false` when the part is off.
 */
function part<T extends object>(value: boolean | T | undefined, defaults: Partial<T>): T | false {
	if (value === false) return false;
	return { ...defaults, ...(value === true || value === undefined ? {} : value) } as T;
}

/**
 * The site's origin with Astro's `base` on the end, no trailing slash — what
 * an absolute link inside the site starts with.
 *
 * @param site - Astro's `site`.
 * @param base - Astro's `base`.
 * @returns e.g. `https://example.com/docs`, or `''` without a `site`.
 */
function originWithBase(site: string | undefined, base: string): string {
	if (!site) return '';
	return new URL(base, site).href.replace(/\/+$/, '');
}

/**
 * Log one of `writeHeadersFile()`'s notes.
 *
 * @param logger - Astro's logger.
 * @param note - The note.
 */
function logNote(logger: AstroIntegrationLogger, note: { level: 'info' | 'warn'; message: string }): void {
	if (note.level === 'warn') logger.warn(note.message);
	else logger.info(note.message);
}

/**
 * The SEO integration.
 *
 * @param options - Each part's settings; every part is on by default and
 *   `false` turns one off.
 * @returns An `AstroIntegration` for `astro.config`.
 * @throws {Error} At setup, when cards are on and `@arraypress/og-image` isn't installed.
 */
export default function seo(options: SeoOptions = {}): AstroIntegration {
	const og = part<OgOptions>(options.og, OG_DEFAULTS as Partial<OgOptions>);
	const headers = part<HeadersOptions>(options.headers, { csp: 'auto' });
	const audit = part<SeoAuditOptions>(options.audit, {});
	const llms = options.llms ?? true;
	const defaults = options.defaults ?? {};

	let site: string | undefined;
	let origin = '';
	let base = '/';
	let projectRoot = '';
	let cacheDir = '';
	let brand: { wordmark?: string; domain?: string } = {};

	return {
		name: '@arraypress/seo-astro',
		hooks: {
			'astro:config:setup': async ({ config, updateConfig }) => {
				// Better to stop here than to render every page and fail at the end.
				if (og) loadRenderer();

				const jsonLd =
					typeof options.jsonLd === 'function'
						? await options.jsonLd({ origin: originWithBase(config.site, config.base) })
						: options.jsonLd;
				if (og) brand = cardBrand(og, { siteName: defaults.siteName, jsonLd, site: config.site });
				const head: HeadConfig = {
					defaults,
					jsonLd,
					og: og && {
						dir: og.dir ?? OG_DEFAULTS.dir,
						base: config.base,
						width: og.width ?? OG_DEFAULTS.width,
						height: og.height ?? OG_DEFAULTS.height,
						eyebrow: og.eyebrow,
						wordmark: brand.wordmark,
					},
				};
				updateConfig({ vite: { plugins: [configModule(head)] } });
			},

			'astro:config:done': ({ config, logger }) => {
				site = config.site;
				base = config.base;
				origin = originWithBase(site, base);
				projectRoot = fileURLToPath(config.root);
				cacheDir = join(fileURLToPath(config.cacheDir), 'seo-astro', 'og');
				if (!site && (og || llms)) {
					logger.warn('No `site` in astro.config — OG image URLs and llms.txt links need it to be absolute.');
				}
			},

			'astro:build:done': async ({ dir, logger }) => {
				const root = fileURLToPath(dir);
				const pages = await readPages(root);

				if (og) {
					const settings = { ...og, ...brand };
					const { cards, rendered, reused } = await buildOgImages(pages, settings, {
						root,
						projectRoot,
						cacheDir,
						base,
						logger,
					});
					if (cards) logger.info(`OG cards: ${cards} (${rendered} rendered, ${reused} unchanged) in /${settings.dir}/`);
				}

				if (llms) {
					const { written, links } = await writeLlms(pages, llms, { root, origin });
					logger.info(written ? `wrote llms.txt — ${links} link(s)` : 'kept the llms.txt the site builds itself');
				}

				if (audit) reportAudit(pages, audit, { site, logger });

				if (headers) {
					const { path, filename, ...config } = headers;
					const scan = mergeScans(pages.map((p) => scanHtml(p.html)));
					for (const note of writeHeadersFile(root, config, { path, filename, scan }).notes) logNote(logger, note);
				}
			},
		},
	};
}

export { seo };
