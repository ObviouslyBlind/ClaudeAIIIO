import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ndcToLayer, pickTagPlots, TAG_RADIUS_LOTS_M, tagKindFor, tagLabelFor } from "../public/harbour/lot-tags.js";

const main = readFileSync(new URL("../public/harbour/main.js", import.meta.url), "utf8");

describe("lot tags (PAPER)", () => {
  it("does not treat a $ tag click as a walk tap", () => {
    expect(main).toContain(".lot-tag");
    expect(main).toContain("#lot-tags");
    expect(main).toContain("#near-lease");
    expect(main).toContain("focusStand");
    expect(main).toContain("onOpenStand");
    expect(main).toContain("onCloseStand");
    expect(main).toContain("snapClose");
    expect(main).toContain("stallCam");
    expect(main).toContain("stallCameraPose");
    expect(main).toContain("openStandMenu(data.stand.id, data.stand)");
    expect(main).toContain("taxi.hopOut");
  });

  it("labels vacant as the $ bar, yours, and taken", () => {
    expect(tagKindFor({ owner: null, price: 80 })).toBe("buy");
    expect(tagLabelFor({ owner: null, price: 80 })).toBe("$80");
    expect(tagKindFor({ owner: "visitor" })).toBe("yours");
    expect(tagLabelFor({ owner: "visitor" })).toBe("YOURS");
    expect(tagLabelFor({ owner: "visitor" }, true)).toBe("PLACE");
    expect(tagKindFor({ owner: "npc" })).toBe("taken");
    expect(tagLabelFor({ owner: "npc" })).toBe("TAKEN");
  });

  it("prefers nearby vacant buy tags", () => {
    const plots = [
      { id: "far-buy", owner: null, price: 40, x: 800, z: 0 },
      { id: "near-taken", owner: "npc", price: 40, x: 10, z: 0 },
      { id: "near-buy", owner: null, price: 40, x: 20, z: 0 },
    ];
    const picked = pickTagPlots(plots, { x: 0, z: 0 }, "world", 8);
    expect(picked[0].plot.id).toBe("near-buy");
    expect(picked.some((x) => x.plot.id === "near-taken")).toBe(true);
  });

  it("keeps Lots $ bars nearby, not the whole island", () => {
    expect(TAG_RADIUS_LOTS_M).toBeGreaterThanOrEqual(500);
    expect(TAG_RADIUS_LOTS_M).toBeLessThanOrEqual(600);
    const plots = [
      { id: "far-buy", owner: null, price: 40, x: 800, z: 0 },
      { id: "near-buy", owner: null, price: 40, x: 20, z: 0 },
    ];
    const picked = pickTagPlots(plots, { x: 0, z: 0 }, "lots", 8);
    expect(picked.some((x) => x.plot.id === "near-buy")).toBe(true);
    expect(picked.some((x) => x.plot.id === "far-buy")).toBe(false);
  });

  it("maps NDC onto the canvas box", () => {
    const pos = ndcToLayer({ x: 0, y: 0, z: 0.2 }, { left: 40, top: 10, width: 200, height: 100 });
    expect(pos).toEqual({ x: 140, y: 60 });
    expect(ndcToLayer({ x: 0, y: 0, z: 1.4 }, { left: 0, top: 0, width: 100, height: 100 })).toBeNull();
  });
});
