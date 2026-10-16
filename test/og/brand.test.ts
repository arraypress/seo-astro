import { describe, it, expect } from 'vitest';
import { bareHost, brandUrl, cardBrand } from '../../src/og/brand.js';

const org = { '@type': 'Organization', name: 'Acme', url: 'https://www.acme.com/' };
const site = { '@type': 'WebSite', name: 'Acme', url: 'https://acme.dev/' };
const person = { '@type': 'Person', name: 'Ann', url: 'https://ann.example/' };

describe('brandUrl', () => {
	it("takes the Organization's url, then a Person's, then the WebSite's", () => {
		expect(brandUrl([site, person, org])).toBe('https://www.acme.com/');
		expect(brandUrl([site, person])).toBe('https://ann.example/');
		expect(brandUrl(site)).toBe('https://acme.dev/');
	});

	it('looks inside a @graph, and at a node with several types', () => {
		expect(brandUrl({ '@graph': [site, { ...org, '@type': ['Organization', 'Brand'] }] })).toBe('https://www.acme.com/');
	});

	it('finds nothing in nothing', () => {
		expect(brandUrl(undefined)).toBeUndefined();
		expect(brandUrl([{ '@type': 'Organization', name: 'No url' }])).toBeUndefined();
	});
});

describe('bareHost', () => {
	it('drops www. and keeps a port', () => {
		expect(bareHost('https://www.acme.com/x')).toBe('acme.com');
		expect(bareHost(new URL('http://localhost:4321/'))).toBe('localhost:4321');
		expect(bareHost('https://wwwacme.com')).toBe('wwwacme.com');
	});

	it('gives nothing for something that is not a URL', () => {
		expect(bareHost('acme.com')).toBeUndefined();
		expect(bareHost(undefined)).toBeUndefined();
	});
});

describe('cardBrand', () => {
	it("defaults the domain to the brand's host, then the site's, without www.", () => {
		expect(cardBrand({}, { jsonLd: org, site: 'https://acme.pages.dev' }).domain).toBe('acme.com');
		expect(cardBrand({}, { site: 'https://www.acme.com' }).domain).toBe('acme.com');
	});

	it('defaults the wordmark to the site name, then the host', () => {
		expect(cardBrand({}, { siteName: 'Acme', site: 'https://acme.com' }).wordmark).toBe('Acme');
		expect(cardBrand({}, { site: 'https://www.acme.com' }).wordmark).toBe('acme.com');
	});

	it('uses what it was given, and no domain for false', () => {
		expect(cardBrand({ wordmark: 'ACME', domain: 'www.acme.com' }, { siteName: 'Acme' })).toEqual({ wordmark: 'ACME', domain: 'www.acme.com' });
		expect(cardBrand({ domain: false }, { site: 'https://acme.com' }).domain).toBeUndefined();
	});
});
