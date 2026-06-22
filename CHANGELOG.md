# Changelog

All notable changes to `@arraypress/seo-astro` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
