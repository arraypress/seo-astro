import { describe, it, expect } from 'vitest';
import { buildHead, robotsTxt } from '../src/core.js';

/**
 * Conformance to the specifications this package claims to implement.
 *
 * Worth being precise about which parts are actually specified:
 *
 * - **Open Graph** (https://ogp.me) is a real spec with a hard requirement:
 *   "The four required properties for every page are: og:title, og:type,
 *   og:image, og:url." That is machine-checkable and checked below.
 * - **Twitter/X Cards** define a fixed set of `twitter:card` values and state
 *   that the card falls back to Open Graph for title/description/image.
 * - **robots.txt** follows RFC 9309 (`User-agent` / `Allow` / `Disallow`, and
 *   `Sitemap` as a de-facto extension).
 * - **Title and description lengths** are *not* specified by anyone. Google
 *   truncates on pixel width. Nothing here asserts a character limit as if it
 *   were a rule — the audit's thresholds are options, deliberately.
 */

const FULL = {
	title: 'A page',
	description: 'What the page is about.',
	url: 'https://example.com/page',
	image: 'https://example.com/og.png',
	imageWidth: 1200,
	imageHeight: 630,
	imageAlt: 'A picture',
	siteName: 'Example',
	type: 'website',
	locale: 'en_US',
};

