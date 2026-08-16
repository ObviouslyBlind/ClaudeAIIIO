import { describe, expect, it } from "vitest";
import { afterBuyFillCart } from "./buyCart.ts";
import { buyAtIsland } from "./buy.ts";
import { createVisitor, createWorld } from "./sim.ts";

describe("PAPER afterBuyFillCart", () => {
  it("labels every fill PAPER / SIMULATED and is not a live exchange", () => {
    const visitor = createVisitor(10);
    const filled = afterBuyFillCart(visitor, { goodId: "corn", qty: 1 });
    expect(filled.ok).toBe(true);
    if (!filled.ok) return;
    expect(filled.mode).toBe("PAPER");
    expect(filled.provenance).toBe("SIMULATED");
    expect(filled.note).toMatch(/PAPER/);
    expect(filled.note).toMatch(/Not a live exchange/);
    expect(filled.line).toEqual({ goodId: "corn", qty: 1 });
    expect(visitor.cart).toEqual([{ goodId: "corn", qty: 1 }]);
    expect("weight" in visitor.cart[0]!).toBe(false);
  });

  it("adds qty onto visitor.cart for the same goodId", () => {
    const visitor = createVisitor(10);
    expect(afterBuyFillCart(visitor, { goodId: "ore", qty: 2 }).ok).toBe(true);
    expect(afterBuyFillCart(visitor, { goodId: "ore", qty: 3 }).ok).toBe(true);
    expect(visitor.cart).toEqual([{ goodId: "ore", qty: 5 }]);
  });

  it("skips when the PAPER buy was rejected and leaves the cart alone", () => {
    const visitor = createVisitor(10);
    const skipped = afterBuyFillCart(visitor, { ok: false, goodId: "corn", qty: 1 });
    expect(skipped.ok).toBe(false);
    if (skipped.ok) return;
    expect(skipped.reason).toBe("buy_rejected");
    expect(skipped.mode).toBe("PAPER");
    expect(skipped.provenance).toBe("SIMULATED");
    expect(visitor.cart).toEqual([]);
  });

  it("fills the cart after buyAtIsland ok and skips a rejected buy", () => {
    const world = createWorld(1);
    world.lastPrice.corn = 0.5;
    const visitor = createVisitor(10);

    const okBuy = buyAtIsland(world, visitor, { island: "north", goodId: "corn", qty: 2 });
    expect(okBuy.ok).toBe(true);
    if (!okBuy.ok) return;
    expect(visitor.cart).toEqual([{ goodId: "corn", qty: 2 }]);
    expect(visitor.stock.corn).toBe(2);

    const broke = createVisitor(0);
    const rejected = buyAtIsland(world, broke, { island: "north", goodId: "corn", qty: 1 });
    expect(rejected.ok).toBe(false);
    const skipped = afterBuyFillCart(broke, rejected);
    expect(skipped.ok).toBe(false);
    if (skipped.ok) return;
    expect(skipped.reason).toBe("buy_rejected");
    expect(broke.cart).toEqual([]);
    expect(broke.stock.corn).toBe(0);
  });
});
