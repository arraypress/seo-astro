import { describe, it, expect } from 'vitest';
import { cardTitle } from '../../src/og/title.js';

describe('cardTitle — the site name comes off', () => {
	it('by the title template, when the title already carries it', () => {
		expect(cardTitle('Pricing — Acme', { titleTemplate: '%s — Acme' })).toBe('Pricing');
		expect(cardTitle('Acme | Pricing', { titleTemplate: 'Acme | %s' })).toBe('Pricing');
		expect(cardTitle('[Acme] Pricing [beta]', { titleTemplate: '[Acme] %s [beta]' })).toBe('Pricing');
	});

	it('by the site name at the end, whatever the separator', () => {
		for (const title of ['Pricing — Acme', 'Pricing – Acme', 'Pricing - Acme', 'Pricing | Acme', 'Pricing · Acme', 'Pricing: Acme']) {
			expect(cardTitle(title, { siteName: 'Acme' })).toBe('Pricing');
		}
	});

	it('by the site name at the start, whatever the separator', () => {
		expect(cardTitle('LumiThemes — Skip the build. Start selling.', { siteName: 'LumiThemes' })).toBe('Skip the build. Start selling.');
		for (const title of ['Acme — Pricing', 'Acme – Pricing', 'Acme - Pricing', 'Acme | Pricing', 'Acme · Pricing', 'Acme: Pricing']) {
			expect(cardTitle(title, { siteName: 'Acme' })).toBe('Pricing');
		}
	});

	it('by a template that leads with the name', () => {
		expect(cardTitle('Acme — Pricing', { titleTemplate: 'Acme — %s' })).toBe('Pricing');
		expect(cardTitle('Acme — Pricing', { titleTemplate: 'Acme — %s', siteName: 'Acme' })).toBe('Pricing');
	});

	it("by the card's wordmark, when the titles carry that rather than the site name", () => {
		expect(cardTitle('Pricing — Relay', { siteName: 'Relay Inc.', wordmark: 'Relay' })).toBe('Pricing');
		expect(cardTitle('Relay | Pricing', { wordmark: 'Relay' })).toBe('Pricing');
		expect(cardTitle('Pricing — Relay Inc.', { siteName: 'Relay Inc.', wordmark: 'Relay' })).toBe('Pricing');
	});

	it('in any case, keeping separators inside the page half', () => {
		expect(cardTitle('Docs — Install — ACME', { siteName: 'Acme' })).toBe('Docs — Install');
	});

	it('with a site name that has regex characters in it', () => {
		expect(cardTitle('Pricing | Acme (UK) Ltd.', { siteName: 'Acme (UK) Ltd.' })).toBe('Pricing');
	});

	it('trying the template before the site name', () => {
		expect(cardTitle('Pricing ~ Acme Store', { titleTemplate: '%s ~ Acme Store', siteName: 'Acme' })).toBe('Pricing');
	});
});

describe('cardTitle — what stays', () => {
	it('a title without the site name', () => {
		expect(cardTitle('Pricing', { titleTemplate: '%s — Acme', siteName: 'Acme' })).toBe('Pricing');
	});

	it('a title that is only the site name', () => {
		expect(cardTitle('Acme', { siteName: 'Acme' })).toBe('Acme');
		expect(cardTitle(' — Acme', { titleTemplate: '%s — Acme' })).toBe(' — Acme');
	});

	it('the name inside a word, or with no separator', () => {
		expect(cardTitle('Pricing at Acme', { siteName: 'Acme' })).toBe('Pricing at Acme');
		expect(cardTitle('Acmeology', { siteName: 'Acme' })).toBe('Acmeology');
	});

	it('a hyphenated word, which is not a separator', () => {
		expect(cardTitle('Self-Acme', { siteName: 'Acme' })).toBe('Self-Acme');
	});

	it('a template with no %s, or nothing to go on', () => {
		expect(cardTitle('Pricing — Acme', { titleTemplate: 'Acme' })).toBe('Pricing — Acme');
		expect(cardTitle('Pricing — Acme')).toBe('Pricing — Acme');
		expect(cardTitle(undefined, { siteName: 'Acme' })).toBeUndefined();
	});
});
