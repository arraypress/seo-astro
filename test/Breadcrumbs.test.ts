import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import BreadcrumbsRaw from '../src/Breadcrumbs.astro';
import { breadcrumbList } from '../src/core.js';

const Breadcrumbs = BreadcrumbsRaw as Parameters<AstroContainer['renderToString']>[0];

let container: AstroContainer;
beforeAll(async () => {
	container = await AstroContainer.create();
});

const TRAIL = [
	{ name: 'Home', url: '/' },
	{ name: 'Docs', url: '/docs' },
	{ name: 'Installing' },
];

const render = (props: Record<string, unknown> = { items: TRAIL }): Promise<string> =>
	container.renderToString(Breadcrumbs, { props });

/** Pull the JSON-LD block back out of the rendered markup. */
function structuredData(html: string): Record<string, any> | undefined {
	const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
	return m ? JSON.parse(m[1]) : undefined;
}

describe('breadcrumbList()', () => {
	it('numbers positions from 1 and keeps trail order', () => {
		const ld = breadcrumbList(TRAIL) as any;
		expect(ld['@context']).toBe('https://schema.org');
		expect(ld['@type']).toBe('BreadcrumbList');
		expect(ld.itemListElement.map((i: any) => i.position)).toEqual([1, 2, 3]);
		expect(ld.itemListElement.map((i: any) => i.name)).toEqual(['Home', 'Docs', 'Installing']);
	});

	it('omits `item` for an entry with no url', () => {
		const ld = breadcrumbList(TRAIL) as any;
		expect(ld.itemListElement[0].item).toBe('/');
		expect(ld.itemListElement[2].item).toBeUndefined();
	});

	it('handles an empty trail', () => {
		expect((breadcrumbList([]) as any).itemListElement).toEqual([]);
	});
});

describe('<Breadcrumbs>', () => {
	it('renders a labelled nav around an ordered list', async () => {
		const html = await render();
		expect(html).toContain('aria-label="Breadcrumb"');
		expect(html).toContain('<ol>');
		expect((html.match(/<li>/g) ?? [])).toHaveLength(3);
	});

	it('links every crumb but the last', async () => {
		const html = await render();
		expect(html).toContain('<a href="/">Home</a>');
		expect(html).toContain('<a href="/docs">Docs</a>');
		expect(html).not.toContain('<a href="/installing"');
		expect(html).toContain('aria-current="page"');
	});

	it('hides separators from assistive technology', async () => {
		const html = await render({ items: TRAIL, separator: '›' });
		expect(html).toContain('aria-hidden="true"');
		expect((html.match(/›/g) ?? [])).toHaveLength(2); // between three crumbs
	});

	it('takes a custom nav label and class', async () => {
		const html = await render({ items: TRAIL, label: 'You are here', class: 'crumbs' });
		expect(html).toContain('aria-label="You are here"');
		expect(html).toContain('class="crumbs"');
	});

	/* The whole point of the component: one array drives both, so they cannot
	 * drift the way a hand-maintained pair does. */
	it('emits structured data that matches the visible trail exactly', async () => {
		const html = await render();
		const ld = structuredData(html)!;
		const visible = [...html.matchAll(/<(?:a href="[^"]*"|span aria-current="page")>([^<]+)</g)].map(
			(m) => m[1],
		);
		expect(visible).toEqual(['Home', 'Docs', 'Installing']);
		expect(ld.itemListElement.map((i: any) => i.name)).toEqual(visible);
	});

	it('declares no url for the current page, matching the unlinked last crumb', async () => {
		const ld = structuredData(await render())!;
		expect(ld.itemListElement[2].item).toBeUndefined();
	});

	it('ignores a url given for the last crumb rather than honouring it in one place only', async () => {
		const html = await render({
			items: [{ name: 'Home', url: '/' }, { name: 'Here', url: '/here' }],
		});
		expect(html).not.toContain('<a href="/here"');
		expect(structuredData(html)!.itemListElement[1].item).toBeUndefined();
	});

	it('can omit the structured data', async () => {
		expect(structuredData(await render({ items: TRAIL, jsonLd: false }))).toBeUndefined();
	});

	it('emits nothing structured for an empty trail', async () => {
		const html = await render({ items: [] });
		expect(structuredData(html)).toBeUndefined();
		expect(html).toContain('<ol>');
	});

	it('escapes a crumb name that contains markup', async () => {
		const html = await render({ items: [{ name: '<em>A</em> & B', url: '/' }, { name: 'Now' }] });
		expect(html).not.toContain('<em>A</em>');
		expect(html).toContain('&lt;em&gt;A&lt;/em&gt;');
		expect(html).toContain('&amp;');
	});

	/* A `</script>` inside a crumb name would otherwise close the JSON-LD block
	 * early and spill the rest of it into the document as markup. */
	it('cannot be used to break out of the JSON-LD block', async () => {
		const html = await render({
			items: [{ name: '</script><img src=x onerror=alert(1)>', url: '/' }, { name: 'Now' }],
		});
		const ld = structuredData(html)!;
		expect(ld.itemListElement[0].name).toBe('</script><img src=x onerror=alert(1)>');
		expect(html).not.toContain('<img src=x onerror=alert(1)>');
		expect(html).toContain('\\u003c/script>');
	});
});
