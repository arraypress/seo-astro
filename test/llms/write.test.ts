import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listedPages, llmsFromPages } from '../../src/llms/pages.js';
import { writeLlms } from '../../src/llms/write.js';

const ORIGIN = 'https://example.com';

/** A built page with a head saying what's given. */
function page(path: string, head: { title?: string; description?: string; canonical?: string; robots?: string; siteName?: string }) {
	const tags = [
		head.title ? `<title>${head.title}</title>` : '',
		head.description ? `<meta name="description" content="${head.description}">` : '',
		head.canonical ? `<link rel="canonical" href="${head.canonical}">` : '',
		head.robots ? `<meta name="robots" content="${head.robots}">` : '',
		head.siteName ? `<meta property="og:site_name" content="${head.siteName}">` : '',
	].join('');
	return { path, html: `<html><head>${tags}</head><body></body></html>` };
}

const PAGES = [
	page('/about/index.html', { title: 'About', description: 'Who we are.', canonical: `${ORIGIN}/about` }),
	page('/index.html', { title: 'Acme — Home', description: 'Acme makes things.', canonical: `${ORIGIN}/`, siteName: 'Acme' }),
	page('/404.html', { title: 'Not found' }),
	page('/drafts/index.html', { title: 'Draft', robots: 'noindex' }),
	page('/plans/index.html', { title: 'Pricing', canonical: `${ORIGIN}/pricing` }),
	page('/pricing/index.html', { title: 'Pricing', canonical: `${ORIGIN}/pricing` }),
];

describe('listedPages', () => {
	it('lists indexable, self-canonical pages, home first', () => {
		expect(listedPages(PAGES, ORIGIN).map((p) => p.url)).toEqual([`${ORIGIN}/`, `${ORIGIN}/about`, `${ORIGIN}/pricing`]);
	});

	it('leaves URLs root-relative without a site', () => {
		expect(listedPages([page('/about/index.html', { title: 'About' })], '')[0].url).toBe('/about');
	});
});

describe('llmsFromPages', () => {
	it("takes the name and description from the home page and links every page", () => {
		expect(llmsFromPages(listedPages(PAGES, ORIGIN))).toEqual({
			name: 'Acme',
			description: 'Acme makes things.',
			sections: [
				{
					title: 'Pages',
					links: [
						{ label: 'Acme — Home', url: `${ORIGIN}/`, description: 'Acme makes things.' },
						{ label: 'About', url: `${ORIGIN}/about`, description: 'Who we are.' },
						{ label: 'Pricing', url: `${ORIGIN}/pricing` },
					],
				},
			],
		});
	});
});

describe('writeLlms', () => {
	let root: string;
	const read = () => readFileSync(join(root, 'llms.txt'), 'utf8');

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), 'seo-llms-'));
	});

	it('writes a file from the built pages', async () => {
		expect(await writeLlms(PAGES, true, { root, origin: ORIGIN })).toEqual({ written: true, links: 3 });
		expect(read()).toBe(
			'# Acme\n\n> Acme makes things.\n\n## Pages\n\n' +
				`- [Acme — Home](${ORIGIN}/): Acme makes things.\n- [About](${ORIGIN}/about): Who we are.\n- [Pricing](${ORIGIN}/pricing)`,
		);
	});

	it('writes the content it is given, filling in the name and description', async () => {
		await writeLlms(PAGES, { sections: [{ title: 'Docs', links: [{ label: 'Start', url: `${ORIGIN}/start` }] }] }, { root, origin: ORIGIN });
		expect(read()).toBe(`# Acme\n\n> Acme makes things.\n\n## Docs\n\n- [Start](${ORIGIN}/start)`);
	});

	it('hands a function the origin and the listed pages', async () => {
		await writeLlms(
			PAGES,
			({ origin, pages }) => ({ name: 'Mine', description: `${pages.length} pages at ${origin}` }),
			{ root, origin: ORIGIN },
		);
		expect(read()).toBe(`# Mine\n\n> 3 pages at ${ORIGIN}`);
	});

	it("keeps an llms.txt the site builds itself", async () => {
		writeFileSync(join(root, 'llms.txt'), '# Own');
		expect(await writeLlms(PAGES, true, { root, origin: ORIGIN })).toEqual({ written: false, links: 0 });
		expect(read()).toBe('# Own');
	});

	it('refuses two sources for one file', async () => {
		writeFileSync(join(root, 'llms.txt'), '# Own');
		await expect(writeLlms(PAGES, { name: 'Config' }, { root, origin: ORIGIN })).rejects.toThrow(/already has an llms\.txt/);
		expect(existsSync(join(root, 'llms.txt'))).toBe(true);
	});
});
