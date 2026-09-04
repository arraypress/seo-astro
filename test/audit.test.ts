import { describe, it, expect } from 'vitest';
import { auditPages, readPage, normalizePath, CHECKS } from '../src/audit.js';
import type { AuditOptions, CheckName } from '../src/audit.js';

const SITE = 'https://example.com';

/** A page with nothing wrong with it, so each test can break exactly one thing. */
function page(opts: {
	path?: string;
	title?: string | null;
	description?: string | null;
	canonical?: string | null;
	robots?: string;
	og?: boolean;
	h1?: number;
	body?: string;
	links?: string[];
} = {}) {
	// Defaults vary by path: two pages built from the same defaults would
	// otherwise trip the duplicate checks, which is the audit working correctly
	// and the fixture being wrong.
	const {
		path = '/index.html',
		title = `A perfectly reasonable title for ${opts.path ?? '/index.html'}`,
		description = `A meta description for ${opts.path ?? '/index.html'} that comfortably clears the minimum length without running past the maximum.`,
		canonical = `${SITE}${normalizePath(path) === '/' ? '/' : normalizePath(path)}`,
		robots,
		og = true,
		h1 = 1,
		body = '',
		links = [],
	} = opts;

	const head = [
		title === null ? '' : `<title>${title}</title>`,
		description === null ? '' : `<meta name="description" content="${description}">`,
		canonical === null ? '' : `<link rel="canonical" href="${canonical}">`,
		robots ? `<meta name="robots" content="${robots}">` : '',
		og
			? [
					'<meta property="og:title" content="T">',
					'<meta property="og:type" content="website">',
					'<meta property="og:image" content="https://example.com/og.png">',
					`<meta property="og:url" content="${SITE}">`,
				].join('')
			: '',
	].join('');

	const headings = Array.from({ length: h1 }, (_, i) => `<h1>Heading ${i + 1}</h1>`).join('');
	const anchors = links.map((h) => `<a href="${h}">x</a>`).join('');
	return { path, html: `<html><head>${head}</head><body>${headings}${anchors}${body}</body></html>` };
}

const run = (pages: Array<{ path: string; html: string }>, options: AuditOptions = {}) =>
	auditPages(pages, { site: SITE, ...options });

const checksFor = (pages: Array<{ path: string; html: string }>, options: AuditOptions = {}) =>
	run(pages, options).findings.map((f) => f.check);

describe('readPage', () => {
	it('takes the title from <head>, not from an inline SVG', () => {
		const read = readPage(
			'<html><head><title>Real title</title></head><body><svg><title>icon label</title></svg></body></html>',
		);
		expect(read.title).toBe('Real title');
	});

	it('decodes entities before anything measures or compares them', () => {
		const read = readPage('<html><head><title>Tom &amp; Jerry &#39;96</title></head><body></body></html>');
		expect(read.title).toBe("Tom & Jerry '96");
	});

	it('reads attributes regardless of their order or quoting', () => {
		const read = readPage(
			`<html><head><meta content='Desc here' name=description><link href=/x rel="canonical"></head><body></body></html>`,
		);
		expect(read.description).toBe('Desc here');
		expect(read.canonical).toBe('/x');
	});

	it('treats alt="" as present — a decorative image is a declaration, not an omission', () => {
		const read = readPage('<html><body><img src="a.png" alt=""><img src="b.png"></body></html>');
		expect(read.images.map((i) => i.hasAlt)).toEqual([true, false]);
	});

	it('collects h1 text with inner markup stripped', () => {
		const read = readPage('<html><body><h1>Hello <em>there</em></h1></body></html>');
		expect(read.h1).toEqual(['Hello there']);
	});
});

describe('normalizePath', () => {
	it.each([
		['/index.html', '/'],
		['/bar/index.html', '/bar'],
		['/bar/', '/bar'],
		['/bar', '/bar'],
		['/bar.html', '/bar'],
		['/bar?x=1#y', '/bar'],
	])('%s -> %s', (input, expected) => {
		expect(normalizePath(input)).toBe(expected);
	});
});

describe('a clean site', () => {
	it('reports nothing', () => {
		const result = run([page({ path: '/index.html', links: ['/about'] }), page({ path: '/about/index.html' })]);
		expect(result.findings).toEqual([]);
		expect(result.checked).toBe(2);
		expect(result.errors).toBe(0);
	});
});

