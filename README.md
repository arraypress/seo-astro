# @arraypress/seo-astro

Everything an Astro site needs to be found, from one integration and one
component. `seo()` in `astro.config` feeds `<SEO />` its site-wide settings,
and when the build is done it renders a share card for every page, writes
`/llms.txt` and a `_headers` file with a CSP hashed from the built pages, and
audits the result.

## Install

```bash
npm install @arraypress/seo-astro @arraypress/og-image
```

`@arraypress/og-image` renders the share cards. Leave it out, and set
`og: false`, for a site that doesn't want them; it carries Satori and resvg's
native binaries, so a site without cards shouldn't install it.

## Set up

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import seo from '@arraypress/seo-astro/integration';

export default defineConfig({
  site: 'https://example.com',
  integrations: [seo({ defaults: { siteName: 'Example', locale: 'en_GB' } })],
});
```

```astro
---
// src/layouts/Layout.astro
import { SEO } from '@arraypress/seo-astro';
const { title, description } = Astro.props;
---
<head>
  <meta charset="utf-8" />
  <SEO title={title} description={description} />
</head>
```

That's the whole setup. Put `seo()` after any integration that changes the
built pages, so it sees them finished. `site` matters: OG image URLs and
llms.txt links are absolute, and the build warns without it.

## What the build does

```
[@arraypress/seo-astro] OG cards: 3 (3 rendered, 0 unchanged) in /og/
[@arraypress/seo-astro] wrote llms.txt — 3 link(s)
[@arraypress/seo-astro] 3 page(s) checked, no problems found.
[@arraypress/seo-astro] CSP from 3 pages — 1 inline script hash, 1 inline style hash, 0 third-party origins
[@arraypress/seo-astro] wrote _headers — 8 headers on /*
```

In that order, because each step reads what the one before left: the card
markers come out of the pages before anything hashes them.

| Part | Default | Off |
|---|---|---|
| `og` | a 1200×630 card per page, in `og:image` | `og: false` |
| `llms` | `/llms.txt` listing the built pages | `llms: false` |
| `audit` | checks the built pages, fails the build on an error | `audit: false` |
| `headers` | `_headers` with a hash-based CSP | `headers: false` |
| `defaults` | — | — |
| `jsonLd` | — | — |

## Options

### `defaults`

`<SEO />` props for every page, under each page's own:

```js
seo({ defaults: { siteName: 'Acme', titleTemplate: '%s — Acme', locale: 'en_GB', twitterSite: '@acme' } })
```

### `jsonLd`

Structured data on every page, usually the Organization or WebSite. A function
receives the site's origin:

```js
import { organization } from '@arraypress/seo-astro/jsonld';

seo({
  jsonLd: ({ origin }) => organization({ name: 'Acme Ltd', url: origin + '/', logo: origin + '/logo.svg' }),
})
```

`@arraypress/seo-astro/jsonld` is [`@arraypress/jsonld`](https://www.npmjs.com/package/@arraypress/jsonld),
so `article()`, `product()`, `faq()` and the rest come from the same import.

When a page has more than one node — the site's and its own — `<SEO />` joins
them into one `@graph` with `buildGraph()`, which gives each an `@id` and wires
the references: the page's Article names the site's Organization as its
publisher instead of standing beside it, unconnected. One node is emitted as
it is, and a page that passes its own `@graph` is left alone.

### `og` — a share card per page

Every page with a title and no `image` gets a card, rendered at build with
[`@arraypress/og-image`](https://www.npmjs.com/package/@arraypress/og-image)
from the page's own title and description, and written to `/og/<page>.png`:
`/` is `og/index.png`, `/blog/hello/` is `og/blog/hello.png`. `<SEO />` points
`og:image` at it, with its width, height and alt text. There's no endpoint to
write and nothing to commit.

A page changes what its card says with `og`, or opts out with `og={false}`:

```astro
<SEO
  title="Hello"
  description="A post"
  og={{ eyebrow: 'Blog', chips: ['Astro', 'SEO'], artwork: '/img/hello.png' }}
/>
```

| `og` prop | Default |
|---|---|
| `title` | the page's `title`, without the site's name |
| `subtitle` | the page's `description` |
| `eyebrow` | `og.eyebrow` from the config |
| `chips` | — |
| `artwork` | — a site path (`/img/x.png`, read from the build), an https URL or a `data:` URI; PNG, JPEG or SVG |

**The headline drops the site's name.** A title says "Pricing — Acme" for
the tab and the results page, but the card shows Acme in its footer already.
So the card takes the title without it: first by the `titleTemplate`'s own
text, then by the `siteName` at either end with whatever joins it (` — `,
` | `, ` · `, `: `…). `"Acme — Pricing"` and `"Pricing | Acme"` both give
`Pricing`. A title that is only the name stays as it is, and `og.title` is
used exactly as given.

The brand is set once, in the config:

```js
seo({
  og: {
    colors: { bg: '#08080a', accent: '#ffffff', text: '#f2f2f3' },
    logo: 'public/logo.svg',
    eyebrow: 'Acme',
  },
})
```

To give the cards the site's own light and type, add glows, grain and the
display face:

```js
seo({
  og: {
    colors: { bg: '#08080a', text: '#ffffff', textSoft: '#c9c9ce' },
    stripe: false,
    backdrop: {
      grain: true,
      glows: [
        { color: '#0957ff', x: 2, y: 82, size: 52 },
        { color: '#f69d03', x: 100, y: 10, size: 44, opacity: 0.9 },
      ],
    },
    fonts: [
      { path: 'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff', weight: 400 },
      { path: 'node_modules/@fontsource/inter/files/inter-latin-600-normal.woff', weight: 600 },
      { path: 'node_modules/@fontsource/gabarito/files/gabarito-latin-700-normal.woff', name: 'Gabarito', weight: 700 },
    ],
    displayFontFamily: 'Gabarito',
  },
})
```

| `og` option | Default |
|---|---|
| `colors` | og-image's dark palette: `bg`, `cardBg`, `accent`, `text`, `textSoft`, `muted`, `border` |
| `logo` | the wordmark's first letter — a path from the project root (PNG, JPEG or SVG), a URL, or bytes |
| `wordmark` | `defaults.siteName`, else the site's host |
| `domain` | the site's host; `false` for none |
| `fonts` | the bundled Inter — or `[{ path: 'fonts/Brand.woff', name: 'Brand', weight: 700 }]` (not woff2); `name` defaults to `Inter` |
| `fontFamily` / `displayFontFamily` | `'Inter'` / `fontFamily` — the text's family, and the title's and wordmark's |
| `backdrop` | two faint accent glows — `{ glows: [{ color, x, y, size, opacity }], grain }`, see og-image's README |
| `stripe` | `true` — the accent stripe along the top |
| `tile` | `'artwork'` — the right-hand tile only when the card has artwork |
| `eyebrow` | — |
| `dir` | `'og'` |
| `cache` | `true` |

Plus og-image's `initials`, `wordmarkInitial`, `maxChips`, `titleMaxLength`,
`subtitleMaxLength`, `width` and `height`.

**Cards are cached** under Astro's `cacheDir` (`node_modules/.astro`), keyed on
everything that changes the picture: the card, the options, the font, logo
and artwork bytes, and the renderer itself. A rebuild renders only what
changed, which on a site with a thousand pages is the difference between
seconds and minutes. Cards no page asked for are dropped from the cache.

**In `astro dev`** the tags point at the card, but cards are only drawn by a
build — `astro build && astro preview` to see them.

### `llms`

`/llms.txt` ([llmstxt.org](https://llmstxt.org)) tells a language model what
the site is. By default it's made from the build: the home page's site name
and description, then every indexable page with its title and description.
Error pages, `noindex` pages and pages canonical to another are left out.

To say more, pass the content — or a function given the origin and the pages
the default would list:

```js
seo({
  llms: ({ origin, pages }) => ({
    name: 'Acme',
    description: 'What Acme is, in a line.',
    sections: [
      { title: 'Products', links: pages.filter((p) => p.path.startsWith('/products/')).map((p) => ({ label: p.title, url: p.url })) },
      { title: 'Elsewhere', links: [{ label: 'GitHub', url: 'https://github.com/acme' }] },
    ],
    meta: { 'Company number': '01234567' },
  }),
})
```

Name and description fall back to the home page's when you leave them out.

Content from a content collection can't be reached from `astro.config` —
`getCollection()` only runs inside the site — so for that, write a route; see
[llms.txt from a content collection](#llmstxt-from-a-content-collection). A
route, or a `public/llms.txt`, wins over `llms: true`. With content in the
config as well, there'd be two sources for one file, and the build stops.

### `headers`

Writes `_headers` for Cloudflare (Pages, and Workers static assets) and
Netlify, with [`@arraypress/security-headers`](https://www.npmjs.com/package/@arraypress/security-headers).
The CSP is `'auto'`: every inline script and style in the build is hashed, and
every third-party origin the pages load from is allowed, so `script-src` needs
no `'unsafe-inline'`. One policy covers the whole site, so it works with
`<ClientRouter />`. The build warns about what a hash policy can't allow
(inline `on*=` handlers, `javascript:` links) and about Cloudflare's
2,000-character line limit.

HSTS covers this host only: `Strict-Transport-Security: max-age=31536000`,
with no `includeSubDomains`. That would hold every subdomain to HTTPS for a
year as well, and a site's build can't know what else lives on its domain: a
sibling still on plain HTTP would stop loading for anyone who had visited.
Opt in with `hsts: { includeSubDomains: true }` once you know they all serve
HTTPS.

```js
seo({
  headers: {
    // Your arrays are the base; the scan's findings go on top.
    csp: { auto: true, scriptSrc: ["'self'", "'wasm-unsafe-eval'"] },
    hsts: { includeSubDomains: true }, // once every subdomain serves HTTPS
    permissionsPolicy: 'camera=(), microphone=(self), geolocation=()',
  },
})
```

Everything `@arraypress/security-headers` takes is accepted, plus `path`
(default `'/*'`) and `filename` (default `'_headers'`). `csp: false` leaves
the policy to something else, Astro's `security.csp` say. A `_headers` in
`public/` is kept and appended to. Its README covers `data-csp`, for hosts a
component only loads at runtime, and what to do about libraries that inject
styles.

Vercel doesn't read `_headers`; turn this off there.

### `audit`

Reads the built pages back and reports what's wrong, failing the build on an
error:

```
/pricing  [title-duplicate]  Duplicate title on 2 pages (/pricing, /plans) — "Pricing"
/legal    [canonical-missing]  No canonical link.
/changelog [orphan-page]  No internal link points at this page.
```

| Check | Default | |
|---|---|---|
| `title-missing` / `title-duplicate` | error | |
| `title-long` / `title-short` | warn | thresholds, not rules — see below |
| `description-missing` / `description-duplicate` | warn | |
| `description-long` / `description-short` | warn | |
| `canonical-missing` | warn | |
| `canonical-off-site` | error | canonical points at another origin |
| `canonical-broken` | error | canonical points at a page not in the build |
| `canonical-chain` | error | canonical target itself canonicalises elsewhere |
| `og-incomplete` | warn | [ogp.me](https://ogp.me)'s four required properties |
| `h1-missing` / `h1-multiple` | warn | |
| `image-alt-missing` | warn | `alt=""` counts as present |
| `noindex` | warn | so an accidental one doesn't go unnoticed |
| `orphan-page` | warn | nothing links to it; the home and error pages never are |

Tune anything:

```js
seo({
  audit: {
    maxTitleLength: 70,
    checks: { 'h1-multiple': false, 'orphan-page': 'error' },
    ignore: [/^\/preview/],
    failOn: 'warn',
  },
})
```

**On canonicals:** a page whose canonical names a *different* page is
deduplication — two URLs for one thing — and is not reported, provided the
target exists and is self-canonical. Such pages are also excluded from the
duplicate-title and orphan checks, since they are meant to share a title with
their canonical and meant not to be linked.

**Duplicate titles and orphan pages are why this runs over the build**, not per
page: they're properties of the whole site, and no editor-time checker can see
them.

**On the length thresholds:** Google publishes no character limit. Truncation
is pixel-width — about 600px, varying by device and query. 60 and 155 are the
long-standing heuristics for that, not a specification, which is why they're
options. The Open Graph check *is* spec-backed: ogp.me states that `og:title`,
`og:type`, `og:image` and `og:url` are required on every page.

## `<SEO />` props

The page's own; `defaults` sit underneath them.

| Prop | Type | Notes |
|---|---|---|
| `title` / `description` | `string` | `<title>` + meta description |
| `titleTemplate` | `string` | House title format, `%s` = the page title |
| `url` | `string` | canonical + `og:url`; defaults to the page URL, tracking params stripped |
| `image` | `string` | `og:image`; a relative path is made absolute. Replaces the generated card |
| `og` | `object \| false` | what the generated card says, or no card |
| `imageWidth` / `imageHeight` / `imageAlt` | | `og:image:*` |
| `type` | `string` | `og:type` (`'website'` / `'article'`) |
| `robots` | `string \| false` | e.g. `'noindex,nofollow'`; snippet maxima merged in unless `maxSnippet: false` |
| `siteName` / `locale` | `string` | `og:site_name` / `og:locale` |
| `twitterCard` / `twitterSite` / `twitterCreator` | `string` | Twitter card meta |
| `articlePublished` / `articleModified` / `articleAuthor` | `string` | `article:*` meta |
| `verification` | `object` | google / bing / pinterest / yandex |
| `hreflang` | `Array<{ lang, url }>` | alternate language links |
| `jsonLd` | `object \| object[]` | joined with the site's into one graph |
| `meta` / `link` | `object[]` | extra tags; keys become attributes |

## Title template

Set the house title format once and let each page pass only its own half.
`%s` is the placeholder:

```astro
<SEO titleTemplate="Acme — %s" title="Pricing" />
<!-- <title>Acme — Pricing</title> -->
```

Put `%s` first (`"%s — Acme"`) to lead with the page and trail the brand
instead. The template applies to `<title>`, `og:title` and `twitter:title`
alike, so the three never drift apart. A template with no `%s` in it is ignored
and the bare `title` is used — a typo there shouldn't quietly give every page
on the site the same title.

## Breadcrumbs

The trail and its `BreadcrumbList` structured data from one array — the part
that otherwise rots is keeping them in step by hand:

```astro
---
import { Breadcrumbs } from '@arraypress/seo-astro';
---
<Breadcrumbs items={[
  { name: 'Home', url: '/' },
  { name: 'Docs', url: '/docs' },
  { name: 'Installing' },
]} />
```

The markup is semantic and unstyled — `nav > ol > li`, the current page marked
`aria-current="page"`, separators hidden from screen readers. Style it via
`class`. The last crumb is the page you're on, so it renders as text and is
declared with no `item` URL; pass `jsonLd={false}` to emit markup only.

## llms.txt from a content collection

`@arraypress/seo-astro/llms` has the route helpers for content `seo({ llms })`
can't reach. A route like this wins over the integration's file:

```ts
// src/pages/llms.txt.ts
import { llmsTxtRoute, collectionSection } from '@arraypress/seo-astro/llms';
import { getCollection } from 'astro:content';

export const GET = llmsTxtRoute(async (origin) => ({
  name: 'Acme',
  description: 'One line about Acme.',
  sections: [
    collectionSection(await getCollection('docs'), { title: 'Docs', origin, base: '/docs' }),
  ],
}));
```

Drafts (`data.draft === true`) are dropped, entries sort by `data.order` then
title, and URLs lose their file extension and any trailing `/index`. Pass
`filter`, `sort`, or a `link` / `document` override to change any of it — the
override receives the computed default, so you can spread it and adjust one
field.

`llms-full.txt` is the corpus where `llms.txt` is the index:

```ts
// src/pages/llms-full.txt.ts
import { llmsFullTxtRoute, collectionDocuments } from '@arraypress/seo-astro/llms';
import { getCollection } from 'astro:content';

export const GET = llmsFullTxtRoute(async (origin) => ({
  name: 'Acme',
  documents: collectionDocuments(await getCollection('docs'), { origin, base: '/docs' }),
}));
```

**On the format:** llmstxt.org specifies `llms.txt` and says nothing about
`llms-full.txt` — the name is a de-facto convention from documentation
platforms. This follows it (llms.txt's header, then each document under its
own H1 with a `Source:` line, separated by `---`), but there's no standard to
conform to. The `llms.txt` output *is* checked against the real spec.

## The builders on their own

Plain JavaScript, no Astro or Vite involved:

| Import | |
|---|---|
| `@arraypress/seo-astro/core` | `buildHead`, `robotsTxt`, `canonicalize`, `escapeHtml`, `injectHead`, `breadcrumbList`, `ldJson` — also exported from the main entry |
| `@arraypress/seo-astro/llms/core` | `build`, `buildFull`, `parse`, `llmsTxtResponse` |
| `@arraypress/seo-astro/audit/core` | `auditPages`, `readPage`, `normalizePath`, `CHECKS` |
| `@arraypress/seo-astro/jsonld` | every `@arraypress/jsonld` builder |

`robotsTxt()` is the one you'll reach for in `src/pages/robots.txt.ts`:

```ts
import { robotsTxt } from '@arraypress/seo-astro';

export const GET = ({ site }) =>
  new Response(robotsTxt({ allow: ['/'], sitemapUrl: new URL('sitemap-index.xml', site).href }));
```

## Upgrading from 2.x

- Add `seo()` to `astro.config`. `<SEO />` reads its settings from it and
  won't build without it.
- `seoAudit()` from `@arraypress/seo-astro/audit` is now `seo({ audit })`.
- `@arraypress/llms-txt-astro` is now `@arraypress/seo-astro/llms`, or
  `seo({ llms })` for content that doesn't need a collection.
- `headers()` from `@arraypress/security-headers/astro` is now
  `seo({ headers })`. Its HSTS no longer sends `includeSubDomains`; add
  `hsts: { includeSubDomains: true }` to keep it.
- A card's headline no longer repeats the site's name. A page that passed
  `og.title` only to drop it can leave `og.title` out.
- A hand-rolled OG endpoint or script goes: leave `image` off and the page gets
  a card. Move its colours, logo and fonts into `seo({ og })`.
- `image` is made absolute against `site`. Pages that passed a relative path
  were emitting one social scrapers couldn't resolve.
- Node 22.12 or later, as Astro 6 already requires.

## Licence

MIT © ArrayPress Limited
