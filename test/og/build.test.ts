import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOgImages } from '../../src/og/build.js';
import { ogMarker } from '../../src/og/marker.js';
import { readPages } from '../../src/integration/pages.js';

// The first render loads Satori's layout engine, which takes a few seconds.
vi.setConfig({ testTimeout: 60_000 });

const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#fff"/></svg>';

/** An 8×8 red WebP. */
const WEBP = 'UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoIAAgAAUAmJaACdLoB+AADsAD+8ut//NgVzXPv9//S4P0uD9Lg/9KQAAA=';

/** PNG width and height, from the IHDR chunk. */
const size = (png: Buffer) => [png.readUInt32BE(16), png.readUInt32BE(20)];

let root: string;
let project: string;
let cacheDir: string;
let warnings: string[];

/** A built page carrying a marker for `card`. */
function page(path: string, file: string, card: object) {
	const full = join(root, path);
	mkdirSync(join(full, '..'), { recursive: true });
	writeFileSync(full, `<html><head><title>T</title>\n${ogMarker(file, card)}\n</head><body></body></html>`);
}

/** Run the build step over the pages written so far. */
async function run(og: Record<string, unknown> = {}) {
	const pages = await readPages(root);
	const result = await buildOgImages(pages, { dir: 'og', tile: 'artwork', ...og }, {
		root,
		projectRoot: project,
		cacheDir,
		logger: { warn: (m: string) => warnings.push(m) },
	});
	return { pages, result };
}

beforeEach(() => {
	const tmp = mkdtempSync(join(tmpdir(), 'seo-og-'));
	root = join(tmp, 'dist');
	project = tmp;
	cacheDir = join(tmp, 'cache');
	mkdirSync(root);
	writeFileSync(join(tmp, 'logo.svg'), LOGO);
	warnings = [];
});

describe('buildOgImages', () => {
	it('renders a 1200×630 PNG per card and takes the markers out', async () => {
		page('index.html', 'og/index.png', { title: 'Home' });
		page('blog/hello/index.html', 'og/blog/hello.png', { title: 'Hello', subtitle: 'A post', chips: ['One'] });

		const { pages, result } = await run({ logo: 'logo.svg', wordmark: 'example.com' });

		expect(result).toEqual({ cards: 2, rendered: 2, reused: 0 });
		for (const file of ['og/index.png', 'og/blog/hello.png']) {
			expect(size(readFileSync(join(root, file)))).toEqual([1200, 630]);
		}
		for (const p of pages) {
			expect(p.html).not.toContain('data-seo-og');
			expect(readFileSync(p.file, 'utf8')).toBe(p.html);
		}
	});

	it('reuses a cached card when nothing about it changed', async () => {
		page('index.html', 'og/index.png', { title: 'Home' });
		await run();
		page('index.html', 'og/index.png', { title: 'Home' });
		expect((await run()).result).toEqual({ cards: 1, rendered: 0, reused: 1 });
		expect(size(readFileSync(join(root, 'og/index.png')))).toEqual([1200, 630]);
	});

	it('re-renders when the card or the options change, and drops stale cache entries', async () => {
		page('index.html', 'og/index.png', { title: 'Home' });
		await run();
		page('index.html', 'og/index.png', { title: 'Home, again' });
		expect((await run()).result.rendered).toBe(1);
		page('index.html', 'og/index.png', { title: 'Home, again' });
		expect((await run({ colors: { accent: '#ff0000' } })).result.rendered).toBe(1);
		expect(readdirSync(cacheDir)).toHaveLength(1);
	});

	it('renders without a cache when it is off', async () => {
		page('index.html', 'og/index.png', { title: 'Home' });
		await run({ cache: false });
		page('index.html', 'og/index.png', { title: 'Home' });
		expect((await run({ cache: false })).result.rendered).toBe(1);
	});

	it('reads artwork from the build output', async () => {
		writeFileSync(join(root, 'art.svg'), LOGO);
		page('index.html', 'og/index.png', { title: 'Home', artwork: '/art.svg' });
		await run();
		expect(warnings).toEqual([]);
		expect(size(readFileSync(join(root, 'og/index.png')))).toEqual([1200, 630]);
	});

	it('warns about artwork it cannot find, and renders without it', async () => {
		page('index.html', 'og/index.png', { title: 'Home', artwork: '/missing.png' });
		await run();
		expect(warnings[0]).toMatch(/og\/index\.png: artwork \/missing\.png isn't in the build/);
		expect(readFileSync(join(root, 'og/index.png')).length).toBeGreaterThan(1000);
	});

	it('draws WebP artwork from the build, through sharp', async () => {
		writeFileSync(join(root, 'cover.webp'), Buffer.from(WEBP, 'base64'));
		page('index.html', 'og/index.png', { title: 'Home', artwork: '/cover.webp' });
		await run();
		expect(warnings).toEqual([]);
		expect(size(readFileSync(join(root, 'og/index.png')))).toEqual([1200, 630]);
	});

	it("passes on the renderer's warnings, and doesn't cache a card that had one", async () => {
		writeFileSync(join(root, 'cover.webp'), Buffer.from(WEBP, 'base64').subarray(0, 20));
		page('index.html', 'og/index.png', { title: 'Home', artwork: '/cover.webp' });
		expect((await run()).result.rendered).toBe(1);
		expect(warnings[0]).toMatch(/^og\/index\.png: og-image: the artwork is WEBP/);
		page('index.html', 'og/index.png', { title: 'Home', artwork: '/cover.webp' });
		expect((await run()).result.rendered).toBe(1);
	});

	it('loads fonts by path', async () => {
		page('index.html', 'og/index.png', { title: 'Home' });
		const font = fileURLToPath(new URL('../../node_modules/@arraypress/og-image/fonts/inter-latin-700.woff', import.meta.url));
		await run({ fonts: [{ path: font, weight: 700 }] });
		expect(size(readFileSync(join(root, 'og/index.png')))).toEqual([1200, 630]);
	});

	it('passes the backdrop and font families to the renderer, and re-renders when they change', async () => {
		page('index.html', 'og/index.png', { title: 'Home' });
		const font = fileURLToPath(new URL('../../node_modules/@arraypress/og-image/fonts/inter-latin-700.woff', import.meta.url));
		const look = {
			stripe: false,
			backdrop: { grain: true, glows: [{ color: '#2f5bff', x: 0, y: 80 }] },
			fonts: [{ path: font, weight: 400 }, { path: font, name: 'Display', weight: 700 }],
			displayFontFamily: 'Display',
		};
		expect((await run(look)).result.rendered).toBe(1);
		page('index.html', 'og/index.png', { title: 'Home' });
		expect((await run(look)).result.rendered).toBe(0);
		page('index.html', 'og/index.png', { title: 'Home' });
		expect((await run({ ...look, backdrop: { glows: [{ color: '#f5a524' }] } })).result.rendered).toBe(1);
		expect(size(readFileSync(join(root, 'og/index.png')))).toEqual([1200, 630]);
	});

	it('does nothing for a build with no markers', async () => {
		writeFileSync(join(root, 'index.html'), '<html><head></head></html>');
		expect((await run()).result).toEqual({ cards: 0, rendered: 0, reused: 0 });
	});
});
