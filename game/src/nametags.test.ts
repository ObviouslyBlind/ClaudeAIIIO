import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  NAMETAG_CLIP,
  NAMETAG_FOLD,
  NAMETAG_HOLE,
  NAMETAG_NEAR_M,
  NAMETAG_STRING,
  makeNametagClip,
  makeNametagString,
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
  it("keeps a kraft folded corner, punch-hole, clip, string, and still stamps PAPER", () => {
    expect(NAMETAG_FOLD).toBe(true);
    expect(NAMETAG_HOLE).toBe(true);
    expect(NAMETAG_CLIP).toBe(true);
    expect(NAMETAG_STRING).toBe(true);
    expect(NAMETAG_NEAR_M).toBeGreaterThanOrEqual(200);
    const ctx = mockCtx();
    paintPaperNametagCard(ctx, 512, 128, "Ferry clerk");
    const written = ctx.texts.join("");
    expect(written).toContain("PAPER");
    expect(written).toContain("Ferry clerk");
    expect(ctx.arcs.length).toBeGreaterThanOrEqual(2);
    expect(ctx.arcs[0].x).toBe(256);
    expect(ctx.arcs[0].y).toBeLessThan(32);

    const clip = makeNametagClip();
    expect(clip.userData.part).toBe("clip");
    expect(clip.userData.mode).toBe("PAPER");
    expect(clip.geometry.type).toBe("BoxGeometry");
    expect((clip.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0x6e4a32);
    const { width, height, depth } = (clip.geometry as THREE.BoxGeometry).parameters;
    expect(width).toBeLessThan(0.08);
    expect(height).toBeLessThan(0.25);
    expect(depth).toBeLessThan(0.08);
    expect(clip.position.y).toBeGreaterThan(0.5);
    expect(Math.abs(clip.position.x)).toBeGreaterThan(0.2);

    const cord = makeNametagString();
    expect(cord.userData.part).toBe("string");
    expect(cord.userData.mode).toBe("PAPER");
    expect(cord.geometry.type).toBe("BoxGeometry");
    expect((cord.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0x3d2a1c);
    const s = (cord.geometry as THREE.BoxGeometry).parameters;
    expect(s.width).toBeLessThan(0.04);
    expect(s.height).toBeLessThan(0.3);
    expect(s.depth).toBeLessThan(0.04);
    expect(cord.position.x).not.toBe(clip.position.x);
    expect(Math.abs(cord.position.x)).toBeGreaterThan(0.05);
    expect(Math.abs(cord.position.x)).toBeLessThan(0.3);
    expect(cord.position.y).toBeLessThan(clip.position.y);
    expect(cord.position.distanceTo(clip.position)).toBeGreaterThan(0.3);

    expect(makePaperNametag("Ferry clerk")).toBeNull();
  });
});
