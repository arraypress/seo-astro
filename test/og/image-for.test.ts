import { describe, it, expect, vi } from 'vitest';

/* The test config serves `<SEO />` a config with cards off; these need them on. */
vi.mock('virtual:@arraypress/seo-astro/config', () => ({
	default: { og: { dir: 'og', base: '/', width: 1200, height: 630 } },
}));

const { ogImageFor } = await import('../../src/og/image-for');

describe('ogImageFor', () => {
	it('gives the URL <SEO /> points og:image at', () => {
		expect(ogImageFor(new URL('https://example.com/blog/hello/'))).toBe('https://example.com/og/blog/hello.png');
		expect(ogImageFor('/', 'https://example.com')).toBe('https://example.com/og/index.png');
	});

	it('uses the site over the page origin', () => {
		expect(ogImageFor(new URL('http://localhost:4321/about'), new URL('https://example.com'))).toBe('https://example.com/og/about.png');
	});
});
