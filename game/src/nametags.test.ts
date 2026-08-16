import { describe, expect, it } from "vitest";
import {
  NAMETAG_FOLD,
  NAMETAG_HOLE,
  makePaperNametag,
  paintPaperNametagCard,
} from "../public/harbour/nametags.js";

function mockCtx() {
  const texts: string[] = [];
  const arcs: Array<{ x: number; y: number; r: number }> = [];
  return {
    texts,
    arcs,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
    fillRect() {},
    strokeRect() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    setLineDash() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    arc(x: number, y: number, r: number) {
      arcs.push({ x, y, r });
    },
    measureText(c: string) {
      return { width: String(c).length * 10 };
    },
    fillText(text: string) {
      texts.push(String(text));
    },
  };
}

describe("outdoor PAPER nametags", () => {
  it("keeps a kraft folded corner, punch-hole, and still stamps PAPER", () => {
    expect(NAMETAG_FOLD).toBe(true);
    expect(NAMETAG_HOLE).toBe(true);
    const ctx = mockCtx();
    paintPaperNametagCard(ctx, 512, 128, "Ferry clerk");
    const written = ctx.texts.join("");
    expect(written).toContain("PAPER");
    expect(written).toContain("Ferry clerk");
    expect(ctx.arcs.length).toBeGreaterThanOrEqual(2);
    expect(ctx.arcs[0].x).toBe(256);
    expect(ctx.arcs[0].y).toBeLessThan(32);
    expect(makePaperNametag("Ferry clerk")).toBeNull();
  });
});
