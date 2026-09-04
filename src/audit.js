/**
 * @arraypress/seo-astro/audit
 *
 * Build-time SEO checks over rendered HTML.
 *
 * The rest of this package emits tags. This reads them back and says what's
 * wrong — the half a CMS plugin does and a static site normally goes without.
 * It runs over the whole built site at once, which is the part an editor-time
 * checker structurally cannot do: duplicate titles and orphan pages are
 * properties of the set, not of any one page.
 *
 * On thresholds: **Google publishes no character limit for titles or
 * descriptions.** Truncation is pixel-width, roughly 600px, and varies by
 * device, query and rendered font. The defaults here (60 / 155) are the
 * long-standing community heuristics for that width, not a specification.
 * They're options for exactly that reason. What *is* specified, and checked as
 * such, is Open Graph's four required properties (https://ogp.me).
 *
 * Zero dependencies — the HTML readers below are deliberately small rather
 * than a parser dependency, and they only ever read build output.
 *
 * @module @arraypress/seo-astro/audit
 */

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/* Entities have to go before anything is measured or compared: `&amp;` is one
 * character to a search engine and five to `String.length`, and two pages whose
 * titles differ only in encoding are duplicates. */
function decode(str) {
  return String(str).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return NAMED[code.toLowerCase()] ?? whole;
  });
}

const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

function attrs(tag) {
  const out = {};
  ATTR.lastIndex = 0;
  let m;
  while ((m = ATTR.exec(tag))) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return out;
}

/* `alt=""` is a valid, meaningful declaration (the image is decorative) and must
 * not be reported. Only a genuinely absent attribute is a finding, so presence
 * is tested separately from value. */
const hasAttr = (tag, name) =>
  new RegExp(`\\s${name}(\\s*=|[\\s/>]|$)`, 'i').test(tag);

const section = (html, tag) => {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1] : html;
};

/**
 * Read the SEO-relevant tags out of one rendered page.
 *
 * @param {string} html - The full HTML document.
 * @returns {Object} Extracted title, meta, canonical, headings, images and links.
 */
export function readPage(html) {
  // Scope the title to <head>: inline SVG icons carry their own <title>, and
  // grabbing the first one in the document reports an icon label as the page
  // title on any site that uses them.
  const head = section(html, 'head');
  const body = section(html, 'body');

  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]));

  const meta = (name) => metas.find((a) => a.name?.toLowerCase() === name)?.content;
  const og = (prop) => metas.find((a) => a.property?.toLowerCase() === prop)?.content;

  return {
    title: titleMatch ? decode(titleMatch[1]).trim() : undefined,
    description: meta('description')?.trim(),
    robots: meta('robots'),
    canonical: links.find((a) => a.rel?.toLowerCase() === 'canonical')?.href,
    og: {
      title: og('og:title'),
      type: og('og:type'),
      image: og('og:image'),
      url: og('og:url'),
    },
    h1: [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
      decode(m[1].replace(/<[^>]*>/g, '')).trim(),
    ),
    images: [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => ({
      tag: m[0],
      hasAlt: hasAttr(m[0], 'alt'),
      src: attrs(m[0]).src,
    })),
    hrefs: [...body.matchAll(/<a\b[^>]*>/gi)].map((m) => attrs(m[0]).href).filter(Boolean),
  };
}

/** Collapse the many ways one page can be addressed into a single key. */
export function normalizePath(p) {
  let out = String(p).split('#')[0].split('?')[0];
  out = out.replace(/\/index\.html?$/i, '/').replace(/\.html?$/i, '');
  if (out.length > 1) out = out.replace(/\/+$/, '');
  return out || '/';
}

function linkTarget(href, fromPath, site) {
  if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:|data:)/i.test(href)) return null;
  try {
    const origin = site ? new URL(site).origin : 'https://audit.invalid';
    const target = new URL(href, new URL(fromPath, origin));
    if (target.origin !== origin) return null; // off-site
    return normalizePath(target.pathname);
  } catch {
    return null;
  }
}

const DEFAULTS = {
  maxTitleLength: 60,
  minTitleLength: 15,
  maxDescriptionLength: 155,
  minDescriptionLength: 50,
  site: undefined,
  ignore: [],
  checks: {},
  failOn: 'error',
};

/** Every check, with its default severity. Any can be turned off, or its level changed. */
export const CHECKS = {
  'title-missing': 'error',
  'title-duplicate': 'error',
  'title-long': 'warn',
  'title-short': 'warn',
  'description-missing': 'warn',
  'description-duplicate': 'warn',
  'description-long': 'warn',
  'description-short': 'warn',
  'canonical-missing': 'warn',
  'canonical-off-site': 'error',
  'canonical-broken': 'error',
  'canonical-chain': 'error',
  'og-incomplete': 'warn',
  'h1-missing': 'warn',
  'h1-multiple': 'warn',
  'image-alt-missing': 'warn',
  'noindex': 'warn',
  'orphan-page': 'warn',
};

/**
 * Audit a whole built site.
 *
 * @param {Array<{path: string, html: string}>} pages - Every rendered page.
 * @param {Object} [options={}] - Thresholds and check configuration.
 * @param {number} [options.maxTitleLength=60] - Heuristic, not a spec. See the module note.
 * @param {number} [options.minTitleLength=15]
 * @param {number} [options.maxDescriptionLength=155]
 * @param {number} [options.minDescriptionLength=50]
 * @param {string} [options.site] - Site URL, used to tell internal links from external ones.
 * @param {Array<string|RegExp>} [options.ignore=[]] - Paths to skip entirely.
 * @param {Object<string, string|false>} [options.checks={}] - Per-check level override, or `false` to disable.
 * @returns {{findings: Array<Object>, checked: number, errors: number, warnings: number}}
 */
