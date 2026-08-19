import { describe, expect, it } from "vitest";
import { ASSET_NONCE, bustFontUrls, bustHarbourAssets, bustModuleImports } from "./cache-bust.ts";

describe("harbour cache bust", () => {
  it("stamps script and stylesheet so a fresh load is enough", () => {
    const html = `<title>2Isles</title>
<link rel="stylesheet" href="/harbour/style.css" />
<link rel="preload" href="/harbour/fonts/red-hat-text.woff2" as="font" />
<script type="module" src="/harbour/main.js?v=12"></script>`;
    const out = bustHarbourAssets(html, 99);
    expect(out).toContain("/harbour/style.css?v=99");
    expect(out).toContain("/harbour/fonts/red-hat-text.woff2?v=99");
    expect(out).toContain("/harbour/main.js?v=99");
    expect(out).toContain("2Isles · 99");
    expect(out).not.toContain("v=12");
  });

  it("stamps relative ES imports so traffic.js is not a stale module", () => {
    const js = `import { createTraffic } from "./traffic.js";
import { createTaxi } from "./taxi.js?v=1";`;
    const out = bustModuleImports(js, 77);
    expect(out).toContain('./traffic.js?v=77');
    expect(out).toContain('./taxi.js?v=77');
    expect(out).not.toContain("v=1");
  });

  it("stamps dynamic import() so first-frame.js can load main.js fresh", () => {
    const js = `import("./main.js");
import("./lease-hud.js?v=1");`;
    const out = bustModuleImports(js, 88);
    expect(out).toContain('import("./main.js?v=88")');
    expect(out).toContain('import("./lease-hud.js?v=88")');
    expect(out).not.toContain("v=1");
  });

  it("stamps harbour @font-face urls", () => {
    const css = `@font-face { src: url("/harbour/fonts/red-hat-text.woff2") format("woff2"); }`;
    expect(bustFontUrls(css, 55)).toContain('/harbour/fonts/red-hat-text.woff2?v=55');
  });

  it("reuses one process nonce so first-frame ↔ main cannot chain new ?v= forever", () => {
    const html = bustHarbourAssets(
      `<script type="module" src="/harbour/first-frame.js"></script>`,
    );
    const first = bustModuleImports(`import("./main.js");`);
    const main = bustModuleImports(`import { CAM, LOOK } from "./first-frame.js";`);
    const again = bustModuleImports(`import("./main.js");`);
    expect(html).toContain(`/harbour/first-frame.js?v=${ASSET_NONCE}`);
    expect(first).toBe(`import("./main.js?v=${ASSET_NONCE}");`);
    expect(main).toBe(`import { CAM, LOOK } from "./first-frame.js?v=${ASSET_NONCE}";`);
    expect(again).toBe(first);
  });
});
