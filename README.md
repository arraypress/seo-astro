# @arraypress/seo-astro

An idiomatic `<SEO />` component for Astro — a thin wrapper over [`@arraypress/seo`](https://www.npmjs.com/package/@arraypress/seo)'s `buildHead()`. Pass the same options; it renders title, canonical, Open Graph, Twitter, robots, hreflang, article meta, and JSON-LD as real tags.

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

Identical to [`buildHead()`](https://www.npmjs.com/package/@arraypress/seo)'s options:

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

`@arraypress/seo` is **framework-agnostic** — `buildHead()` returns an HTML string that works in Cloudflare Workers, any SSR framework, or a build script. This package is the Astro-flavoured wrapper, so you write `<SEO {...} />` instead of `<Fragment set:html={buildHead(...)} />`.

## License

MIT
