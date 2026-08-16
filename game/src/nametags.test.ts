import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  NAMETAG_CLIP,
  NAMETAG_FOLD,
  NAMETAG_HOLE,
  NAMETAG_NEAR_M,
  NAMETAG_PIN,
  NAMETAG_STRING,
  NAMETAG_STUD,
  NAMETAG_TAB,
  makeNametagClip,
  makeNametagPin,
  makeNametagString,
  makeNametagStud,
  makeNametagTab,
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
  it("keeps a kraft folded corner, punch-hole, clip, string, pin, tab, stud, and still stamps PAPER", () => {
    expect(NAMETAG_FOLD).toBe(true);
    expect(NAMETAG_HOLE).toBe(true);
    expect(NAMETAG_CLIP).toBe(true);
    expect(NAMETAG_STRING).toBe(true);
    expect(NAMETAG_PIN).toBe(true);
    expect(NAMETAG_TAB).toBe(true);
    expect(NAMETAG_STUD).toBe(true);
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

    const pin = makeNametagPin();
    expect(pin.userData.part).toBe("pin");
    expect(pin.userData.mode).toBe("PAPER");
    expect(pin.geometry.type).toBe("BoxGeometry");
    expect((pin.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0x4a3220);
    const p = (pin.geometry as THREE.BoxGeometry).parameters;
    expect(p.width).toBeLessThan(0.06);
    expect(p.height).toBeLessThan(0.2);
    expect(p.depth).toBeLessThan(0.06);
    expect(pin.position.x).not.toBe(clip.position.x);
    expect(pin.position.x).not.toBe(cord.position.x);
    expect(pin.position.x).toBeGreaterThan(0.2);
    expect(pin.position.y).toBeLessThan(cord.position.y);
    expect(pin.position.distanceTo(clip.position)).toBeGreaterThan(0.3);
    expect(pin.position.distanceTo(cord.position)).toBeGreaterThan(0.3);

    const tab = makeNametagTab();
    expect(tab.userData.part).toBe("tab");
    expect(tab.userData.mode).toBe("PAPER");
    expect(tab.geometry.type).toBe("BoxGeometry");
    expect((tab.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0xf2d2a8);
    const t = (tab.geometry as THREE.BoxGeometry).parameters;
    expect(t.width).toBeLessThan(0.12);
    expect(t.height).toBeLessThan(0.12);
    expect(t.depth).toBeLessThan(0.06);
    expect(tab.position.x).not.toBe(clip.position.x);
    expect(tab.position.x).not.toBe(cord.position.x);
    expect(tab.position.x).not.toBe(pin.position.x);
    expect(tab.position.x).toBeLessThan(-0.2);
    expect(tab.position.y).toBeLessThan(clip.position.y);
    expect(tab.position.distanceTo(clip.position)).toBeGreaterThan(0.3);
    expect(tab.position.distanceTo(cord.position)).toBeGreaterThan(0.3);
    expect(tab.position.distanceTo(pin.position)).toBeGreaterThan(0.3);

    const stud = makeNametagStud();
    expect(stud.userData.part).toBe("stud");
    expect(stud.userData.mode).toBe("PAPER");
    expect(stud.geometry.type).toBe("BoxGeometry");
    expect((stud.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0x8a6238);
    const st = (stud.geometry as THREE.BoxGeometry).parameters;
    expect(st.width).toBeLessThan(0.12);
    expect(st.height).toBeLessThan(0.12);
    expect(st.depth).toBeLessThan(0.12);
    expect(stud.position.distanceTo(clip.position)).toBeGreaterThan(0.25);
    expect(stud.position.distanceTo(cord.position)).toBeGreaterThan(0.25);
    expect(stud.position.distanceTo(pin.position)).toBeGreaterThan(0.25);
    expect(stud.position.distanceTo(tab.position)).toBeGreaterThan(0.25);

    expect(makePaperNametag("Ferry clerk")).toBeNull();
  });
});
