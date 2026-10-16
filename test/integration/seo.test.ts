import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import seo from '../../src/integration/index';
import { CONFIG_MODULE } from '../../src/integration/config-module';
import { pageHead } from '../../src/head/page.js';
import type { HeadConfig } from '../../src/head/page.js';
import type { SeoOptions } from '../../src/integration/types';

// Rendering the cards loads Satori's layout engine, which takes a few seconds.
vi.setConfig({ testTimeout: 60_000 });

const SITE = 'https://example.com';

let project: string;
let root: string;
let logs: Record<'info' | 'warn' | 'error', string[]>;

/** A stand-in for Astro's integration logger that keeps what it's told. */
function logger() {
	const log = {
		info: (m: string) => logs.info.push(m),
		warn: (m: string) => logs.warn.push(m),
		error: (m: string) => logs.error.push(m),
		fork: () => log,
	};
	return log;
}

/**
 * Run the integration the way Astro would: set up, read back the config it
 * gives `<SEO />`, render `pages` with it, then finish the build.
 */
async function build(options: SeoOptions, pages: Record<string, { title: string; description?: string; body?: string }>) {
	const integration = seo(options);
	const hooks = integration.hooks as Record<string, (arg: unknown) => unknown>;
	const plugins: Array<{ resolveId: (id: string) => string | undefined; load: (id: string) => string | undefined }> = [];
	const config = {
		site: SITE,
		base: '/',
		root: pathToFileURL(project + '/'),
		cacheDir: pathToFileURL(join(project, 'cache') + '/'),
	};

	await hooks['astro:config:setup']({ config, updateConfig: (c: { vite: { plugins: typeof plugins } }) => plugins.push(...c.vite.plugins) });
	await hooks['astro:config:done']({ config, logger: logger() });

	const code = plugins[0].load(plugins[0].resolveId(CONFIG_MODULE)!)!;
	const head: HeadConfig = JSON.parse(code.replace(/^export default /, '').replace(/;$/, ''));

	for (const [path, props] of Object.entries(pages)) {
		const file = join(root, path === '/' ? 'index.html' : `${path}/index.html`);
		mkdirSync(join(file, '..'), { recursive: true });
		const tags = pageHead(props, { config: head, url: new URL(path, SITE), site: SITE });
		writeFileSync(file, `<html><head>${tags}<script>boot()</script></head><body><h1>${props.title}</h1>${props.body ?? ''}</body></html>`);
	}

	await hooks['astro:build:done']({ dir: pathToFileURL(root + '/'), logger: logger() });
	return head;
}

const read = (file: string) => readFileSync(join(root, file), 'utf8');

const PAGES = {
	'/': { title: 'Acme makes things', description: 'Acme makes useful things for people who need them, and sells them online.', body: '<a href="/about">About</a>' },
	'/about': { title: 'About Acme and its people', description: 'Who makes the things Acme sells, where they are, and how to reach them.', body: '<a href="/">Home</a>' },
};

beforeEach(() => {
	project = mkdtempSync(join(tmpdir(), 'seo-int-'));
	root = join(project, 'dist');
	mkdirSync(root);
	logs = { info: [], warn: [], error: [] };
});

describe('seo()', () => {
	it('gives <SEO /> the defaults, the site JSON-LD and the card settings', async () => {
		const head = await build(
			{ defaults: { siteName: 'Acme' }, jsonLd: ({ origin }) => ({ '@type': 'Organization', url: origin }), og: { eyebrow: 'Acme' } },
			{},
		);
		expect(head).toEqual({
			defaults: { siteName: 'Acme' },
			jsonLd: { '@type': 'Organization', url: SITE },
			og: { dir: 'og', base: '/', width: 1200, height: 630, eyebrow: 'Acme' },
		});
	});

	it('renders the cards, writes llms.txt and _headers, and audits the build', async () => {
		await build({ defaults: { siteName: 'Acme' } }, PAGES);

		for (const file of ['og/index.png', 'og/about.png']) expect(read(file).length).toBeGreaterThan(1000);
		expect(read('index.html')).toContain(`<meta property="og:image" content="${SITE}/og/index.png">`);
		expect(read('index.html')).not.toContain('data-seo-og');

		expect(read('llms.txt')).toBe(
			'# Acme\n\n> Acme makes useful things for people who need them, and sells them online.\n\n## Pages\n\n' +
				`- [Acme makes things](${SITE}/): Acme makes useful things for people who need them, and sells them online.\n` +
				`- [About Acme and its people](${SITE}/about): Who makes the things Acme sells, where they are, and how to reach them.`,
		);

		expect(read('_headers')).toMatch(/Content-Security-Policy: [^\n]*script-src 'self' 'sha256-/);

		expect(logs.error).toEqual([]);
		expect(logs.info).toContain('OG cards: 2 (2 rendered, 0 unchanged) in /og/');
		expect(logs.info).toContain('wrote llms.txt — 2 link(s)');
		expect(logs.info).toContain('2 page(s) checked, no problems found.');
		expect(logs.info.some((m) => m.startsWith('wrote _headers'))).toBe(true);
	});

	it('hashes the pages as they are after the markers come out', async () => {
		await build({}, PAGES);
		// One inline script, identical on both pages: one hash, nothing from the markers.
		const csp = read('_headers').match(/script-src ([^;]+)/)![1];
		expect(csp.match(/'sha256-/g)).toHaveLength(1);
	});

	it('fails the build on an audit error', async () => {
		const twins = { '/': { ...PAGES['/'] }, '/about': { ...PAGES['/about'], title: PAGES['/'].title } };
		await expect(build({ og: false }, twins)).rejects.toThrow(/SEO audit failed: 2 error/);
		expect(logs.error[0]).toMatch(/\[title-duplicate\]/);
	});

	it('does none of it with every part off', async () => {
		await build({ og: false, llms: false, headers: false, audit: false }, PAGES);
		expect(existsSync(join(root, 'og'))).toBe(false);
		expect(existsSync(join(root, 'llms.txt'))).toBe(false);
		expect(existsSync(join(root, '_headers'))).toBe(false);
		expect(read('index.html')).not.toContain('og:image');
		expect(logs.info).toEqual([]);
	});

	it('holds this host alone to HTTPS by default, and subdomains when asked', async () => {
		await build({ og: false, llms: false, audit: false }, PAGES);
		expect(read('_headers')).toMatch(/Strict-Transport-Security: max-age=31536000\n/);
		await build({ og: false, llms: false, audit: false, headers: { hsts: { includeSubDomains: true } } }, PAGES);
		expect(read('_headers')).toContain('Strict-Transport-Security: max-age=31536000; includeSubDomains');
	});

	it('passes header settings through', async () => {
		await build({ og: false, llms: false, audit: false, headers: { csp: false, xFrameOptions: 'DENY', filename: '_headers.txt' } }, PAGES);
		const body = read('_headers.txt');
		expect(body).toContain('X-Frame-Options: DENY');
		expect(body).not.toContain('Content-Security-Policy');
	});
});
