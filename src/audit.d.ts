/** Severity of a finding, or `false` to disable the check entirely. */
export type CheckLevel = 'error' | 'warn' | false;

export type CheckName =
  | 'title-missing' | 'title-duplicate' | 'title-long' | 'title-short'
  | 'description-missing' | 'description-duplicate' | 'description-long' | 'description-short'
  | 'canonical-missing' | 'canonical-off-site' | 'canonical-broken' | 'canonical-chain'
  | 'og-incomplete'
  | 'h1-missing' | 'h1-multiple'
  | 'image-alt-missing'
  | 'noindex'
  | 'orphan-page';

export interface Finding {
  check: CheckName;
  level: 'error' | 'warn';
  path: string;
  message: string;
}

export interface AuditOptions {
  /** Heuristic for ~600px of title. Google publishes no character limit. @default 60 */
  maxTitleLength?: number;
  /** @default 15 */
  minTitleLength?: number;
  /** @default 155 */
  maxDescriptionLength?: number;
  /** @default 50 */
  minDescriptionLength?: number;
  /** Site URL — lets the audit tell internal links from external, and check canonicals. */
  site?: string;
  /** Paths to skip. Strings are matched as normalised paths; RegExps are tested against them. */
  ignore?: Array<string | RegExp>;
  /** Per-check severity override, or `false` to switch one off. */
  checks?: Partial<Record<CheckName, CheckLevel>>;
}

export interface AuditResult {
  findings: Finding[];
  checked: number;
  errors: number;
  warnings: number;
}

export interface PageRead {
  title?: string;
  description?: string;
  robots?: string;
  canonical?: string;
  og: { title?: string; type?: string; image?: string; url?: string };
  h1: string[];
  images: Array<{ tag: string; hasAlt: boolean; src?: string }>;
  hrefs: string[];
}

/** Default severity for every check. */
export const CHECKS: Record<CheckName, 'error' | 'warn'>;

/** Read the SEO-relevant tags out of one rendered page. */
export function readPage(html: string): PageRead;

/** Collapse the many ways one page can be addressed into a single key. */
export function normalizePath(path: string): string;

/** Audit a whole built site. */
export function auditPages(
  pages: Array<{ path: string; html: string }>,
  options?: AuditOptions,
): AuditResult;
