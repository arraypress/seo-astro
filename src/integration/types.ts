/**
 * @module @arraypress/seo-astro/integration/types
 */
import type { BuildHeadersConfig } from '@arraypress/security-headers/write';
import type { SeoAuditOptions } from '../audit/report';
import type { BuildHeadOptions } from '../core.js';
import type { BuildOptions } from '../llms/core.js';
import type { LlmsContext } from '../llms/write.js';

/** A font for the OG cards: a file to read, or the bytes themselves. */
export type OgFontOption =
	| { path: string; name?: string; weight?: number; style?: 'normal' | 'italic' }
	| { data: ArrayBuffer | Uint8Array; name: string; weight?: number; style?: 'normal' | 'italic' };

/**
 * OG card settings. Everything but `dir`, `eyebrow`, `cache`, `fonts` and
 * `logo` goes straight to `@arraypress/og-image`.
 */
export interface OgOptions {
	/** Folder in the build output for the cards. @default 'og' */
	dir?: string;
	/** Eyebrow on every card that doesn't set its own. */
	eyebrow?: string;
	/** Keep cards between builds and re-render only what changed. @default true */
	cache?: boolean;
	/** Fonts, by path from the project root or as bytes. @default the bundled Inter */
	fonts?: OgFontOption[];
	/** The footer badge: a path from the project root (PNG, JPEG or SVG), a URL, or bytes. */
	logo?: string | Uint8Array;
	/** Card colours: `bg`, `cardBg`, `accent`, `text`, `textSoft`, `muted`, `border`. */
	colors?: Partial<Record<'bg' | 'cardBg' | 'accent' | 'text' | 'textSoft' | 'muted' | 'border', string>>;
	/** Footer text. @default `defaults.siteName`, else the site's host */
	wordmark?: string;
	/** Footer-right text. `false` for none. @default the site's host */
	domain?: string | false;
	/** Tile text when there's no artwork. */
	initials?: string;
	/** Letter in the footer badge when there's no logo. */
	wordmarkInitial?: string;
	/**
	 * Colour glows and a film grain over `colors.bg`, behind the content. Each
	 * glow: a hex `color`, its centre `x`/`y` (percent of the card), `size`
	 * (radius, percent of the width) and `opacity`. `grain`: `true` or 0–1.
	 * @default two faint accent glows, no grain
	 */
	backdrop?: {
		glows?: Array<{ color: string; x?: number; y?: number; size?: number; opacity?: number }>;
		grain?: boolean | number;
	};
	/** The accent stripe along the top. @default true */
	stripe?: boolean;
	/** The family the card's text asks for, as named in `fonts`. @default 'Inter' */
	fontFamily?: string;
	/** The family for the title and wordmark, as named in `fonts`. @default `fontFamily` */
	displayFontFamily?: string;
	/** When to draw the right-hand tile. @default 'artwork' — only when the card has artwork */
	tile?: 'auto' | 'artwork' | 'none';
	maxChips?: number;
	titleMaxLength?: number;
	subtitleMaxLength?: number;
	/** @default 1200 */
	width?: number;
	/** @default 630 */
	height?: number;
}

/** Security headers settings: `@arraypress/security-headers`' config, plus where to write. */
export interface HeadersOptions extends BuildHeadersConfig {
	/** Path pattern the headers apply to. @default '/*' */
	path?: string;
	/** Output file. @default '_headers' */
	filename?: string;
}

/** What a `jsonLd` function receives. */
export interface JsonLdContext {
	/** The site's origin and base, no trailing slash. */
	origin: string;
}

/** `seo({ … })` — every part on by default; `false` turns one off. */
export interface SeoOptions {
	/** `<SEO />` props for every page, under each page's own. */
	defaults?: Omit<BuildHeadOptions, 'url' | 'jsonLd'>;
	/**
	 * JSON-LD on every page — typically the Organization or WebSite, built with
	 * `@arraypress/seo-astro/jsonld`. A function receives the site's origin.
	 */
	jsonLd?: object | object[] | ((context: JsonLdContext) => object | object[] | Promise<object | object[]>);
	/** A card per page, rendered at build. Needs `@arraypress/og-image`. @default true */
	og?: boolean | OgOptions;
	/**
	 * `/llms.txt`: `true` lists the built pages; an object is the file's content;
	 * a function receives `{ origin, pages }` and returns it. A route of your
	 * own wins over `true`. @default true
	 */
	llms?: boolean | BuildOptions | ((context: LlmsContext) => BuildOptions | Promise<BuildOptions>);
	/** `_headers`, with a CSP derived from the build (`csp: 'auto'`). @default true */
	headers?: boolean | HeadersOptions;
	/** The build-time audit. @default true, failing the build on an error */
	audit?: boolean | SeoAuditOptions;
}
