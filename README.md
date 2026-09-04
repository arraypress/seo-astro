# @arraypress/seo-astro

An idiomatic `<SEO />` component for Astro, plus the `buildHead()` builder behind it. Pass the options once; it renders title, canonical, Open Graph, Twitter, robots, hreflang, article meta and JSON-LD as real tags.

## Install

```bash
npm install @arraypress/seo-astro
```

## Usage

```astro
---
import { SEO } from '@arraypress/seo-astro';
---
<head>
  <meta charset="utf-8" />
  <SEO
    title="My Page"
    description="A great page"
    url={Astro.url.href}
    image="/og.png"
    siteName="Example"
    twitterSite="@example"
  />
</head>
```

## Props

Identical to `buildHead()`'s options:

| Prop | Type | Notes |
|---|---|---|
| `title` / `description` | `string` | `<title>` + meta description |
| `titleTemplate` | `string` | House title format, `%s` = the page title |
| `url` | `string` | canonical + `og:url` |
| `image` | `string` | `og:image` + `twitter:image` |
| `type` | `string` | `og:type` (`'website'` / `'article'`) |
| `robots` | `string` | e.g. `'noindex,nofollow'` |
| `siteName` / `locale` | `string` | `og:site_name` / `og:locale` |
| `twitterCard` / `twitterSite` / `twitterCreator` | `string` | Twitter card meta |
| `articlePublished` / `articleModified` / `articleAuthor` | `string` | `article:*` meta |
| `verification` | `object` | google / bing / pinterest / yandex |
| `hreflang` | `Array<{ lang, url }>` | alternate language links |
| `jsonLd` | `object \| object[]` | one `<script type="application/ld+json">` per item |

The component set is `<SEO />` and `<Breadcrumbs />`; the build-time audit
lives at `@arraypress/seo-astro/audit`.

## Title template

Set the house title format once and let each page pass only its own half.
`%s` is the placeholder:

```astro
<SEO titleTemplate="Acme — %s" title="Pricing" />
<!-- <title>Acme — Pricing</title> -->
```

Put `%s` first (`"%s — Acme"`) to lead with the page and trail the brand
instead. The template applies to `<title>`, `og:title` and `twitter:title`
alike, so the three never drift apart.

A template with no `%s` in it is ignored and the bare `title` is used — a typo
there shouldn't quietly give every page on the site the same title.

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

## Auditing the built site

`<SEO />` emits tags. `seoAudit()` reads them back and tells you what's wrong:

```js
// astro.config.mjs
import { seoAudit } from '@arraypress/seo-astro/audit';

export default defineConfig({
  site: 'https://example.com',
  integrations: [seoAudit()],
});
```

It runs at `astro:build:done` over every rendered page at once, and fails the
build on an error:

```
11 page(s) checked — 1 error(s), 3 warning(s).
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
| `orphan-page` | warn | nothing links to it |

Tune anything:

```js
seoAudit({
  maxTitleLength: 70,
  checks: { 'h1-multiple': false, 'orphan-page': 'error' },
  ignore: [/^\/preview/],
  failOn: 'warn',
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

`auditPages(pages, options)` gives you the findings outside a build — from
`@arraypress/seo-astro/audit/core`, which is plain JavaScript with no Astro or
Vite involved:

```js
import { auditPages } from '@arraypress/seo-astro/audit/core';

const { findings, errors } = auditPages(pages, { site: 'https://example.com' });
```

(`@arraypress/seo-astro/audit` is the Astro integration and resolves to a
TypeScript source file, which `astro.config.mjs` handles through Vite but plain
Node will not load.)

## Why a separate package?

`<SEO />` saves you writing `<Fragment set:html={buildHead(...)} />` by hand.

The builders are still plain functions and are exported alongside the
component — `buildHead`, `robotsTxt`, `canonicalize`, `escapeHtml`,
`injectHead`. `robotsTxt()` is the one you'll reach for outside a component,
in `src/pages/robots.txt.ts`:

```ts
import { robotsTxt } from '@arraypress/seo-astro';
```

They're also available on their own at `@arraypress/seo-astro/core` if you want
the string output with nothing Astro-shaped attached.

## License

MIT
