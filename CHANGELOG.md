# Changelog

All notable changes to `@arraypress/seo-astro` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] — Unreleased

One integration for everything a site needs to be found. `seo()` takes over
what used to be four packages and a hand-written script per site: OG cards,
llms.txt, security headers and the audit.

### Added

- **`seo()`, at `@arraypress/seo-astro/integration`.** Feeds `<SEO />` its
  site-wide settings through a virtual module, and at the end of the build
  renders the OG cards, writes `/llms.txt`, audits the pages and writes
  `_headers`, in that order. Every part is on by default and `false` turns one
  off.
- **A share card per page, rendered at build.** A page with a title and no
  `image` gets `/og/<page>.png`, drawn by `@arraypress/og-image` from its title
  and description, with `og:image`, its width, height and alt text pointing at
  it. `<SEO og={{ … }}>` changes what a card says, `og={false}` opts a page
  out, and `seo({ og })` sets the brand: colours, logo (an SVG works as it
  is), wordmark, fonts. Cards are cached under Astro's `cacheDir` and only
  re-rendered when something that changes the picture does, which matters on
  a site with a thousand pages.

  `@arraypress/og-image` is an optional peer dependency, loaded only when
  cards are on, so a site with `og: false` never installs Satori or resvg.
  With cards on and the package missing, setup stops and says what to install.
- **A card's headline drops the site's name.** "Pricing — Acme" is right for
  the tab and the results page, but the card shows Acme in its footer, so the
  headline is "Pricing": the `titleTemplate`'s own text comes off, else the
  `siteName` at either end with whatever joins it (" — Acme", " | Acme",
  "Acme — ", "Acme | "…), else the card's `wordmark` the same way.
  `og.title` is used as given.
- **Cards in the site's own light and type.** `seo({ og })` passes
  og-image's `backdrop` (colour glows and a film grain), `stripe`,
  `fontFamily` and `displayFontFamily` through, and they're part of the cache
  key.
- **`/llms.txt` from the build.** By default, the home page's name and
  description and every indexable page with its title and description. Pass
  the content, or a function given `{ origin, pages }`, to say more. A route
  of the site's own wins over the default; content in both places stops the
  build rather than silently picking one.
- **`_headers` with a CSP hashed from the built pages**, written by
  `@arraypress/security-headers` 3's `writeHeadersFile()`. The pages are read
  once and the same scan is handed over, rather than read again. HSTS covers
  this host only, with no `includeSubDomains` (security-headers 3's default):
  a site's build can't know what else lives on its domain. Opt in with
  `headers: { hsts: { includeSubDomains: true } }`.
- **`seo({ jsonLd })`** — structured data on every page. When a page has more
  than one node, `<SEO />` joins them into one `@graph` with
  `@arraypress/jsonld`'s `buildGraph()`, so the page's Article names the
  site's Organization as its publisher.
- **`seo({ defaults })`** — `<SEO />` props for every page.
- `@arraypress/seo-astro/jsonld`: the `@arraypress/jsonld` builders, so a
  site needs one package.
- `@arraypress/seo-astro/llms` and `./llms/core`: everything from
  `@arraypress/llms-txt-astro` — `llmsTxtRoute`, `llmsFullTxtRoute`,
  `collectionSection`, `collectionDocuments`, `originOf`, and the `build`,
  `buildFull`, `parse` and `llmsTxtResponse` builders — for content a config
  can't reach, such as a content collection.
- `readPage()` reads `og:site_name`.
- **`ogImageFor(page, site?)`**, from the main entry: the URL of the card
  `seo()` renders for a page, by the same rule `<SEO />` uses, for a
  BlogPosting's or Product's `image`. Layouts were copying the
  `/og/<path>.png` naming to get it. `undefined` when cards are off.
- **The audit leaves noindex pages out** of its per-page checks
  (`audit: { skipNoindex: true }`, the default). A page kept out of search
  on purpose was reported for its title length, its missing `<h1>` and its
  being noindex, on every build. Its links still count for the orphan check,
  and the build names the pages it skipped in one line. `skipNoindex: false`
  audits them as before. `auditPages()` returns them as `skipped`.
- **The card's domain is the brand's.** With no `og.domain`, the footer shows
  the host of the site-wide Organization's `url` in `jsonLd` (else a
  Person's, else the WebSite's), and only then Astro's `site`, so a demo or
  staging deploy still shows the brand's own host. `www.` comes off.
