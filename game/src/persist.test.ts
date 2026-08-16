import { describe, expect, it } from "vitest";
import { createLandBoard, getPlot, leasePlot } from "./land.ts";
import { restoreShard, serializeShard } from "./persist.ts";
import { createVisitor, createWorld, fastForward } from "./sim.ts";
import { setStatuteSlider } from "./statutes.ts";
import { addLine } from "./visitorCart.ts";

function cheapVacant(land: ReturnType<typeof createLandBoard>, cash: number) {
  return land.plots
    .filter((p) => !p.owner && p.class === "by_right" && p.price + 40 <= cash)
    .sort((a, b) => a.price - b.price)[0]!;
}

describe("PAPER shard persist step C", () => {
  it("round-trips visitor cash through a JSON-safe PAPER blob", () => {
    const world = createWorld(3);
    fastForward(world, 12);
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    const vacant = cheapVacant(land, visitor.cash);
    expect(leasePlot(land, visitor, vacant.id).ok).toBe(true);
    expect(setStatuteSlider(world.statutes, "sales_tax", "rate", 0.05)).toBe(true);
    const cash = visitor.cash;

    const blob = serializeShard({ world, land, visitor });
    const json = JSON.parse(JSON.stringify(blob));
    expect(json.mode).toBe("PAPER");
    expect(json.provenance).toBe("SIMULATED");
    expect(json.tick).toBe(12);
    expect(json.visitor.cash).toBe(cash);
    expect(json.visitor.leases).toEqual([vacant.id]);
    expect(json.visitor.cart).toEqual([]);
    expect(json.statutes.sales_tax.rate).toBeCloseTo(0.05);

    const restored = restoreShard(json);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.visitor.cash).toBe(cash);
    expect(restored.world.tick).toBe(12);
  });

  it("keeps a leased plot owned after restore", () => {
    const world = createWorld(9);
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    const vacant = cheapVacant(land, visitor.cash);
    expect(leasePlot(land, visitor, vacant.id).ok).toBe(true);
    expect(vacant.owner).toBe("visitor");

    const restored = restoreShard(serializeShard({ world, land, visitor }));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(getPlot(restored.land, vacant.id)?.owner).toBe("visitor");
    expect(restored.land.plots.filter((p) => p.owner === "visitor").map((p) => p.id)).toEqual([
      vacant.id,
    ]);
  });

  it("fails cleanly when the blob is missing", () => {
    expect(() => restoreShard(undefined)).not.toThrow();
    expect(() => restoreShard(null)).not.toThrow();

    const missing = restoreShard(undefined);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toBe("no_blob");

    const empty = restoreShard(null);
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toBe("no_blob");
  });

  it("round-trips visitor PAPER cart lines", () => {
    const world = createWorld(3);
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    expect(addLine(visitor, "potato", 8).ok).toBe(true);

    const restored = restoreShard(serializeShard({ world, land, visitor }));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.visitor.cart).toEqual([{ goodId: "potato", qty: 8 }]);
  });
});
