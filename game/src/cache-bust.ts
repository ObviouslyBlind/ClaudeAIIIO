/** Stamp harbour CSS/JS so a critic load never needs a manual hard-refresh. */
export function bustHarbourAssets(html: string, nonce = Date.now()): string {
  return html
    .replace(/href="(\/harbour\/[^"]+\.css)(?:\?v=\d+)?"/g, `href="$1?v=${nonce}"`)
    .replace(/src="(\/harbour\/[^"]+\.js)(?:\?v=\d+)?"/g, `src="$1?v=${nonce}"`);
}

/** Stamp relative harbour imports so traffic.js is not served from a stale module cache. */
export function bustModuleImports(js: string, nonce = Date.now()): string {
  return js.replace(/from ["'](\.\/[^"']+\.js)(?:\?v=\d+)?["']/g, `from "$1?v=${nonce}"`);
}
