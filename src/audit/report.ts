/**
 * @module @arraypress/seo-astro/audit/report
 *
 * Run {@link auditPages} over the built pages and report it through Astro's
 * logger, failing the build when the findings reach `failOn`.
 */
import { auditPages } from './core.js';
import type { AuditOptions, Finding } from './core.js';

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

/** The parts of Astro's integration logger the report uses. */
export interface ReportLogger {
	info: (message: string) => void;
	warn: (message: string) => void;
	error: (message: string) => void;
}

/**
 * One finding as a log line.
 *
 * @param f - The finding.
 * @returns `path  [check]  message`.
 */
const line = (f: Finding): string => `${f.path}  [${f.check}]  ${f.message}`;

/**
 * Audit the built site and log what's wrong with it.
 *
 * Runs over every rendered page at once, which is what lets it see duplicate
 * titles and orphan pages at all. Server-rendered routes have no HTML on disk
 * and are skipped; a fully SSR build audits nothing and says so rather than
 * reporting a clean bill of health.
 *
 * @param pages - The built pages.
 * @param options - Thresholds and checks, plus `failOn`.
 * @param context - The site URL Astro was given, and the logger.
 * @throws {Error} When findings reach `failOn`.
 */
export function reportAudit(
	pages: Array<{ path: string; html: string }>,
	options: SeoAuditOptions,
	{ site, logger }: { site?: string; logger: ReportLogger },
): void {
	const { failOn = 'error', ...auditOptions } = options;

	if (pages.length === 0) {
		logger.warn('No static HTML found — nothing audited (an SSR-only build?).');
		return;
	}

	/* Astro already knows the site URL, and without it the audit can't tell an
	 * internal link from an external one: every absolute canonical reads as
	 * off-site. An explicit `site` in the options still wins. */
	const { findings, checked, errors, warnings } = auditPages(pages, { site, ...auditOptions });

	if (findings.length === 0) {
		logger.info(`${checked} page(s) checked, no problems found.`);
		return;
	}

	for (const f of findings.filter((f) => f.level === 'error')) logger.error(line(f));
	for (const f of findings.filter((f) => f.level === 'warn')) logger.warn(line(f));
	logger.info(`${checked} page(s) checked — ${errors} error(s), ${warnings} warning(s).`);

	const shouldFail = (failOn === 'error' && errors > 0) || (failOn === 'warn' && errors + warnings > 0);
	if (shouldFail) {
		throw new Error(
			`SEO audit failed: ${errors} error(s), ${warnings} warning(s) across ${checked} page(s). ` +
				`Set audit: { failOn: 'never' } to report without failing the build.`,
		);
	}
}
