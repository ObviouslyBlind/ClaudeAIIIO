import { describe, expect, it } from "vitest";
import {
  CART_PAPER_PRICE,
  HIRE_COST,
  HOTDOG_PACK_PRICE,
  LAND_ASK_CAP_MUL,
  LAND_FLOOR,
  LAND_STREET_BUMP,
  LAUNCH_SALES_TAX,
} from "./economy.ts";
import { inflateAsksAfterLease, landAskIndex, plotAsk } from "./landPrice.ts";
import { createLandBoard, DEVELOP_COST, leasePlot, STARTER_CASH } from "./land.ts";
import { createVisitor } from "./sim.ts";

describe("PAPER land asks and lease inflation", () => {
  it("keeps North street dearer per m² than South street", () => {
    const n = plotAsk("north", 400, "street", 80);
    const s = plotAsk("south", 400, "street", 80);
    expect(n / 400).toBeGreaterThan(s / 400);
    expect(s).toBeGreaterThanOrEqual(LAND_FLOOR.south.street);
    expect(n).toBeGreaterThanOrEqual(LAND_FLOOR.north.street);
  });

  it("leaves $1000 PAPER on the street cart, not a vacant lease", () => {
    const board = createLandBoard();
    const kit = CART_PAPER_PRICE + HIRE_COST + HOTDOG_PACK_PRICE;
    expect(kit).toBeLessThan(STARTER_CASH);
    expect(LAUNCH_SALES_TAX).toBeCloseTo(0.08);
    const vacant = board.plots.filter((p) => !p.owner && p.class === "by_right");
    expect(vacant.length).toBeGreaterThan(10);
    expect(vacant.every((p) => p.price + DEVELOP_COST > STARTER_CASH)).toBe(true);
    expect(leasePlot(board, createVisitor(STARTER_CASH), vacant[0]!.id).ok).toBe(false);
  });

  it("does not inflate street asks when someone buys a $750 cart pad", () => {
    const board = createLandBoard();
    const pad = board.plots.find((p) => p.class === "cart_pad" && !p.owner)!;
    const street = board.plots.find(
      (p) => p.island === "south" && p.band === "street" && p.class === "by_right" && !p.owner,
    )!;
    const frozen = street.price;
    const otherPad = board.plots.find((p) => p.class === "cart_pad" && p.id !== pad.id && !p.owner)!;
    const padAsk = otherPad.price;
    expect(leasePlot(board, createVisitor(STARTER_CASH), pad.id).ok).toBe(true);
    expect(street.price).toBe(frozen);
    expect(otherPad.price).toBe(padAsk);
    expect(otherPad.price).toBe(750);
  });

  it("keeps every cart pad at $750 after street lots inflate", () => {
    const board = createLandBoard();
    const pads = board.plots.filter((p) => p.class === "cart_pad");
    expect(pads.length).toBeGreaterThan(2);
    expect(pads.every((p) => p.price === 750 && p.seedPrice === 750)).toBe(true);
    const street = board.plots.find(
      (p) => p.island === "south" && p.band === "street" && p.class === "by_right" && !p.owner,
    )!;
    expect(leasePlot(board, createVisitor(80_000), street.id).ok).toBe(true);
    const still = board.plots.filter((p) => p.class === "cart_pad");
    expect(still.every((p) => p.price === 750)).toBe(true);
    expect(still.every((p) => p.seedPrice === 750)).toBe(true);
    still[0]!.price = 9_999;
    still[0]!.seedPrice = 9_999;
    inflateAsksAfterLease(board.plots, street);
    expect(still[0]!.price).toBe(750);
    expect(still[0]!.seedPrice).toBe(750);
  });

  it("inflates remaining vacant asks when someone leases, with a seed cap", () => {
    const board = createLandBoard();
    const visitor = createVisitor(80_000);
    const southStreet = board.plots.filter(
      (p) => p.island === "south" && p.band === "street" && !p.owner && p.class === "by_right",
    );
    const byStreet = new Map<string, typeof southStreet>();
    for (const p of southStreet) {
      const row = byStreet.get(p.street) ?? [];
      row.push(p);
      byStreet.set(p.street, row);
    }
    const pair = [...byStreet.values()].find((row) => row.length >= 2)!;
    const bought = pair[0]!;
    const neighbour = pair[1]!;
    const far = board.plots.find((p) => p.island !== bought.island && !p.owner)!;
    const beforeN = neighbour.price;
    const beforeF = far.price;
    const beforeIndex = landAskIndex(board.plots);

    const leased = leasePlot(board, visitor, bought.id);
    expect(leased.ok).toBe(true);
    expect(neighbour.price).toBeGreaterThan(beforeN);
    expect(neighbour.price).toBeCloseTo(Math.round(beforeN * (1 + LAND_STREET_BUMP)), 0);
    expect(far.price).toBeGreaterThan(beforeF);
    expect(landAskIndex(board.plots)).toBeGreaterThan(beforeIndex);

    neighbour.price = neighbour.seedPrice * LAND_ASK_CAP_MUL;
    inflateAsksAfterLease(board.plots, bought);
    expect(neighbour.price).toBe(neighbour.seedPrice * LAND_ASK_CAP_MUL);
  });

  it("does not inflate again when restoring a lease", () => {
    const board = createLandBoard();
    const visitor = createVisitor(80_000);
    const plot = board.plots.find(
      (p) => p.island === "south" && !p.owner && p.class === "by_right",
    )!;
    const other = board.plots.find((p) => p.id !== plot.id && !p.owner)!;
    const frozen = other.price;
    expect(leasePlot(board, visitor, plot.id, "visitor", { inflate: false }).ok).toBe(true);
    expect(other.price).toBe(frozen);
  });
});
