# Changelog

All notable changes to `@arraypress/seo-astro` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