describe('per-page checks', () => {
	it('flags a missing title', () => {
		expect(checksFor([page({ title: null })])).toContain('title-missing');
	});

	it('flags a title past the threshold, and reports the real length', () => {
		const long = 'x'.repeat(80);
		const finding = run([page({ title: long })]).findings.find((f) => f.check === 'title-long');
		expect(finding?.message).toContain('80 chars');
	});

	it('measures the decoded title, not the encoded one', () => {
		// "A & B" is 5 characters; "A &amp; B" is 9. With maxTitleLength 6 only
		// the encoded form would trip, and it is not what a search engine sees.
		expect(checksFor([page({ title: 'A &amp; B' })], { maxTitleLength: 6, minTitleLength: 1 })).not.toContain(
			'title-long',
		);
	});

	it('flags missing and over-long descriptions', () => {
		expect(checksFor([page({ description: null })])).toContain('description-missing');
		expect(checksFor([page({ description: 'y'.repeat(200) })])).toContain('description-long');
	});

	it('flags a missing canonical', () => {
		expect(checksFor([page({ canonical: null })])).toContain('canonical-missing');
	});

	it('flags a canonical pointing off-site', () => {
		expect(checksFor([page({ canonical: 'https://elsewhere.com/a' })])).toContain('canonical-off-site');
	});

	it('accepts equivalent canonical spellings', () => {
		const found = checksFor([page({ path: '/a/index.html', canonical: `${SITE}/a/` })]);
		expect(found.filter((c) => c.startsWith('canonical-'))).toEqual([]);
	});

	it('flags an incomplete Open Graph set, naming the missing properties', () => {
		const finding = run([page({ og: false })]).findings.find((f) => f.check === 'og-incomplete');
		expect(finding?.message).toContain('og:title');
		expect(finding?.message).toContain('og:url');
	});

	it('flags missing and duplicated h1s', () => {
		expect(checksFor([page({ h1: 0 })])).toContain('h1-missing');
		expect(checksFor([page({ h1: 3 })])).toContain('h1-multiple');
	});

	it('flags images with no alt attribute and names the first', () => {
		const finding = run([
			page({ body: '<img src="ok.png" alt="fine"><img src="bad.png">' }),
		]).findings.find((f) => f.check === 'image-alt-missing');
		expect(finding?.message).toContain('bad.png');
	});
});

describe('noindex pages', () => {
	const noindexed = page({ path: '/private/index.html', robots: 'noindex, nofollow', canonical: null, og: false });

	it('are reported as excluded from search', () => {
		expect(checksFor([noindexed])).toContain('noindex');
	});

	it('are exempt from the canonical and Open Graph checks', () => {
		const found = checksFor([noindexed]);
		expect(found).not.toContain('canonical-missing');
		expect(found).not.toContain('og-incomplete');
	});

	it('do not count as duplicates or orphans', () => {
		const found = checksFor([page({ path: '/index.html', title: 'Same title here' }), { ...noindexed, html: noindexed.html.replace(/<title>[^<]*<\/title>/, '<title>Same title here</title>') }]);
		expect(found).not.toContain('title-duplicate');
		expect(found).not.toContain('orphan-page');
	});
});

/* Deduplication — two URLs for one thing, one canonical — is the normal way to
 * handle equivalent pages, not a mistake. Flagging it was this check's original
 * bug: a real site with 373 correctly-deduplicated pairing pages reported 373
 * errors and 373 orphans, all of them wrong. */
describe('canonical deduplication', () => {
	// The site links to the canonical spelling; /a-b exists only to be redirected
	// by rel=canonical, which is exactly why nothing links to it.
	const pair = () => [
		page({ path: '/index.html', links: ['/b-a'] }),
		page({ path: '/a-b/index.html', title: 'Pairing A and B', canonical: `${SITE}/b-a` }),
		page({ path: '/b-a/index.html', title: 'Pairing A and B', canonical: `${SITE}/b-a` }),
	];

	it('says nothing when the target exists and is self-canonical', () => {
		const found = checksFor(pair());
		expect(found.filter((c) => c.startsWith('canonical-'))).toEqual([]);
	});

	it('does not call a deduplicated page an orphan', () => {
		// Nothing links to /a-b by design — it's reached at its canonical.
		expect(checksFor(pair())).not.toContain('orphan-page');
	});

	it('does not call a deduplicated page a duplicate title', () => {
		expect(checksFor(pair())).not.toContain('title-duplicate');
	});

	it('still flags a duplicate title between two self-canonical pages', () => {
		const found = checksFor([
			page({ path: '/index.html', title: 'Shared title text', links: ['/a'] }),
			page({ path: '/a/index.html', title: 'Shared title text' }),
		]);
		expect(found).toContain('title-duplicate');
	});

	it('flags a canonical pointing at a page that is not in the build', () => {
		const finding = run([
			page({ path: '/index.html', links: ['/a'] }),
			page({ path: '/a/index.html', canonical: `${SITE}/nowhere` }),
		]).findings.find((f) => f.check === 'canonical-broken');
		expect(finding?.message).toContain('/nowhere');
		expect(finding?.level).toBe('error');
	});

	it('flags a canonical chain, which Google will not follow twice', () => {
		const finding = run([
			page({ path: '/index.html', links: ['/a', '/b', '/c'] }),
			page({ path: '/a/index.html', canonical: `${SITE}/b` }),
			page({ path: '/b/index.html', canonical: `${SITE}/c` }),
			page({ path: '/c/index.html' }),
		]).findings.find((f) => f.check === 'canonical-chain');
		expect(finding?.path).toBe('/a');
		expect(finding?.message).toContain('/c');
	});
});