export function auditPages(pages = [], options = {}) {
  const o = { ...DEFAULTS, ...options };
  const checks = { ...CHECKS, ...o.checks };

  const skip = (path) =>
    o.ignore.some((rule) => (rule instanceof RegExp ? rule.test(path) : normalizePath(rule) === path));

  const findings = [];
  const add = (check, path, message) => {
    const level = checks[check];
    if (!level) return; // disabled
    findings.push({ check, level, path, message });
  };

  const seen = [];
  for (const page of pages) {
    const path = normalizePath(page.path);
    if (skip(path)) continue;
    const read = readPage(page.html);
    const noindex = /\bnoindex\b/i.test(read.robots ?? '');
    seen.push({ path, read, noindex });

    if (noindex) add('noindex', path, 'Excluded from search results by its robots directive.');

    if (!read.title) add('title-missing', path, 'No <title>.');
    else {
      if (read.title.length > o.maxTitleLength)
        add('title-long', path, `Title is ${read.title.length} chars (over ${o.maxTitleLength}) — "${read.title}"`);
      if (read.title.length < o.minTitleLength)
        add('title-short', path, `Title is only ${read.title.length} chars — "${read.title}"`);
    }

    if (!read.description) add('description-missing', path, 'No meta description.');
    else {
      if (read.description.length > o.maxDescriptionLength)
        add('description-long', path, `Description is ${read.description.length} chars (over ${o.maxDescriptionLength}).`);
      if (read.description.length < o.minDescriptionLength)
        add('description-short', path, `Description is only ${read.description.length} chars.`);
    }

    // A noindex page is deliberately not canonical anywhere, so neither check
    // applies — flagging it would train people to ignore the output.
    if (!noindex) {
      if (!read.canonical) add('canonical-missing', path, 'No canonical link.');
      else {
        const target = linkTarget(read.canonical, path, o.site);
        // With no `site` configured there is no origin to compare against, so
        // "off-site" is unknowable rather than true. Reporting it anyway would
        // flag every absolute canonical on the site.
        if (target === null) {
          if (o.site) add('canonical-off-site', path, `Canonical points off-site: ${read.canonical}`);
        }
        // A canonical pointing at another page is deduplication, not an error,
        // and whether it's correct depends on the target — so it's judged in
        // the set pass below, once every page is known.
        else seen[seen.length - 1].canonicalPath = target;
      }

      // https://ogp.me — "The four required properties for every page are:
      // og:title, og:type, og:image, og:url". This one is a specification.
      const missingOg = ['title', 'type', 'image', 'url'].filter((k) => !read.og[k]);
      if (missingOg.length)
        add('og-incomplete', path, `Missing required Open Graph ${missingOg.map((k) => `og:${k}`).join(', ')}.`);
    }

    if (read.h1.length === 0) add('h1-missing', path, 'No <h1>.');
    if (read.h1.length > 1) add('h1-multiple', path, `${read.h1.length} <h1> elements.`);

    const noAlt = read.images.filter((i) => !i.hasAlt);
    if (noAlt.length)
      add(
        'image-alt-missing',
        path,
        `${noAlt.length} <img> without an alt attribute${noAlt[0].src ? ` (first: ${noAlt[0].src})` : ''}.`,
      );
  }

  // ── Set-level checks: these are the ones a per-page editor plugin can't do ──

  const byPath = new Map(seen.map((p) => [p.path, p]));

  /* A page whose canonical names a different page is a deliberate duplicate —
   * two spellings of one thing, kept because both URLs get linked to. It is
   * meant to share its title with the target and is meant not to be linked, so
   * excluding it from the duplicate and orphan checks is what stops those
   * checks firing on every correctly-deduplicated page on the site. */
  const isDeduped = (p) => p.canonicalPath && p.canonicalPath !== p.path;

  for (const p of seen) {
    if (!isDeduped(p)) continue;
    const target = byPath.get(p.canonicalPath);
    if (!target) {
      add('canonical-broken', p.path, `Canonical points at ${p.canonicalPath}, which isn't in the build.`);
    } else if (isDeduped(target)) {
      // A → B → C. Google follows one hop, so the chain silently loses C.
      add(
        'canonical-chain',
        p.path,
        `Canonical points at ${p.canonicalPath}, which itself canonicalises to ${target.canonicalPath}.`,
      );
    }
    // Otherwise the target exists and is self-canonical — a correct dedup pair.
  }

  const dupes = (field, check, label) => {
    const groups = new Map();
    for (const p of seen) {
      const value = p.read[field];
      if (!value || p.noindex || isDeduped(p)) continue;
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(p.path);
    }
    for (const [value, paths] of groups) {
      if (paths.length < 2) continue;
      for (const path of paths)
        add(check, path, `Duplicate ${label} on ${paths.length} pages (${paths.join(', ')}) — "${value}"`);
    }
  };
  dupes('title', 'title-duplicate', 'title');
  dupes('description', 'description-duplicate', 'description');

  if (checks['orphan-page']) {
    const linked = new Set();
    for (const p of seen) {
      for (const href of p.read.hrefs) {
        const target = linkTarget(href, p.path, o.site);
        if (target && target !== p.path) linked.add(target);
      }
    }
    for (const p of seen) {
      // The homepage is reached without a link, a noindex page is meant to be
      // unreachable, and a deduplicated page is meant to be reached at its
      // canonical instead — none is an orphan in the sense that matters.
      if (p.path === '/' || p.noindex || isDeduped(p)) continue;
      if (!linked.has(p.path)) add('orphan-page', p.path, 'No internal link points at this page.');
    }
  }

  const errors = findings.filter((f) => f.level === 'error').length;
  const warnings = findings.filter((f) => f.level === 'warn').length;
  return { findings, checked: seen.length, errors, warnings };
}