const props = (html: string): Set<string> =>
	new Set([...html.matchAll(/<meta property="([^"]+)"/g)].map((m) => m[1]));

const names = (html: string): Set<string> =>
	new Set([...html.matchAll(/<meta name="([^"]+)"/g)].map((m) => m[1]));

const content = (html: string, key: string): string | undefined =>
	html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1];

describe('Open Graph (ogp.me)', () => {
	it('emits all four required properties', () => {
		const html = buildHead(FULL);
		for (const required of ['og:title', 'og:type', 'og:image', 'og:url']) {
			expect(props(html)).toContain(required);
		}
	});

	it('always emits og:type, since it is required and has a spec default', () => {
		// 'website' is a defined og:type value; omitting the property entirely
		// would leave the object untyped, which the spec does not allow.
		expect(props(buildHead({ title: 'X' }))).toContain('og:type');
		expect(content(buildHead({ title: 'X' }), 'og:type')).toBe('website');
	});

	it('uses only og:type values the spec defines', () => {
		const defined = [
			'website', 'article', 'book', 'profile', 'payment.link',
			'music.song', 'music.album', 'music.playlist', 'music.radio_station',
			'video.movie', 'video.episode', 'video.tv_show', 'video.other',
		];
		expect(defined).toContain(content(buildHead(FULL), 'og:type'));
	});

	it('emits image sub-properties under their specified names', () => {
		const html = buildHead(FULL);
		for (const sub of ['og:image:width', 'og:image:height', 'og:image:alt']) {
			expect(props(html)).toContain(sub);
		}
	});

	it('omits image sub-properties when there is no image to describe', () => {
		const html = buildHead({ title: 'X', imageWidth: 1200, imageAlt: 'a' });
		expect(props(html)).not.toContain('og:image:width');
		expect(props(html)).not.toContain('og:image:alt');
	});

	it('puts Open Graph on `property`, not `name`', () => {
		// The spec uses RDFa's `property` attribute. Parsers that follow it will
		// not see a `name="og:title"`.
		const html = buildHead(FULL);
		expect(html).toContain('<meta property="og:title"');
		expect(names(html)).not.toContain('og:title');
	});

	it('puts og:locale in the spec\'s language_TERRITORY form', () => {
		expect(content(buildHead(FULL), 'og:locale')).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
	});
});

describe('Twitter / X Cards', () => {
	it('uses a defined card type', () => {
		const defined = ['summary', 'summary_large_image', 'app', 'player'];
		expect(defined).toContain(content(buildHead(FULL), 'twitter:card'));
		expect(defined).toContain(content(buildHead({ title: 'X' }), 'twitter:card'));
	});

	it('picks summary_large_image only when there is an image', () => {
		expect(content(buildHead({ title: 'X', image: 'i.png' }), 'twitter:card')).toBe('summary_large_image');
		expect(content(buildHead({ title: 'X' }), 'twitter:card')).toBe('summary');
	});

	it('puts Twitter tags on `name`, per their docs', () => {
		expect(buildHead(FULL)).toContain('<meta name="twitter:card"');
	});

	it('relies on the documented Open Graph fallback by default', () => {
		// X reads og:title/og:description/og:image when the twitter:* equivalents
		// are absent, so emitting both is duplication, not safety.
		const html = buildHead(FULL);
		expect(names(html)).not.toContain('twitter:title');
		expect(names(html)).not.toContain('twitter:description');
		expect(props(html)).toContain('og:title');
	});

	it('emits them explicitly when the fallback is switched off', () => {
		const html = buildHead({ ...FULL, twitterFallback: false });
		expect(names(html)).toContain('twitter:title');
		expect(names(html)).toContain('twitter:description');
		expect(names(html)).toContain('twitter:image');
	});
});

describe('robots directives', () => {
	it('merges Google\'s snippet maxima in their documented form', () => {
		const robots = content(buildHead({ title: 'X' }), 'robots')!;
		expect(robots).toContain('max-image-preview:large');
		expect(robots).toContain('max-snippet:-1');
		expect(robots).toContain('max-video-preview:-1');
	});

	it('keeps a caller directive and does not duplicate a key it already set', () => {
		const robots = content(buildHead({ title: 'X', robots: 'noindex, max-snippet:20' }), 'robots')!;
		expect(robots).toContain('noindex');
		expect(robots).toContain('max-snippet:20');
		expect(robots).not.toContain('max-snippet:-1');
	});

	it('omits the canonical on a noindex page, per Google\'s guidance', () => {
		const html = buildHead({ title: 'X', url: 'https://example.com/x', robots: 'noindex' });
		expect(html).not.toContain('rel="canonical"');
	});
});

describe('robots.txt (RFC 9309)', () => {
	it('opens with a User-agent line', () => {
		expect(robotsTxt({ disallow: ['/admin'] }).split('\n')[0]).toBe('User-agent: *');
	});

	it('uses the specified record names', () => {
		const txt = robotsTxt({ allow: ['/'], disallow: ['/admin'], crawlDelay: 10 });
		expect(txt).toContain('Allow: /');
		expect(txt).toContain('Disallow: /admin');
		expect(txt).toContain('Crawl-delay: 10');
	});

	it('puts Sitemap on its own line, absolute, after a blank line', () => {
		const txt = robotsTxt({ sitemapUrl: 'https://example.com/sitemap.xml' });
		expect(txt).toMatch(/\n\nSitemap: https:\/\/example\.com\/sitemap\.xml\n$/);
	});

	it('ends with a newline', () => {
		expect(robotsTxt({ allow: ['/'] }).endsWith('\n')).toBe(true);
	});
});

describe('canonical URLs', () => {
	it('is emitted as a rel=canonical link', () => {
		expect(buildHead(FULL)).toContain('<link rel="canonical" href="https://example.com/page">');
	});

	it('matches og:url, which the spec calls the permanent ID', () => {
		const html = buildHead(FULL);
		expect(content(html, 'og:url')).toBe('https://example.com/page');
		expect(html).toContain(`<link rel="canonical" href="${content(html, 'og:url')}">`);
	});
});

describe('escaping', () => {
	it('escapes attribute-breaking characters in every value it writes', () => {
		const html = buildHead({ title: 'A " B', description: 'C & D', siteName: '<script>' });
		expect(html).toContain('&quot;');
		expect(html).toContain('&amp;');
		expect(html).toContain('&lt;script&gt;');
		expect(html).not.toContain('content="A " B"');
	});

	it('cannot be used to close the JSON-LD block early', () => {
		const html = buildHead({ jsonLd: { '@type': 'Thing', name: '</script><img src=x>' } });
		expect(html).not.toContain('</script><img src=x>');
		expect(html).toContain('\\u003c/script>');
		const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1];
		expect(JSON.parse(json).name).toBe('</script><img src=x>');
	});
});
