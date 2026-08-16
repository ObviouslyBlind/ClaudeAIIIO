import { describe, expect, it } from "vitest";
import { bustHarbourAssets } from "./cache-bust.ts";

describe("harbour cache bust", () => {
  it("stamps script and stylesheet so a fresh load is enough", () => {
    const html = `<link rel="stylesheet" href="/harbour/style.css" />
<script type="module" src="/harbour/main.js?v=12"></script>`;
    const out = bustHarbourAssets(html, 99);
    expect(out).toContain("/harbour/style.css?v=99");
    expect(out).toContain("/harbour/main.js?v=99");
    expect(out).not.toContain("v=12");
  });
});
