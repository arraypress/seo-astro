/**
 * @module @arraypress/seo-astro/llms
 *
 * `/llms.txt` and `/llms-full.txt` as Astro routes, for the sites whose
 * content `seo({ llms })` can't reach from `astro.config`: anything built from
 * a content collection, since `getCollection()` only runs inside the site.
 * A route like this wins over the integration's own file.
 *
 * ```ts
 * // src/pages/llms.txt.ts
 * import { llmsTxtRoute } from '@arraypress/seo-astro/llms';
 * import { posts } from '../data/posts';
 *
 * export const GET = llmsTxtRoute((origin) => ({
 *   name: 'My Site',
 *   description: 'What this site is, in one line.',
 *   sections: [
 *     {
 *       title: 'Writing',
 *       links: posts.map((p) => ({ label: p.title, url: `${origin}/${p.slug}` })),
 *     },
 *   ],
 * }));
 * ```
 */

import { build, buildFull, llmsTxtResponse } from './core.js';
import type { APIContext, APIRoute } from 'astro';
import type { LlmsFullDocument, LlmsTxtLink, LlmsTxtSection } from './core.js';
import type {
	CollectionDocumentsOptions,
	CollectionSectionOptions,
	ContentEntryLike,
	LlmsFullTxtRouteOptions,
	LlmsTxtRouteOptions,
	Origin,
} from './types';

export type * from './types';

/**
 * Resolve the site origin with no trailing slash.
 *
 * Prefers Astro's configured `site` (the canonical origin, and the only one
 * correct at build time for a static site); falls back to the request URL when
 * `site` is unset, so `astro dev` still emits usable absolute links instead of
 * `undefined/...`.
 *
 * @param context - The Astro API context for the request.
 * @returns The origin, e.g. `https://example.com`.
 */
export function originOf(context: APIContext): Origin {
	return (context.site?.href ?? context.url.origin).replace(/\/+$/, '');
}

/**
 * Build an Astro `GET` handler that serves `/llms.txt`.
 *
 * Pass either a literal options object, or a factory receiving the resolved
 * origin — the factory form is the usual one, since the spec wants absolute
 * URLs and the origin isn't known until the request.
 *
 * Place the file at `src/pages/llms.txt.ts`; Astro serves it at `/llms.txt` and
 * prerenders it with the rest of a static build.
 *
 * @param options - `build()` options, or a factory returning them.
 * @returns An Astro `APIRoute` serving `text/plain`.
 *
 * @example
 * // Static — no absolute URLs needed.
 * export const GET = llmsTxtRoute({ name: 'My Site', description: '…' });
 *
 * @example
 * // Factory — links need the origin.
 * export const GET = llmsTxtRoute((origin) => ({
 *   name: 'My Site',
 *   sections: [{ title: 'Docs', links: [{ label: 'Start', url: `${origin}/docs` }] }],
 * }));
 */
export function llmsTxtRoute(options: LlmsTxtRouteOptions): APIRoute {
	return async (context: APIContext) => {
		const resolved =
			typeof options === 'function' ? await options(originOf(context), context) : options;
		return llmsTxtResponse(build(resolved));
	};
}

/**
 * Build an Astro `GET` handler that serves `/llms-full.txt`.
 *
 * Identical in shape to {@link llmsTxtRoute}, but over `buildFull()` — the
 * whole corpus inline rather than an index of links. Place the file at
 * `src/pages/llms-full.txt.ts`.
 *
 * @param options - `buildFull()` options, or a factory returning them.
 * @returns An Astro `APIRoute` serving `text/plain`.
 *
 * @example
 * export const GET = llmsFullTxtRoute(async (origin) => ({
 *   name: 'My Docs',
 *   documents: collectionDocuments(await getCollection('docs'), { origin, base: '/docs' }),
 * }));
 */
export function llmsFullTxtRoute(options: LlmsFullTxtRouteOptions): APIRoute {
	return async (context: APIContext) => {
		const resolved =
			typeof options === 'function' ? await options(originOf(context), context) : options;
		return llmsTxtResponse(buildFull(resolved));
	};
}

/* ── Content collections ─────────────────────────────────────────────────────
 *
 * Both helpers take the output of `await getCollection(...)` rather than calling
 * it themselves: `astro:content` is a virtual module, so importing it here would
 * break this package's own build and pin consumers to one collection API.
 */

/**
 * An entry's path within its collection, without the file extension or a
 * trailing `/index` — neither belongs in a URL.
 *
 * @param entry - A collection entry.
 * @returns The slug, e.g. `guides/install`.
 */
function entrySlug(entry: ContentEntryLike): string {
	const raw = entry.slug ?? entry.id ?? '';
	return raw.replace(/\.(md|mdx|mdoc|markdown)$/i, '').replace(/(^|\/)index$/, '');
}