- **WebP and AVIF artwork** reaches the card: og-image converts it through
  `sharp` when it's installed. A card the renderer warned about (no sharp, an
  unreadable image) is passed to the build log and isn't cached.

### Fixed

- **The site-wide JSON-LD `@id`s had no `/` before the `#`**:
  `https://example.com#organization`. They're keyed on the site's root now,
  `https://example.com/#organization`, the form every other tool writes.
- A code sample quoted in an attribute (`data-code="<script>…"`,
  `onplay={…}` in a snippet) no longer adds a script hash to the CSP or an
  inline-handler warning: security-headers' scan reads each tag whole. Its
  `data-csp` takes schemes too (`media-src blob:`).
- The card cache was keyed on og-image's entry file alone, so a change to
  any of its other modules served stale cards. It reads them all.

### Changed

- **`<SEO />` needs `seo()` in `astro.config`.** It reads its settings from the
  integration and won't build without it.
- `<SEO image>` is made absolute against `site`. Social scrapers have no base
  to resolve `/og.png` against, so a relative image gave no card at all.
- The audit no longer calls `/404` or `/500` an orphan page. They're reached
  by not finding a page, never by a link, so every site got the same false
  warning.
- The audit's error tells you to set `audit: { failOn: 'never' }`.
- Requires Node 22.12 or later, which Astro 6 already does. The renderer is
  loaded with Node's `require`, which loads ES modules from 22.12: a dynamic
  `import()` in an integration goes through Vite's module runner, which
  Astro closes before the build hooks run.

### Removed

- **`seoAudit()` and the `@arraypress/seo-astro/audit` export.** Use
  `seo({ audit })`; the options are the same. `auditPages()` stays at
  `@arraypress/seo-astro/audit/core`.

## [2.3.0] — Unreleased

### Fixed

- **The canonical check treated deduplication as an error.** `canonical-mismatch`
  fired whenever a page's canonical named a different page — but that is the
  normal, correct way to handle two URLs for one thing, not a mistake. Run
  against a real 1,413-page site it reported **373 errors and 373 orphans that
  were all wrong**, on pages that were deduplicated exactly as they should be.

  A check that is wrong that often is worse than no check: it buries the 56
  findings that were real.

- **The integration didn't use Astro's own `site`.** `auditPages` needs an origin
  to tell an internal link from an external one; without one, every absolute
  canonical read as off-site. Wired into a real 1,413-page build that meant
  **1,413 errors, all false** — from an integration that had Astro's configured
  `site` available the whole time. It now defaults from `astro:config:done`, and
  an explicit `site` option still wins.

- Relatedly, `canonical-off-site` no longer fires when no `site` is configured
  at all. Without an origin to compare against, off-site is unknowable rather
  than true.

### Changed

- `canonical-mismatch` is replaced by three checks that distinguish the cases:
  - `canonical-off-site` (error) — points at another origin.
  - `canonical-broken` (error) — points at a page that isn't in the build.
  - `canonical-chain` (error) — points at a page that itself canonicalises
    somewhere else. Google follows one hop, so a chain silently loses the end
    of it.

  A canonical naming another page that exists and is self-canonical is a
  correct dedup pair, and is now **silent**.

- Pages that canonicalise elsewhere are excluded from `title-duplicate`,
  `description-duplicate` and `orphan-page`. A deduplicated page is *meant* to
  share its title with its canonical and *meant* not to be linked; reporting
  both was the same bug seen from two other angles.

  Anyone who set `checks: { 'canonical-mismatch': … }` should use the new names.

## [2.2.1] — Unreleased

### Fixed

