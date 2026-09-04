import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SEORaw from '../src/SEO.astro';
import type { SEOProps } from '../src/types';

const SEO = SEORaw as Parameters<AstroContainer['renderToString']>[0];

let container: AstroContainer;

beforeAll(async () => {
	container = await AstroContainer.create();
});

async function render(props: SEOProps = {}): Promise<string> {
	return container.renderToString(SEO, {
		props: props as unknown as Record<string, unknown>,
	});
}

describe('<SEO>', () => {
	it('renders the title + description', async () => {
		const html = await render({ title: 'My Page', description: 'A great page' });
		expect(html).toContain('<title>My Page</title>');
		expect(html).toContain('A great page');
	});

	it('renders Open Graph + Twitter from url/image/siteName', async () => {
		const html = await render({
			title: 'My Page',
			url: 'https://example.com/page',
			image: 'https://example.com/og.png',
			siteName: 'Example',
		});
		expect(html).toContain('property="og:title"');
		expect(html).toContain('property="og:image"');
		expect(html).toContain('https://example.com/og.png');
		expect(html).toContain('rel="canonical"');
		expect(html).toContain('name="twitter:card"');
	});

	it('emits article meta + JSON-LD', async () => {
		const html = await render({
			title: 'Post',
			type: 'article',
			articleAuthor: 'Jane Doe',
			jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: 'Post' },
		});
		expect(html).toContain('property="article:author"');
		expect(html).toContain('application/ld+json');
		expect(html).toContain('"@type":"Article"');
	});

	it('escapes HTML in user-supplied content', async () => {
		const html = await render({ title: 'A & B "C"' });
		expect(html).toContain('&amp;');
		expect(html).not.toContain('<title>A & B "C"</title>');
	});
});

describe('titleTemplate', () => {
	it('substitutes %s, brand-first or brand-last', async () => {
		const suffix = await render({ title: 'Pricing', titleTemplate: '%s — Acme' });
		expect(suffix).toContain('<title>Pricing — Acme</title>');

		const prefix = await render({ title: 'Pricing', titleTemplate: 'Acme — %s' });
		expect(prefix).toContain('<title>Acme — Pricing</title>');
	});

	it('applies to og:title and twitter:title too', async () => {
		const html = await render({
			title: 'Pricing',
			titleTemplate: 'Acme — %s',
			twitterFallback: false,
		});
		expect(html).toContain('property="og:title" content="Acme — Pricing"');
		expect(html).toContain('name="twitter:title" content="Acme — Pricing"');
	});

	it('ignores a template with no %s rather than repeating it site-wide', async () => {
		const html = await render({ title: 'Pricing', titleTemplate: 'Acme' });
		expect(html).toContain('<title>Pricing</title>');
	});

	it('emits no title when there is nothing to fill the template with', async () => {
		const html = await render({ titleTemplate: 'Acme — %s', description: 'x' });
		expect(html).not.toContain('<title>');
		expect(html).not.toContain('og:title');
	});

	it('escapes the composed title, and treats $ in the title literally', async () => {
		const html = await render({ title: 'Tom & $& Co', titleTemplate: 'Acme — %s' });
		expect(html).toContain('<title>Acme — Tom &amp; $&amp; Co</title>');
	});
});
