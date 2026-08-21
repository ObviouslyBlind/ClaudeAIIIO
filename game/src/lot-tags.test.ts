import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ndcToLayer, pickTagPlots, TAG_MAP_CAM_M, TAG_POOL, tagKindFor, tagLabelFor, tagWorldScale } from "../public/harbour/lot-tags.js";

const main = readFileSync(new URL("../public/harbour/main.js", import.meta.url), "utf8");
const tags = readFileSync(new URL("../public/harbour/lot-tags.js", import.meta.url), "utf8");

describe("lot tags (PAPER)", () => {
  it("does not treat a $ tag click as a walk tap", () => {
    expect(main).toContain(".lot-tag");
    expect(main).toContain("#lot-tags");
    expect(main).not.toContain("#near-lease");
    expect(main).toContain("focusStand");
    expect(main).toContain("onOpenStand");
    expect(main).toContain("followStall");
    expect(main).toContain("stallFollow");
    expect(main).toContain("leaveStallCam");
    expect(main).toContain("applyFollowStall");
    expect(main).toContain("applyPlay");
    expect(main).toContain("userLeftStall");
    expect(main).toContain("taxi.hopOut");
    expect(main).toContain("lotTags.clickables");
    expect(main).toContain("camRadiusForTags");
    expect(tags).toContain("depthTest: true");
    expect(tags).toContain("depthWrite: false");
    expect(tags).toContain("TAG_Y_M");
    expect(tags).not.toContain("btn.style.left");
  });

  it("labels vacant as the $ bar, yours, and taken", () => {
    expect(tagKindFor({ owner: null, price: 80 })).toBe("buy");
    expect(tagLabelFor({ owner: null, price: 80 })).toBe("$80");
    expect(tagKindFor({ owner: "visitor" })).toBe("yours");
    expect(tagLabelFor({ owner: "visitor" })).toBe("YOURS");
    expect(tagLabelFor({ owner: "visitor" }, true)).toBe("PLACE");
    expect(tagKindFor({ owner: "npc" })).toBe("taken");
    expect(tagLabelFor({ owner: "npc" })).toBe("TAKEN");
    expect(tagKindFor({ owner: null, price: 15000, buildingId: "quay-shops" })).toBe("none");
  });

  it("prefers nearby vacant buy tags", () => {
    const plots = [
      { id: "far-buy", owner: null, price: 40, x: 800, z: 0 },
      { id: "near-taken", owner: "npc", price: 40, x: 10, z: 0 },
      { id: "near-buy", owner: null, price: 40, x: 20, z: 0 },
    ];
    const world = pickTagPlots(plots, { x: 0, z: 0 }, "world", 8);
    expect(world).toEqual([]);
    const picked = pickTagPlots(plots, { x: 0, z: 0 }, "lots", 8);
    expect(picked[0].plot.id).toBe("near-buy");
    expect(picked.some((x) => x.plot.id === "near-taken")).toBe(false);
    expect(picked.some((x) => x.plot.id === "far-buy")).toBe(false);
  });

  it("keeps close Lots $ bars nearby, then opens the highway when zoomed out", () => {
    expect(TAG_POOL).toBeGreaterThanOrEqual(8);
    expect(TAG_POOL).toBeLessThanOrEqual(16);
    const plots = [
      { id: "far-buy", owner: null, price: 40, x: 800, z: 0 },
      { id: "near-buy", owner: null, price: 40, x: 20, z: 0 },
    ];
    const near = pickTagPlots(plots, { x: 0, z: 0 }, "lots", 8, false, { camRadius: 8 });
    expect(near.some((x) => x.plot.id === "near-buy")).toBe(true);
    expect(near.some((x) => x.plot.id === "far-buy")).toBe(false);
    const far = pickTagPlots(plots, { x: 0, z: 0 }, "lots", 12, false, { camRadius: 400, viewRadius: 1200 });
    expect(far.some((x) => x.plot.id === "far-buy")).toBe(true);
    expect(TAG_MAP_CAM_M).toBeGreaterThan(40);
    const close = tagWorldScale(8);
    const wide = tagWorldScale(400);
    expect(close.w).toBeLessThan(wide.w);
    expect(close.w).toBeLessThanOrEqual(3.2);
    expect(wide.w).toBeGreaterThanOrEqual(48);
  });

  it("Your lots and World never keep vacant $ bars after the Lots cycle", () => {
    const plots = [
      { id: "yours", owner: "visitor", price: 32, x: 10, z: 0 },
      { id: "buy", owner: null, price: 40, x: 20, z: 0 },
    ];
    const yoursFar = pickTagPlots(plots, { x: 0, z: 0 }, "yours", 12, false, { camRadius: 400, viewRadius: 1200 });
    expect(yoursFar.every((x) => x.kind === "yours")).toBe(true);
    expect(yoursFar.some((x) => x.kind === "buy")).toBe(false);
    const worldFar = pickTagPlots(plots, { x: 0, z: 0 }, "world", 12, false, { camRadius: 400, viewRadius: 1200 });
    expect(worldFar.some((x) => x.kind === "buy")).toBe(false);
  });

  it("shows PLACE on your lot only while placing", () => {
    const plots = [
      { id: "yours", owner: "visitor", price: 32, x: 10, z: 0 },
      { id: "buy", owner: null, price: 40, x: 20, z: 0 },
    ];
    const idle = pickTagPlots(plots, { x: 0, z: 0 }, "lots", 8, false);
    expect(idle.some((x) => x.kind === "yours")).toBe(true);
    expect(idle.some((x) => x.kind === "buy")).toBe(true);
    const placing = pickTagPlots(plots, { x: 0, z: 0 }, "lots", 8, true);
    expect(placing).toHaveLength(1);
    expect(placing[0].plot.id).toBe("yours");
    expect(tagLabelFor(placing[0].plot, true)).toBe("PLACE");
  });

  it("Your lots overlay shows YOURS tags, not vacant $ bars", () => {
    const plots = [
      { id: "yours", owner: "visitor", price: 32, x: 10, z: 0 },
      { id: "buy", owner: null, price: 40, x: 20, z: 0 },
    ];
    const yours = pickTagPlots(plots, { x: 0, z: 0 }, "yours", 8, false);
    expect(yours).toHaveLength(1);
    expect(yours[0].plot.id).toBe("yours");
    expect(yours[0].kind).toBe("yours");
    expect(pickTagPlots(plots, { x: 0, z: 0 }, "world", 8, false).some((x) => x.kind === "yours")).toBe(true);
  });

  it("maps NDC onto the canvas box", () => {
    const pos = ndcToLayer({ x: 0, y: 0, z: 0.2 }, { left: 40, top: 10, width: 200, height: 100 });
    expect(pos).toEqual({ x: 140, y: 60 });
    expect(ndcToLayer({ x: 0, y: 0, z: 1.4 }, { left: 0, top: 0, width: 100, height: 100 })).toBeNull();
  });
});
