/** Map a request path onto a file under game/public. */
export function resolvePublicPath(pathname: string): string {
  if (pathname.startsWith("/harbor")) pathname = "/harbour" + pathname.slice("/harbor".length);
  // Unique critic URLs so Chrome cannot reuse a cached `/?g=ferry32` tab.
  if (pathname === "/g" || pathname.startsWith("/g/")) return "/harbour/index.html";
  if (pathname === "/" || pathname === "/harbour" || pathname === "/harbour/") {
    return "/harbour/index.html";
  }
  if (pathname === "/play" || pathname === "/play/") return "/harbour/index.html";
  if (pathname === "/market" || pathname === "/market/") return "/market/index.html";
  if (pathname === "/hansard" || pathname === "/hansard/") return "/hansard/index.html";
  return pathname;
}
