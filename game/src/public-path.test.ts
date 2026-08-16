import { describe, expect, it } from "vitest";
import { resolvePublicPath } from "./public-path.ts";

describe("harbour public paths", () => {
  it("maps /g/ferry35 onto the harbour page so critics cannot sit on a stale /?g= tab", () => {
    expect(resolvePublicPath("/g/ferry35")).toBe("/harbour/index.html");
    expect(resolvePublicPath("/g/")).toBe("/harbour/index.html");
    expect(resolvePublicPath("/")).toBe("/harbour/index.html");
    expect(resolvePublicPath("/play")).toBe("/harbour/index.html");
  });
});
