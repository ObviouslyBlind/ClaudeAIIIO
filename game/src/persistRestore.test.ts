import { describe, expect, it, vi } from "vitest";
import { createLandBoard, getPlot, leasePlot } from "./land.ts";
import { serializeShard } from "./persist.ts";
import { RESTORE_NOTE, restoreLive, type LiveSetters } from "./persistRestore.ts";
import { createVisitor, createWorld, fastForward } from "./sim.ts";
import { setStatuteSlider } from "./statutes.ts";
import { addLine } from "./visitorCart.ts";

function cheapVacant(land: ReturnType<typeof createLandBoard>, cash: number) {
  return land.plots
    .filter((p) => !p.owner && p.class === "by_right" && p.price + 40 <= cash)
    .sort((a, b) => a.price - b.price)[0]!;
}

function liveHolders() {
  let world = createWorld(1);
  let land = createLandBoard();
  let visitor = createVisitor(10);
  const setters: LiveSetters = {
    setWorld: (next) => {
      world = next;
    },
    setLand: (next) => {
      land = next;
    },
    setVisitor: (next) => {
      visitor = next;
    },
  };
  return {
    setters,
    get world() {
      return world;
    },
    get land() {
      return land;
    },
    get visitor() {
      return visitor;
    },
  };
}

describe("PAPER restoreLive last shard blob", () => {
  it("rejects no_blob and does not touch live world/visitor/land", () => {
    const live = liveHolders();
    const cash = live.visitor.cash;
    const tick = live.world.tick;
    const setWorld = vi.fn(live.setters.setWorld);
    const setLand = vi.fn(live.setters.setLand);
    const setVisitor = vi.fn(live.setters.setVisitor);

    const missing = restoreLive(() => null, { setWorld, setLand, setVisitor });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.reason).toBe("no_blob");
    expect(missing.mode).toBe("PAPER");
    expect(missing.provenance).toBe("SIMULATED");
    expect(missing.note).toBe(RESTORE_NOTE);
    expect(missing.note).toMatch(/PAPER/);
    expect(missing.note).toMatch(/Not Postgres/);
    expect(setWorld).not.toHaveBeenCalled();
    expect(setLand).not.toHaveBeenCalled();
    expect(setVisitor).not.toHaveBeenCalled();
    expect(live.visitor.cash).toBe(cash);
    expect(live.world.tick).toBe(tick);

    const empty = restoreLive(() => undefined, live.setters);
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toBe("no_blob");
  });

  it("loads the last PAPER blob into the live world/visitor/land", () => {
    const savedWorld = createWorld(3);
    fastForward(savedWorld, 12);
    const savedLand = createLandBoard();
    const savedVisitor = createVisitor(80_000);
    const vacant = cheapVacant(savedLand, savedVisitor.cash);
    expect(leasePlot(savedLand, savedVisitor, vacant.id).ok).toBe(true);
    expect(setStatuteSlider(savedWorld.statutes, "sales_tax", "rate", 0.05)).toBe(true);
    expect(addLine(savedVisitor, "potato", 8).ok).toBe(true);
    const cash = savedVisitor.cash;
    const blob = serializeShard({ world: savedWorld, land: savedLand, visitor: savedVisitor });
    expect(blob.mode).toBe("PAPER");
    expect(blob.provenance).toBe("SIMULATED");

    const live = liveHolders();
    expect(live.visitor.cash).not.toBe(cash);
    expect(live.world.tick).not.toBe(12);

    const result = restoreLive(() => blob, live.setters);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("PAPER");
    expect(result.provenance).toBe("SIMULATED");
    expect(result.note).toBe(RESTORE_NOTE);
    expect(result.note).toMatch(/PAPER/);
    expect(result.note).toMatch(/Not Postgres/);
    expect(result.note).toMatch(/Does not restart play/);

    expect(live.visitor.cash).toBe(cash);
    expect(live.world.tick).toBe(12);
    expect(getPlot(live.land, vacant.id)?.owner).toBe("visitor");
    expect(live.visitor.cart).toEqual([{ goodId: "potato", qty: 8 }]);
  });

  it("does not apply setters when the PAPER blob is junk", () => {
    const live = liveHolders();
    const cash = live.visitor.cash;
    const setWorld = vi.fn(live.setters.setWorld);
    const setLand = vi.fn(live.setters.setLand);
    const setVisitor = vi.fn(live.setters.setVisitor);

    const junk = restoreLive(
      () => ({ mode: "PAPER", provenance: "SIMULATED" }),
      { setWorld, setLand, setVisitor },
    );
    expect(junk.ok).toBe(false);
    if (junk.ok) return;
    expect(junk.reason).toBe("bad_blob");
    expect(junk.mode).toBe("PAPER");
    expect(setWorld).not.toHaveBeenCalled();
    expect(setLand).not.toHaveBeenCalled();
    expect(setVisitor).not.toHaveBeenCalled();
    expect(live.visitor.cash).toBe(cash);
  });
});
