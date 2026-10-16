import { describe, it, expect } from 'vitest';
import { ogFile, ogMarker, takeMarkers } from '../../src/og/marker.js';

describe('ogFile', () => {
	it.each([
		['/', 'og/index.png'],
		['/blog/hello/', 'og/blog/hello.png'],
		['/blog/hello', 'og/blog/hello.png'],
		['/404.html', 'og/404.png'],
		['/caf%C3%A9', 'og/café.png'],
	])('%s → %s', (pathname, file) => {
		expect(ogFile(pathname).file).toBe(file);
	});

	it('serves the card at the same path it is written to', () => {
		expect(ogFile('/a/b')).toEqual({ file: 'og/a/b.png', path: '/og/a/b.png' });
	});

	it('takes another folder', () => {
		expect(ogFile('/a', { dir: '/cards/' }).file).toBe('cards/a.png');
	});

	it('strips the base from the file and keeps it on the URL', () => {
		expect(ogFile('/docs/', { base: '/docs/' })).toEqual({ file: 'og/index.png', path: '/docs/og/index.png' });
	});
});

describe('markers', () => {
	it('round-trip a card and leave the page clean', () => {
		const page = `<head><title>X</title>\n${ogMarker('og/x.png', { title: 'X & Y', chips: ['a'] })}\n</head>`;
		const { html, cards } = takeMarkers(page);
		expect(cards).toEqual([{ file: 'og/x.png', card: { title: 'X & Y', chips: ['a'] } }]);
		expect(html).toBe('<head><title>X</title>\n</head>');
	});

	it("can't be closed early by a </script> in the content", () => {
		const page = ogMarker('og/x.png', { title: '</script><script>alert(1)</script>' });
		expect(page.match(/<\/script>/g)).toHaveLength(1);
		expect(takeMarkers(page).cards[0].card.title).toBe('</script><script>alert(1)</script>');
	});

	it('round-trips a file name that needs escaping', () => {
		expect(takeMarkers(ogMarker('og/a&b.png', { title: 'X' })).cards[0].file).toBe('og/a&b.png');
	});

	it('drops a marker whose JSON is broken', () => {
		const { html, cards } = takeMarkers('<script type="application/json" data-seo-og="og/x.png">{nope</script>');
		expect(cards).toEqual([]);
		expect(html).toBe('');
	});

	it('leaves other JSON blocks alone', () => {
		const other = '<script type="application/json" id="data">{"a":1}</script>';
		expect(takeMarkers(other).html).toBe(other);
	});
});
