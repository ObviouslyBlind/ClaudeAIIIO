import { describe, expect, it } from "vitest";
import {
  LABEL,
  PLAYER_TAG_FOLD,
  makePlayerTag,
  paintPlayerTagCard,
} from "../public/harbour/player-tag.js";

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

describe("visitor You tag", () => {
  it("paints You without a PAPER stamp", () => {
    expect(LABEL).toBe("You");
    expect(PLAYER_TAG_FOLD).toBe(true);
    const ctx = mockCtx();
    paintPlayerTagCard(ctx, 512, 128);
    const written = ctx.texts.join("");
    expect(written).toContain("You");
    expect(written).not.toContain("PAPER");
    expect(makePlayerTag()).toBeNull();
  });
});
