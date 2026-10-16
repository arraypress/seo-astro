import type { BuiltPage } from '../integration/pages.js';

/** Load the renderer, or say how to install it. */
export function loadRenderer(): { renderOgImage: (input: object, options?: object) => Promise<Uint8Array>; source: string };

/** Render the OG cards for a built site, taking the markers out of its pages. */
export function buildOgImages(
  pages: BuiltPage[],
  og: Record<string, unknown>,
  context: { root: string; projectRoot: string; cacheDir?: string; base?: string; logger: { warn: (message: string) => void } },
): Promise<{ cards: number; rendered: number; reused: number }>;
