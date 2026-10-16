import { describe, it, expect } from 'vitest';
import { ogImageFor } from '../../src/og/image-for';

describe('ogImageFor with cards off', () => {
	it('gives nothing', () => {
		expect(ogImageFor('/blog/hello/', 'https://example.com')).toBeUndefined();
	});
});
