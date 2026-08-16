import { describe, expect, it } from "vitest";
import {
  NAMETAG_FOLD,
  makePaperNametag,
  paintPaperNametagCard,
} from "../public/harbour/nametags.js";

function mockCtx() {
  const texts: string[] = [];
  return {
    texts,
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
    measureText(c: string) {
      return { width: String(c).length * 10 };
    },
    fillText(text: string) {
      texts.push(String(text));
    },
  };
}

describe("outdoor PAPER nametags", () => {
  it("keeps a kraft folded corner and still stamps PAPER", () => {
    expect(NAMETAG_FOLD).toBe(true);
    const ctx = mockCtx();
    paintPaperNametagCard(ctx, 512, 128, "Ferry clerk");
    const written = ctx.texts.join("");
    expect(written).toContain("PAPER");
    expect(written).toContain("Ferry clerk");
    expect(makePaperNametag("Ferry clerk")).toBeNull();
  });
});
