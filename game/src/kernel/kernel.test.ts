import { describe, expect, it } from "vitest";
import {
  KERNEL_VERSION,
  PLAYER_CAP,
  VISITOR_ID,
  appendEvent,
  createEventLog,
  createMenuStack,
  createPlayerBoard,
  crumbs,
  depositFor,
  indexPlots,
  interestSnapshot,
  menuDepth,
  mineralsSnapshot,
  overlappingPairs,
  playerCount,
  plotsNear,
  popMenu,
  pushMenu,
  restoreEvents,
  ringsOverlap,
  seedDeposits,
  spawnPlayer,
  spawnVisitor,
  uniquePlotIds,
} from "./index.ts";
import { MINERAL_CATALOG } from "./minerals.ts";

describe("shard kernel K.1", () => {
  it("versions the kernel and lists ore as the in-game mineral", () => {
    expect(KERNEL_VERSION).toBe("K.1");
    expect(MINERAL_CATALOG.map((m) => m.id)).toEqual(["ore"]);
    expect(MINERAL_CATALOG[0]!.goodId).toBe("ore");
    expect(MINERAL_CATALOG[0]!.chain).toBe("extract");
  });

  it("rejects overlapping rings and allows adjacent lots that only share an edge", () => {
    const a: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const overlap: [number, number][] = [
      [5, 5],
      [15, 5],
      [15, 15],
      [5, 15],
    ];
    const beside: [number, number][] = [
      [10, 0],
      [20, 0],
      [20, 10],
      [10, 10],
    ];
    expect(ringsOverlap(a, overlap)).toBe(true);
    expect(ringsOverlap(a, beside)).toBe(false);
  });

  it("indexes plots into 64 m cells so a query is not the whole island", () => {
    const plots = [];
    for (let i = 0; i < 40; i++) {
      plots.push({
        id: `n-${i}`,
        island: "north",
        x: i * 80,
        z: -7000,
        ring: [
          [i * 80, -7010],
          [i * 80 + 20, -7010],
          [i * 80 + 20, -6990],
          [i * 80, -6990],
        ] as [number, number][],
      });
    }
    expect(uniquePlotIds(plots)).toBe(true);
    expect(overlappingPairs(plots)).toEqual([]);
    const index = indexPlots(plots);
    const near = plotsNear(index, "north", 0, -7000, 64);
    expect(near.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThan(plots.length);
    expect(near.every((p) => p.island === "north")).toBe(true);
  });

  it("stacks HUD menus and pops back without losing the root", () => {
    const stack = createMenuStack();
    expect(menuDepth(stack)).toBe(1);
    pushMenu(stack, { id: "inspect", title: "Plot", plotId: "north-street-0" });
    pushMenu(stack, { id: "minerals", title: "Minerals" });
    expect(crumbs(stack)).toEqual(["Harbour", "Plot", "Minerals"]);
    expect(popMenu(stack).id).toBe("inspect");
    expect(popMenu(stack).id).toBe("root");
    expect(popMenu(stack).id).toBe("root");
  });

  it("keeps an event log for lease and develop on a plot", () => {
    const log = createEventLog();
    appendEvent(log, { tick: 3, kind: "lease", playerId: VISITOR_ID, plotId: "p1" });
    appendEvent(log, { tick: 4, kind: "develop", playerId: VISITOR_ID, plotId: "p1", detail: "house" });
    const restored = restoreEvents(log.events);
    expect(restored.events.map((e) => e.kind)).toEqual(["lease", "develop"]);
    expect(restored.events[1]!.detail).toBe("house");
  });

  it("assigns ore deposits on field lots and lists them in the minerals snapshot", () => {
    const plots = seedDeposits([
      { id: "south-field-1", island: "south", band: "field", x: 0, z: 8000, ring: [] as [number, number][], deposit: null },
      { id: "north-street-1", island: "north", band: "street", x: 0, z: -7000, ring: [] as [number, number][], deposit: null },
    ]);
    expect(plots[1]!.deposit).toBeNull();
    const snap = mineralsSnapshot(plots, { ore: 2 });
    expect(snap.catalog[0]!.id).toBe("ore");
    expect(snap.held.ore).toBe(2);
    expect(snap.deposits.every((d) => d.mineral === "ore")).toBe(true);
    if (depositFor({ id: "south-field-1", island: "south", band: "field" }) === "ore") {
      expect(snap.deposits.some((d) => d.plotId === "south-field-1")).toBe(true);
    }
  });
});

describe("500-player kernel cap", () => {
  it("holds 500 player records and keeps interest queries bounded", () => {
    const board = createPlayerBoard();
    spawnVisitor(board, 1_000);
    const plots = [];
    for (let i = 0; i < 120; i++) {
      const x = (i % 12) * 90;
      const z = -7200 + Math.floor(i / 12) * 90;
      plots.push({
        id: `lot-${i}`,
        island: "north" as const,
        x,
        z,
        ring: [
          [x - 10, z - 10],
          [x + 10, z - 10],
          [x + 10, z + 10],
          [x - 10, z + 10],
        ] as [number, number][],
      });
    }
    const index = indexPlots(plots);
    for (let i = 1; i < PLAYER_CAP; i++) {
      const spawned = spawnPlayer(board, {
        id: `p${i}`,
        cash: 1_000,
        island: "north",
        x: (i % 20) * 80,
        z: -7000 - Math.floor(i / 20) * 80,
      });
      expect("ok" in spawned).toBe(false);
    }
    expect(playerCount(board)).toBe(PLAYER_CAP);
    const overflow = spawnPlayer(board, { id: "overflow" });
    expect(overflow).toEqual({ ok: false, reason: "player_cap" });

    const pose = board.players.get("p12")!;
    const snap = interestSnapshot({
      plotIndex: index,
      players: board,
      query: { island: "north", x: pose.x, z: pose.z, radius: 128, exceptId: pose.id },
    });
    expect(snap.plots.length).toBeGreaterThan(0);
    expect(snap.plots.length).toBeLessThan(plots.length);
    expect(snap.actors.length).toBeLessThan(PLAYER_CAP);
    expect(snap.plots.every((p) => p.island === "north")).toBe(true);
    expect(snap.actors.every((a) => a.island === "north")).toBe(true);
    expect(snap.actors.some((a) => a.id === pose.id)).toBe(false);
  });
});
