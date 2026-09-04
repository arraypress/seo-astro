export interface BuildHeadOptions {
  title?: string;
  /** Template applied to `title`, with `%s` as the placeholder — `'%s — Acme'`,
   *  or `'Acme — %s'` to lead with the brand. Applies to `<title>`, `og:title`
   *  and `twitter:title` alike. A template without `%s` is ignored. */
  titleTemplate?: string;
  description?: string;
  image?: string;
  /** og:image:width — only emitted when an `image` is set. */
  imageWidth?: number | string;
  /** og:image:height — only emitted when an `image` is set. */
  imageHeight?: number | string;
  /** og:image:alt (and the twitter:image:alt fallback) — only with an `image`. */
  imageAlt?: string;
  url?: string;
  type?: string;
  /** Robots directive (e.g. `'noindex, nofollow'`). `false` omits the tag.
   *  Google snippet-size maxima are merged in unless `maxSnippet` is `false`. */
  robots?: string | false;
  /** Append `max-snippet`/`max-image-preview`/`max-video-preview` defaults. @default true */
  maxSnippet?: boolean;
  siteName?: string;
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  /** twitter:image:alt — only emitted when an `image` is set. Falls back to `imageAlt`. */
  twitterImageAlt?: string;
  /** Suppress twitter:title/description/image (Twitter falls back to Open Graph). @default true */
  twitterFallback?: boolean;
  locale?: string;
  articlePublished?: string;
  articleModified?: string;
  articleAuthor?: string;
  verification?: {
    google?: string;
    bing?: string;
    pinterest?: string;
    yandex?: string;
  };
  hreflang?: Array<{ lang: string; url: string }>;
  jsonLd?: object | object[];
  /** Extra `<meta>` tags — each object's keys become attributes
   *  (`true` → bare attribute, null/false/undefined → omitted). For
   *  anything the typed options don't cover (viewport, theme-color, …). */
  meta?: Array<Record<string, string | number | boolean | undefined>>;
  /** Extra `<link>` tags — same attribute rules as `meta`. */
  link?: Array<Record<string, string | number | boolean | undefined>>;
}

/** Build a complete <head> HTML string from options. */
export function buildHead(options?: BuildHeadOptions): string;

/** Inject head HTML into an HTML document (before </head>). Replaces existing <title>. */
export function injectHead(html: string, headHtml: string): string;

export interface RobotsTxtOptions {
  sitemapUrl?: string;
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
  customRules?: string[];
}

/** Generate robots.txt content. */
export function robotsTxt(options?: RobotsTxtOptions): string;

/** Strip tracking query params (and the hash) from a URL for a clean canonical. */
export function canonicalize(input: string): string;

/** Escape HTML entities in a string. */
export function escapeHtml(str: string): string;

export interface BreadcrumbItem { name: string; url?: string; }
/** Build a BreadcrumbList JSON-LD object. An item with no `url` emits no `item`. */
export function breadcrumbList(items?: BreadcrumbItem[]): object;

/** Serialise JSON-LD for inline embedding, escaping `<` so a `</script>` in a value can't close the block. */
export function ldJson(ld: object): string;
