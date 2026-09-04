/**
 * @module @arraypress/seo-astro/audit
 *
 * The Astro integration around {@link auditPages} — reads the built HTML at
 * `astro:build:done` and reports what's wrong with it.
 *
 * ```js
 * // astro.config.mjs
 * import { seoAudit } from '@arraypress/seo-astro/audit';
 *
 * export default defineConfig({
 *   site: 'https://example.com',
 *   integrations: [seoAudit({ failOn: 'error' })],
 * });
 * ```
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { auditPages } from './audit.js';
import type { AuditOptions, AuditResult, Finding } from './audit.js';

export type { AuditOptions, AuditResult, CheckLevel, CheckName, Finding, PageRead } from './audit.js';
export { auditPages, readPage, normalizePath, CHECKS } from './audit.js';

export interface SeoAuditOptions extends AuditOptions {
	/**
	 * Fail the build when findings reach this severity.
	 *
	 * `'error'` is the useful default: it turns the checks that are unambiguously
	 * wrong (a duplicate title, a canonical pointing at the wrong page) into a
	 * red CI run, while the judgement calls stay advisory.
	 *
	 * @default 'error'
	 */
	failOn?: 'error' | 'warn' | 'never';
}

/** Walk a directory for built HTML, returning paths relative to the site root. */
async function htmlPages(root: string): Promise<Array<{ path: string; html: string }>> {
	const out: Array<{ path: string; html: string }> = [];
	async function walk(dir: string): Promise<void> {
		for (const item of await readdir(dir, { withFileTypes: true })) {
			const full = join(dir, item.name);
			if (item.isDirectory()) await walk(full);
			else if (item.name.endsWith('.html')) {
				out.push({
					path: '/' + full.slice(root.length).split(sep).filter(Boolean).join('/'),
					html: await readFile(full, 'utf8'),
				});
			}
		}
	}
	await walk(root);
	return out;
}

const line = (f: Finding): string => `${f.path}  [${f.check}]  ${f.message}`;

/**
 * Astro integration: audit the built site for SEO problems.
 *
 * Runs after the build, over every rendered HTML file at once — which is what
 * lets it see duplicate titles and orphan pages at all. Server-rendered routes
 * have no HTML on disk and are skipped; a fully SSR build audits nothing and
 * says so rather than reporting a clean bill of health.
 *
 * @param options - Audit thresholds and checks, plus `failOn`.
 * @returns An `AstroIntegration` for `astro.config.mjs`.
 */
export function seoAudit(options: SeoAuditOptions = {}): AstroIntegration {
	const { failOn = 'error', ...auditOptions } = options;

	return {
		name: '@arraypress/seo-astro/audit',
		hooks: {
			'astro:build:done': async ({ dir, logger }) => {
				const root = fileURLToPath(dir);
				const pages = await htmlPages(root);

				if (pages.length === 0) {
					logger.warn('No static HTML found — nothing audited (an SSR-only build?).');
					return;
				}

				const result: AuditResult = auditPages(pages, auditOptions);
				const { findings, checked, errors, warnings } = result;

				if (findings.length === 0) {
					logger.info(`${checked} page(s) checked, no problems found.`);
					return;
				}

				for (const f of findings.filter((f) => f.level === 'error')) logger.error(line(f));
				for (const f of findings.filter((f) => f.level === 'warn')) logger.warn(line(f));
				logger.info(`${checked} page(s) checked — ${errors} error(s), ${warnings} warning(s).`);

				const shouldFail =
					(failOn === 'error' && errors > 0) || (failOn === 'warn' && errors + warnings > 0);
				if (shouldFail) {
					throw new Error(
						`SEO audit failed: ${errors} error(s), ${warnings} warning(s) across ${checked} page(s). ` +
							`Set failOn:'never' to report without failing the build.`,
					);
				}
			},
		},
	};
}

export default seoAudit;
