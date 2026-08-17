import { describe, expect, it } from "vitest";
import { createLandBoard } from "../src/land.ts";
import { restoreShard, serializeShard } from "../src/persist.ts";
import { createVisitor, createWorld } from "../src/sim.ts";
import {
  addLine,
  createVisitorCart,
  dumpCart,
  removeLine,
  restoreCart,
} from "../src/visitorCart.ts";

describe("visitor PAPER cart lines", () => {
  it("starts empty and adds a goodId/qty line", () => {
    const visitor = createVisitor(1_000);
    expect(visitor.cart).toEqual([]);
    expect(createVisitorCart()).toEqual([]);

    const added = addLine(visitor, "corn", 4);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.line).toEqual({ goodId: "corn", qty: 4 });
    expect(visitor.cart).toEqual([{ goodId: "corn", qty: 4 }]);
    expect(Object.keys(visitor.cart[0]!).sort()).toEqual(["goodId", "qty"]);
    expect("weight" in visitor.cart[0]!).toBe(false);
  });

  it("merges qty on the same goodId and removes the line", () => {
    const visitor = { cart: createVisitorCart() };
    expect(addLine(visitor, "nails", 2).ok).toBe(true);
    expect(addLine(visitor, "nails", 3).ok).toBe(true);
    expect(visitor.cart).toEqual([{ goodId: "nails", qty: 5 }]);

    const gone = removeLine(visitor, "nails");
    expect(gone.ok).toBe(true);
    if (!gone.ok) return;
    expect(gone.line).toEqual({ goodId: "nails", qty: 5 });
    expect(visitor.cart).toEqual([]);
  });

  it("rejects unknown goods and missing lines", () => {
    const visitor = { cart: createVisitorCart() };
    const bad = addLine(visitor, "gold", 1);
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.reason).toBe("unknown_good");

    const qty = addLine(visitor, "ore", 0);
    expect(qty.ok).toBe(false);
    if (qty.ok) return;
    expect(qty.reason).toBe("bad_qty");

    const missing = removeLine(visitor, "ore");
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toBe("no_line");
  });

  it("round-trips lines through dump/restore without weight", () => {
    const visitor = { cart: createVisitorCart() };
    addLine(visitor, "lumber", 2);
    addLine(visitor, "tools", 1);

    const blob = JSON.parse(JSON.stringify(dumpCart(visitor.cart)));
    expect(blob).toEqual([
      { goodId: "lumber", qty: 2 },
      { goodId: "tools", qty: 1 },
    ]);
    expect(blob.every((row: { weight?: unknown }) => row.weight === undefined)).toBe(true);

    const restored = restoreCart(blob);
    expect(restored).toEqual(visitor.cart);
    expect(restoreCart(undefined)).toEqual([]);
    expect(restoreCart({ weight: 9 })).toEqual([]);
  });

  it("persists cart lines on the PAPER shard dump/restore", () => {
    const world = createWorld(3);
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    expect(addLine(visitor, "beans", 6).ok).toBe(true);
    expect(addLine(visitor, "fuel", 1).ok).toBe(true);

    const blob = serializeShard({ world, land, visitor });
    const json = JSON.parse(JSON.stringify(blob));
    expect(json.mode).toBe("PAPER");
    expect(json.provenance).toBe("SIMULATED");
    expect(json.visitor.cart).toEqual([
      { goodId: "beans", qty: 6 },
      { goodId: "fuel", qty: 1 },
    ]);

    const restored = restoreShard(json);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.visitor.cart).toEqual([
      { goodId: "beans", qty: 6 },
      { goodId: "fuel", qty: 1 },
    ]);
  });
});
