/**
 * vitest.config.ts
 * ----------------
 *
 * Wires Vitest up with Astro's Vite plugin so `.astro` files can be
 * rendered through the official `experimental_AstroContainer` API
 * without a browser, and serves `<SEO />` the virtual config module the
 * `seo()` integration would — with OG cards off, so a page's tags are
 * exactly what its props say.
 */
import { getViteConfig } from 'astro/config';
import { configModule } from './src/integration/config-module';

export default getViteConfig({
	plugins: [configModule({ defaults: {}, og: false })],
	test: {
		include: ['test/**/*.test.ts'],
		environment: 'node',
		globals: false,
	},
});
