/**
 * One stamp per play process. Date.now() on every response made first-frame.js
 * and main.js import each other at a new ?v= forever, so `/` never became
 * interactive (tab "doesn't respond" after the cyan first frame).
 *
 * Harbour file mtime is mixed in so a JS edit on a long-lived play process
 * still busts the browser module cache. Do not call Date.now() per response.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const ASSET_NONCE = Date.now();

/** Max mtime of harbour JS/CSS/HTML. Same value for every file in one page load. */
export function harbourAssetNonce(dir: string, fallback = ASSET_NONCE): number {
  let max = 0;
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return fallback;
  }
  for (const name of names) {
    if (name === "vendor" || name === "fonts") continue;
    if (!/\.(js|css|html)$/.test(name)) continue;
    try {
      const t = statSync(join(dir, name)).mtimeMs;
      if (t > max) max = t;
    } catch {
      /* skip */
    }
  }
  return Math.floor(max) || fallback;
}

/** Stamp harbour CSS/JS/fonts so a critic load never needs a manual hard-refresh. */
export function bustHarbourAssets(html: string, nonce = ASSET_NONCE): string {
  return html
    .replace(/href="(\/harbour\/[^"]+\.css)(?:\?v=\d+)?"/g, `href="$1?v=${nonce}"`)
    .replace(/href="(\/harbour\/fonts\/[^"]+\.woff2)(?:\?v=\d+)?"/g, `href="$1?v=${nonce}"`)
    .replace(/src="(\/harbour\/[^"]+\.js)(?:\?v=\d+)?"/g, `src="$1?v=${nonce}"`)
    .replace(/<title>[^<]*<\/title>/, `<title>2Isles · ${nonce}</title>`);
}

/** Stamp @font-face urls inside harbour CSS. */
export function bustFontUrls(css: string, nonce = ASSET_NONCE): string {
  return css.replace(
    /url\("(\/harbour\/fonts\/[^"]+\.woff2)(?:\?v=\d+)?"\)/g,
    `url("$1?v=${nonce}")`,
  );
}

/** Stamp relative harbour imports so traffic.js is not served from a stale module cache. */
export function bustModuleImports(js: string, nonce = ASSET_NONCE): string {
  return js
    .replace(/from ["'](\.\/[^"']+\.js)(?:\?v=\d+)?["']/g, `from "$1?v=${nonce}"`)
    .replace(/\bimport\(["'](\.\/[^"']+\.js)(?:\?v=\d+)?["']\)/g, `import("$1?v=${nonce}")`);
}
