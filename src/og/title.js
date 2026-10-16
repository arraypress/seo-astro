/**
 * @arraypress/seo-astro — the headline on a page's share card.
 *
 * A page title carries the site's name for the browser tab and search results
 * ("Pricing — Acme"). The card already shows the brand in its footer, so the
 * name in the headline only repeats it and pushes the words that matter off
 * the line. The card takes the title without it.
 *
 * @module @arraypress/seo-astro/og/title
 */

/** What sits between a page's half of a title and the site's name. */
const SEPARATOR = String.raw`(?:\s*[—–|·•/~»:]\s*|\s+-\s+)`;

/**
 * Escape a string for use inside a regular expression.
 *
 * @param {string} text - Literal text.
 * @returns {string} The text with every metacharacter escaped.
 */
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Take a title template's fixed text off a title that already has it, such as
 * a page that passed `"Pricing — Acme"` with the template `"%s — Acme"`.
 *
 * @param {string} title - The title.
 * @param {string|undefined} template - The `titleTemplate`, `%s` for the page's half.
 * @returns {string|undefined} The page's half, or undefined when the title
 *   doesn't carry the template's text (or carries nothing else).
 */
function stripTemplate(title, template) {
  if (typeof template !== 'string' || !template.includes('%s')) return undefined;
  const at = template.indexOf('%s');
  const before = template.slice(0, at);
  const after = template.slice(at + 2).replaceAll('%s', '');
  if (!before.trim() && !after.trim()) return undefined;
  if (!title.startsWith(before) || !title.endsWith(after)) return undefined;
  const middle = title.slice(before.length, title.length - after.length).trim();
  return middle || undefined;
}

/**
 * Take the site's name off either end of a title, with the separator that
 * joins it: `"Pricing — Acme"`, `"Pricing | Acme"`, `"Acme: Pricing"`.
 *
 * @param {string} title - The title.
 * @param {string|undefined} siteName - The site's name.
 * @returns {string|undefined} The rest, or undefined when the name isn't at
 *   either end (or the title is nothing but the name).
 */
function stripSiteName(title, siteName) {
  if (!siteName?.trim()) return undefined;
  const name = escapeRegExp(siteName.trim());
  const match =
    title.match(new RegExp(`^(.+?)${SEPARATOR}${name}$`, 'i')) ?? title.match(new RegExp(`^${name}${SEPARATOR}(.+)$`, 'i'));
  return match?.[1].trim() || undefined;
}

/**
 * The card's headline: the page's title without the site's name.
 *
 * The title template's own text comes off first, as the surest sign of what
 * the site appends; failing that, the site's name and its separator at either
 * end. A title that is only the site's name stays as it is.
 *
 * @param {string|undefined} title - The page's `title`, as passed to `<SEO />`.
 * @param {Object} [site={}] - What the site adds to titles.
 * @param {string} [site.titleTemplate] - The `titleTemplate`, e.g. `'%s — Acme'`.
 * @param {string} [site.siteName] - The site's name, e.g. `'Acme'`.
 * @returns {string|undefined} The headline, or `title` as it came when there's
 *   nothing to take off.
 *
 * @example
 * cardTitle('Pricing — Acme', { siteName: 'Acme' });          // 'Pricing'
 * cardTitle('Acme | Pricing', { titleTemplate: 'Acme | %s' }); // 'Pricing'
 * cardTitle('Acme', { siteName: 'Acme' });                    // 'Acme'
 */
export function cardTitle(title, { titleTemplate, siteName } = {}) {
  if (typeof title !== 'string') return title;
  const trimmed = title.trim();
  return stripTemplate(trimmed, titleTemplate) ?? stripSiteName(trimmed, siteName) ?? title;
}
