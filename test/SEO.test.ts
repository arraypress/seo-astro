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
