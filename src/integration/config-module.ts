/**
 * @module @arraypress/seo-astro/integration/config-module
 *
 * The Vite plugin that hands `seo({ … })`'s settings to `<SEO />`.
 *
 * The config lives in `astro.config`; the component renders inside the site's
 * own bundle, where `astro.config` can't be imported. A virtual module bridges
 * the two: the integration serialises what the component needs, and the
 * component imports it like any other module.
 */
import type { HeadConfig } from '../head/page.js';

/** The id `<SEO />` imports. */
export const CONFIG_MODULE = 'virtual:@arraypress/seo-astro/config';

/** Vite's convention for a module that exists only in a plugin. */
const RESOLVED = '\0' + CONFIG_MODULE;

/** The parts of a Vite plugin this one uses. */
export interface ConfigModulePlugin {
	name: string;
	resolveId: (id: string) => string | undefined;
	load: (id: string) => string | undefined;
}

/**
 * A Vite plugin serving `config` as the virtual module `<SEO />` reads.
 *
 * @param config - What the component needs: defaults, JSON-LD and the OG settings.
 * @returns The plugin.
 */
export function configModule(config: HeadConfig): ConfigModulePlugin {
	return {
		name: '@arraypress/seo-astro/config',
		resolveId: (id) => (id === CONFIG_MODULE ? RESOLVED : undefined),
		load: (id) => (id === RESOLVED ? `export default ${JSON.stringify(config)};` : undefined),
	};
}
