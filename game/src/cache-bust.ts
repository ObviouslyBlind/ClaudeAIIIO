/**
 * One stamp per play process. Date.now() on every response made first-frame.js
 * and main.js import each other at a new ?v= forever, so `/` never became
 * interactive (tab "doesn't respond" after the cyan first frame).
 */
export const ASSET_NONCE = Date.now();

/** Stamp harbour CSS/JS so a critic load never needs a manual hard-refresh. */
export function bustHarbourAssets(html: string, nonce = ASSET_NONCE): string {
  return html
    .replace(/href="(\/harbour\/[^"]+\.css)(?:\?v=\d+)?"/g, `href="$1?v=${nonce}"`)
    .replace(/src="(\/harbour\/[^"]+\.js)(?:\?v=\d+)?"/g, `src="$1?v=${nonce}"`)
    .replace(/<title>[^<]*<\/title>/, `<title>Two Harbors — harbour · ${nonce}</title>`);
}

/** Stamp relative harbour imports so traffic.js is not served from a stale module cache. */
export function bustModuleImports(js: string, nonce = ASSET_NONCE): string {
  return js
    .replace(/from ["'](\.\/[^"']+\.js)(?:\?v=\d+)?["']/g, `from "$1?v=${nonce}"`)
    .replace(/\bimport\(["'](\.\/[^"']+\.js)(?:\?v=\d+)?["']\)/g, `import("$1?v=${nonce}")`);
}