/**
 * An entry's URL: origin, then base, then slug.
 *
 * @param entry - A collection entry.
 * @param origin - Site origin, no trailing slash. Empty for a root-relative URL.
 * @param base - Path the collection is served under, e.g. `/docs`.
 * @returns The URL.
 */
function entryUrl(entry: ContentEntryLike, origin = '', base = ''): string {
	const path = [base, entrySlug(entry)].filter(Boolean).join('/').replace(/\/{2,}/g, '/');
	return origin + (path.startsWith('/') ? path : '/' + path);
}

/**
 * An entry's title, falling back to its slug.
 *
 * @param entry - A collection entry.
 * @returns The title.
 */
const entryTitle = (entry: ContentEntryLike): string =>
	entry.data?.title ?? entrySlug(entry) ?? entry.id;

/**
 * Whether an entry is published. Drafts are excluded by default: they're
 * unpublished, and this file is public.
 *
 * @param entry - A collection entry.
 * @returns False for `data.draft === true`.
 */
const notDraft = (entry: ContentEntryLike): boolean => entry.data?.draft !== true;

/**
 * Sort by `order` frontmatter first (docs are deliberately sequenced), then
 * title, so output is stable across builds rather than filesystem-dependent.
 *
 * @param a - One entry.
 * @param b - The other.
 * @returns A comparator result.
 */
function byOrderThenTitle(a: ContentEntryLike, b: ContentEntryLike): number {
	const ao = a.data?.order;
	const bo = b.data?.order;
	if (typeof ao === 'number' && typeof bo === 'number' && ao !== bo) return ao - bo;
	if (typeof ao === 'number' && typeof bo !== 'number') return -1;
	if (typeof bo === 'number' && typeof ao !== 'number') return 1;
	return entryTitle(a).localeCompare(entryTitle(b));
}

/**
 * Filter and sort entries, with the defaults when no override is given.
 *
 * @param entries - The collection.
 * @param filter - Which to keep. Defaults to dropping drafts.
 * @param sort - Their order. Defaults to `order`, then title.
 * @returns A new, filtered and sorted array.
 */
function prepare<T extends ContentEntryLike>(
	entries: T[],
	filter?: (e: T) => boolean,
	sort?: (a: T, b: T) => number,
): T[] {
	return [...entries].filter(filter ?? notDraft).sort(sort ?? byOrderThenTitle);
}

/**
 * Turn a content collection into an `llms.txt` section of links.
 *
 * @param entries - The result of `await getCollection('docs')`.
 * @param options - Section title, plus origin/base for URLs and optional overrides.
 * @returns One section, ready to drop into `build()`'s `sections`.
 *
 * @example
 * export const GET = llmsTxtRoute(async (origin) => ({
 *   name: 'My Site',
 *   sections: [
 *     collectionSection(await getCollection('docs'), { title: 'Docs', origin, base: '/docs' }),
 *   ],
 * }));
 */
export function collectionSection<T extends ContentEntryLike>(
	entries: T[],
	options: CollectionSectionOptions<T>,
): LlmsTxtSection {
	const { title, description, origin, base, filter, sort, link } = options;
	const links = prepare(entries, filter, sort).map((entry) => {
		const defaults: LlmsTxtLink = {
			label: entryTitle(entry),
			url: entryUrl(entry, origin, base),
			...(entry.data?.description ? { description: entry.data.description } : {}),
		};
		return link ? link(entry, defaults) : defaults;
	});
	return { title, ...(description ? { description } : {}), links };
}

/**
 * Turn a content collection into `llms-full.txt` documents, bodies included.
 *
 * @param entries - The result of `await getCollection('docs')`.
 * @param options - Origin/base for the `Source:` lines, plus optional overrides.
 * @returns Documents, ready to drop into `buildFull()`'s `documents`.
 */
export function collectionDocuments<T extends ContentEntryLike>(
	entries: T[],
	options: CollectionDocumentsOptions<T> = {},
): LlmsFullDocument[] {
	const { origin, base, filter, sort, document } = options;
	return prepare(entries, filter, sort).map((entry) => {
		const defaults: LlmsFullDocument = {
			title: entryTitle(entry),
			url: entryUrl(entry, origin, base),
			...(entry.data?.description ? { description: entry.data.description } : {}),
			...(entry.body ? { content: entry.body } : {}),
		};
		return document ? document(entry, defaults) : defaults;
	});
}

/*
 * The builders, for a site that assembles its llms.txt some other way — a
 * custom Response, or parsing one back. Also at `./llms/core` with nothing
 * Astro-shaped attached.
 */
export { build, buildFull, llmsTxtResponse, parse } from './core.js';
export type {
	BuildFullOptions,
	BuildOptions,
	LlmsFullDocument,
	LlmsTxtApi,
	LlmsTxtItem,
	LlmsTxtLink,
	LlmsTxtSection,
	ParsedLlmsTxt,
} from './core.js';
