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
