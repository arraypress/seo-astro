import { describe, it, expect } from 'vitest';
import { pageHead } from '../../src/head/page.js';
import { takeMarkers } from '../../src/og/marker.js';
import type { HeadConfig } from '../../src/head/page.js';

const SITE = 'https://example.com';
const OG: HeadConfig['og'] = { dir: 'og', base: '/', width: 1200, height: 630 };

/** Render a page's head at `path` with the given props and config. */
function head(props: Parameters<typeof pageHead>[0], config: HeadConfig = {}, path = '/blog/hello/') {
	return pageHead(props, { config, url: new URL(path, SITE), site: new URL(SITE) });
}

/** The JSON-LD blocks in a head, parsed. */
const ld = (html: string) =>
	[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

describe('pageHead — defaults', () => {
	it('puts site-wide defaults under the page props', () => {
		const html = head({ title: 'Hello' }, { defaults: { siteName: 'Example', locale: 'en_GB', titleTemplate: '%s — Example' } });
		expect(html).toContain('<title>Hello — Example</title>');
		expect(html).toContain('<meta property="og:site_name" content="Example">');
		expect(html).toContain('<meta property="og:locale" content="en_GB">');
	});

	it("lets a page's own props win", () => {
		const html = head({ title: 'Hello', siteName: 'Other' }, { defaults: { siteName: 'Example' } });
		expect(html).toContain('content="Other"');
		expect(html).not.toContain('content="Example"');
	});

	it('derives the canonical from the page URL, tracking params stripped', () => {
		const html = pageHead({ title: 'X' }, { url: new URL(`${SITE}/p?utm_source=x&id=7`), site: SITE });
		expect(html).toContain('<link rel="canonical" href="https://example.com/p?id=7">');
	});
});

describe('pageHead — images', () => {
	it('makes a relative image absolute against the site', () => {
		expect(head({ title: 'X', image: '/og.png' })).toContain('<meta property="og:image" content="https://example.com/og.png">');
	});

	it('leaves an absolute image alone, and draws no card', () => {
		const html = head({ title: 'X', image: 'https://cdn.example.net/a.png' }, { og: OG });
		expect(html).toContain('content="https://cdn.example.net/a.png"');
		expect(takeMarkers(html).cards).toEqual([]);
	});
});

describe('pageHead — generated cards', () => {
	it("points og:image at the page's card and leaves a marker for the build", () => {
		const html = head({ title: 'Hello', description: 'A post', titleTemplate: '%s — Example' }, { og: OG });
		expect(html).toContain('<meta property="og:image" content="https://example.com/og/blog/hello.png">');
		expect(html).toContain('<meta property="og:image:width" content="1200">');
		expect(html).toContain('<meta property="og:image:height" content="630">');
		expect(html).toContain('<meta property="og:image:alt" content="Hello">');
		expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
		// The card carries the bare title, not the templated one.
		expect(takeMarkers(html).cards).toEqual([{ file: 'og/blog/hello.png', card: { title: 'Hello', subtitle: 'A post' } }]);
	});

	it("takes the site's name off the card's headline, and keeps it in the title", () => {
		const html = head({ title: 'Open source — Example', description: 'Code' }, { og: OG, defaults: { siteName: 'Example' } });
		expect(html).toContain('<title>Open source — Example</title>');
		expect(takeMarkers(html).cards[0].card.title).toBe('Open source');
		expect(html).toContain('<meta property="og:image:alt" content="Open source">');
	});

	it("keeps an og.title as it is, site name and all", () => {
		const html = head({ title: 'Hello — Example', og: { title: 'Hello — Example' } }, { og: OG, defaults: { siteName: 'Example' } });
		expect(takeMarkers(html).cards[0].card.title).toBe('Hello — Example');
	});

	it('names the home page card index', () => {
		expect(head({ title: 'Home' }, { og: OG }, '/')).toContain('content="https://example.com/og/index.png"');
	});

	it('takes the card content from the og prop, and the eyebrow from the config', () => {
		const html = head(
			{ title: 'Hello', description: 'A post', og: { title: 'Hi', chips: ['One'], artwork: '/img/a.png' } },
			{ og: { ...OG, eyebrow: 'Blog' } },
		);
		expect(takeMarkers(html).cards[0].card).toEqual({ title: 'Hi', subtitle: 'A post', eyebrow: 'Blog', chips: ['One'], artwork: '/img/a.png' });
	});

	it('draws no card with og={false}, or when cards are off', () => {
		for (const html of [head({ title: 'X', og: false }, { og: OG }), head({ title: 'X' }, { og: false })]) {
			expect(html).not.toContain('og:image');
			expect(takeMarkers(html).cards).toEqual([]);
		}
	});

	it('draws no card for a page with no title', () => {
		expect(head({ description: 'Untitled' }, { og: OG })).not.toContain('og:image');
	});

	it("keeps Astro's base on the URL but not in the file", () => {
		const html = pageHead({ title: 'Start' }, { config: { og: { ...OG, base: '/docs' } }, url: new URL(`${SITE}/docs/start`), site: SITE });
		expect(html).toContain('content="https://example.com/docs/og/start.png"');
		expect(takeMarkers(html).cards[0].file).toBe('og/start.png');
	});
});

describe('pageHead — JSON-LD', () => {
	const org = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Acme', url: `${SITE}/` };
	const article = { '@context': 'https://schema.org', '@type': 'Article', headline: 'Hello', url: `${SITE}/blog/hello/` };

	it('emits a lone site-wide node as it is', () => {
		expect(ld(head({ title: 'X' }, { jsonLd: org }))).toEqual([org]);
	});

	it("joins the site's nodes and the page's into one connected graph", () => {
		const [graph] = ld(head({ title: 'X', jsonLd: article }, { jsonLd: org }));
		expect(graph['@context']).toBe('https://schema.org');
		const [o, a] = graph['@graph'];
		expect(o['@id']).toBe('https://example.com#organization');
		expect(a.publisher).toEqual({ '@id': o['@id'] });
	});

	it('leaves a graph the page built itself alone', () => {
		const own = { '@context': 'https://schema.org', '@graph': [article] };
		expect(ld(head({ title: 'X', jsonLd: own }, { jsonLd: org }))).toEqual([org, own]);
	});
});