- `auditPages()` could not be imported from plain Node. `@arraypress/seo-astro/audit`
  resolves to `integration.ts`, and Node refuses to strip types for files under
  `node_modules` — fine for `astro.config.mjs`, which loads through Vite, but
  the README also offered `auditPages()` for use outside a build, and that threw
  `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.

  The framework-agnostic checker is now also exported as
  `@arraypress/seo-astro/audit/core` — plain JavaScript, no Astro, no Vite —
  matching the existing `./core` convention. `@arraypress/seo-astro/audit` is
  unchanged and remains the import for `astro.config.mjs`.

## [2.2.0] — Unreleased

### Added

- **`seoAudit()` — a build-time SEO audit integration**, at
  `@arraypress/seo-astro/audit`. Reads the built HTML at `astro:build:done` and
  reports what's wrong with it: missing/duplicate/over-long titles and
  descriptions, missing or mismatched canonicals, incomplete Open Graph,
  missing or repeated `<h1>`, images with no `alt`, noindexed pages, and pages
  nothing links to. `failOn: 'error'` (the default) fails the build, so this
  runs in CI rather than nagging one editor at a time.

  The set-level checks — duplicate titles, orphan pages — are the point: they
  are properties of the whole site and a per-page checker structurally cannot
  see them.

  **On thresholds:** Google publishes no character limit for titles or
  descriptions; truncation is pixel-width. The 60/155 defaults are the
  community heuristics for that width, which is exactly why they're options.
  What *is* specified, and checked as such, is Open Graph's four required
  properties.

  `auditPages(pages, options)` is exported alongside it for use outside a build.

- **`<Breadcrumbs>`** — a breadcrumb trail and its `BreadcrumbList` structured
  data from one array, so the two can't drift apart. Semantic, unstyled markup
  (`nav > ol > li`, `aria-current="page"`, separators hidden from assistive
  tech). The last crumb is the current page: rendered as text, and declared
  with no `item` URL. A `url` passed for it is deliberately ignored rather than
  honoured in the markup but not the data.

- `breadcrumbList(items)` and `ldJson(ld)`, exported from the core for building
  the same structured data by hand.

### Fixed

- **JSON-LD injection escaped `<`.** A `</script>` appearing inside any string
  value — a description quoting markup, a crumb name — closed the block early,
  dropping the rest of the structured data into the document as markup. Now
  emitted as `\u003c`, which is the same character to a JSON parser.

## [2.1.0] — Unreleased

### Added

- `titleTemplate` — a house title format with `%s` standing in for the page
  title, so a site declares the shape once (`'%s — Acme'`, or `'Acme — %s'` to
  lead with the brand) and each page passes only its own half. It applies to
  `<title>`, `og:title` and `twitter:title` together, so the three can't drift.
  A template containing no `%s` is ignored in favour of the bare `title`,
  rather than being used as-is and giving every page an identical title.

## [1.2.0] — Unreleased

### Added

- Re-exported the core's non-component surface — `buildHead`, `injectHead`,
  `robotsTxt`, `canonicalize`, `escapeHtml`, plus the `BuildHeadOptions` and
  `RobotsTxtOptions` types. An Astro project that also generates a
  `robots.txt` no longer needs a second dependency on `@arraypress/seo`:
  `<SEO />` and `robotsTxt()` now come from the same package.

## [1.0.1] — Unreleased

### Changed

- Widened the `astro` peerDependency to `^6.0.0 || ^7.0.0` for
  Astro 7 readiness. No runtime changes — the component is unaffected by the
  Astro 7 compiler / Vite 8 (Rolldown) upgrade.

## [1.0.0] — Unreleased

### Added

- `<SEO />` — an idiomatic Astro component wrapping `buildHead()` from
  `@arraypress/seo`. Takes the same options (title, description, canonical
  `url`, `image`, Open Graph + Twitter, `robots`, `hreflang`, article meta,
  `verification`, `jsonLd`) and renders the full tag set, so consumers use
  `<SEO {...} />` instead of `set:html={buildHead(...)}`.