describe('set-level checks — the ones a per-page editor cannot do', () => {
	it('flags a duplicate title on every page that shares it', () => {
		const result = run([
			page({ path: '/index.html', title: 'Identical title text', links: ['/a', '/b'] }),
			page({ path: '/a/index.html', title: 'Identical title text' }),
			page({ path: '/b/index.html', title: 'Identical title text' }),
		]);
		const dupes = result.findings.filter((f) => f.check === 'title-duplicate');
		expect(dupes).toHaveLength(3);
		expect(dupes[0].message).toContain('3 pages');
		expect(dupes[0].level).toBe('error');
	});

	it('treats encoded and decoded titles as the same title', () => {
		const found = checksFor([
			page({ path: '/index.html', title: 'Tom &amp; Jerry show', links: ['/a'] }),
			page({ path: '/a/index.html', title: 'Tom & Jerry show' }),
		]);
		expect(found).toContain('title-duplicate');
	});

	it('flags a duplicate description', () => {
		const shared = 'The very same description text used on two different pages, which is long enough.';
		expect(
			checksFor([
				page({ path: '/index.html', description: shared, links: ['/a'] }),
				page({ path: '/a/index.html', description: shared }),
			]),
		).toContain('description-duplicate');
	});

	it('flags a page nothing links to', () => {
		const found = run([page({ path: '/index.html', links: ['/a'] }), page({ path: '/a/index.html' }), page({ path: '/lost/index.html' })]);
		const orphans = found.findings.filter((f) => f.check === 'orphan-page');
		expect(orphans.map((f) => f.path)).toEqual(['/lost']);
	});

	it('never calls the homepage an orphan', () => {
		expect(checksFor([page({ path: '/index.html' })])).not.toContain('orphan-page');
	});

	it('counts an absolute internal link as a link', () => {
		expect(
			checksFor([page({ path: '/index.html', links: [`${SITE}/a`] }), page({ path: '/a/index.html' })]),
		).not.toContain('orphan-page');
	});

	it('does not count an external link as reaching an internal page', () => {
		expect(
			checksFor([page({ path: '/index.html', links: ['https://elsewhere.com/a'] }), page({ path: '/a/index.html' })]),
		).toContain('orphan-page');
	});

	it('ignores anchors, mailto and tel when resolving links', () => {
		const result = run([page({ path: '/index.html', links: ['#top', 'mailto:a@b.c', 'tel:+1', '/a'] }), page({ path: '/a/index.html' })]);
		expect(result.findings.filter((f) => f.check === 'orphan-page')).toHaveLength(0);
	});
});

describe('configuration', () => {
	it('honours custom thresholds', () => {
		expect(checksFor([page({ title: 'Short one' })], { minTitleLength: 5 })).not.toContain('title-short');
		expect(checksFor([page({ title: 'Short one' })], { minTitleLength: 50 })).toContain('title-short');
	});

	it('disables a check set to false', () => {
		expect(checksFor([page({ h1: 0 })], { checks: { 'h1-missing': false } })).not.toContain('h1-missing');
	});

	it('changes a check level', () => {
		const result = run([page({ h1: 0 })], { checks: { 'h1-missing': 'error' } });
		expect(result.findings.find((f) => f.check === 'h1-missing')?.level).toBe('error');
		expect(result.errors).toBe(1);
	});

	it('skips ignored paths, by string and by pattern', () => {
		expect(run([page({ path: '/draft/index.html', title: null })], { ignore: ['/draft'] }).checked).toBe(0);
		expect(run([page({ path: '/draft/index.html', title: null })], { ignore: [/^\/draft/] }).checked).toBe(0);
	});

	it('works with no site given, skipping only the checks that need one', () => {
		const result = auditPages([page({ path: '/index.html', canonical: '/' })]);
		expect(result.findings.map((f) => f.check)).not.toContain('canonical-mismatch');
	});

	it('counts errors and warnings separately', () => {
		const result = run([
			page({ path: '/index.html', title: 'Identical title text', links: ['/a'] }),
			page({ path: '/a/index.html', title: 'Identical title text', h1: 0 }),
		]);
		expect(result.errors).toBe(2); // one duplicate-title finding per page
		expect(result.warnings).toBe(1); // the missing h1
	});

	it('exposes a default level for every check name', () => {
		for (const [name, level] of Object.entries(CHECKS)) {
			expect(['error', 'warn']).toContain(level);
			expect(typeof name).toBe('string');
		}
		expect(Object.keys(CHECKS)).toContain<CheckName>('orphan-page');
	});
});

describe('edge cases', () => {
	it('handles an empty site', () => {
		expect(auditPages([])).toMatchObject({ findings: [], checked: 0, errors: 0, warnings: 0 });
	});

	it('handles a document with no head or body tags', () => {
		expect(() => auditPages([{ path: '/x', html: '<title>Bare</title><h1>H</h1>' }])).not.toThrow();
	});

	it('handles an empty string', () => {
		const result = auditPages([{ path: '/x', html: '' }]);
		expect(result.findings.map((f) => f.check)).toContain('title-missing');
	});
});
