/** The config `seo()` hands `<SEO />`, through a Vite virtual module. */
declare module 'virtual:@arraypress/seo-astro/config' {
	const config: import('./head/page.js').HeadConfig;
	export default config;
}
