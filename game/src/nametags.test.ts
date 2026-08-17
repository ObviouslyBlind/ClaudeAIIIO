import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  NAMETAG_BEAD,
  NAMETAG_CLASP,
  NAMETAG_CLIP,
  NAMETAG_FOLD,
  NAMETAG_HOLE,
  NAMETAG_LOOP,
  NAMETAG_NEAR_M,
  NAMETAG_PIN,
  NAMETAG_RIVET,
  NAMETAG_STRING,
  NAMETAG_STUD,
  NAMETAG_TAB,
  NAMETAG_WASHER,
  makeNametagBead,
  makeNametagClasp,
  makeNametagClip,
  makeNametagLoop,
  makeNametagPin,
  makeNametagRivet,
  makeNametagString,
  makeNametagStud,
  makeNametagTab,
  makeNametagWasher,
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
  it("keeps a kraft folded corner, punch-hole, clip, string, pin, tab, stud, rivet, bead, clasp, loop, washer, and still stamps PAPER", () => {
    expect(NAMETAG_FOLD).toBe(true);
    expect(NAMETAG_HOLE).toBe(true);
    expect(NAMETAG_CLIP).toBe(true);
    expect(NAMETAG_STRING).toBe(true);
    expect(NAMETAG_PIN).toBe(true);
    expect(NAMETAG_TAB).toBe(true);
    expect(NAMETAG_STUD).toBe(true);
    expect(NAMETAG_RIVET).toBe(true);
    expect(NAMETAG_BEAD).toBe(true);
    expect(NAMETAG_CLASP).toBe(true);
    expect(NAMETAG_LOOP).toBe(true);
    expect(NAMETAG_WASHER).toBe(true);
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

    const rivet = makeNametagRivet();
    expect(rivet.userData.part).toBe("rivet");
    expect(rivet.userData.mode).toBe("PAPER");
    expect(rivet.geometry.type).toBe("BoxGeometry");
    expect((rivet.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0x6e4a32);
    const rv = (rivet.geometry as THREE.BoxGeometry).parameters;
    expect(rv.width).toBeLessThan(0.12);
    expect(rv.height).toBeLessThan(0.12);
    expect(rv.depth).toBeLessThan(0.12);
    expect(rivet.position.distanceTo(clip.position)).toBeGreaterThan(0.25);
    expect(rivet.position.distanceTo(cord.position)).toBeGreaterThan(0.25);
    expect(rivet.position.distanceTo(pin.position)).toBeGreaterThan(0.25);
    expect(rivet.position.distanceTo(tab.position)).toBeGreaterThan(0.25);
    expect(rivet.position.distanceTo(stud.position)).toBeGreaterThan(0.25);

    const bead = makeNametagBead();
    expect(bead.userData.part).toBe("bead");
    expect(bead.userData.mode).toBe("PAPER");
    expect(bead.geometry.type).toBe("BoxGeometry");
    expect((bead.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0x3d2a1c);
    const bd = (bead.geometry as THREE.BoxGeometry).parameters;
    expect(bd.width).toBeLessThan(0.12);
    expect(bd.height).toBeLessThan(0.12);
    expect(bd.depth).toBeLessThan(0.12);
    expect(bead.position.distanceTo(clip.position)).toBeGreaterThan(0.25);
    expect(bead.position.distanceTo(cord.position)).toBeGreaterThan(0.25);
    expect(bead.position.distanceTo(pin.position)).toBeGreaterThan(0.25);
    expect(bead.position.distanceTo(tab.position)).toBeGreaterThan(0.25);
    expect(bead.position.distanceTo(stud.position)).toBeGreaterThan(0.25);
    expect(bead.position.distanceTo(rivet.position)).toBeGreaterThan(0.25);

    const clasp = makeNametagClasp();
    expect(clasp.userData.part).toBe("clasp");
    expect(clasp.userData.mode).toBe("PAPER");
    expect(clasp.geometry.type).toBe("BoxGeometry");
    expect((clasp.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0x8a6238);
    const cl = (clasp.geometry as THREE.BoxGeometry).parameters;
    expect(cl.width).toBeLessThan(0.12);
    expect(cl.height).toBeLessThan(0.12);
    expect(cl.depth).toBeLessThan(0.12);
    expect(clasp.position.distanceTo(clip.position)).toBeGreaterThan(0.25);
    expect(clasp.position.distanceTo(cord.position)).toBeGreaterThan(0.25);
    expect(clasp.position.distanceTo(pin.position)).toBeGreaterThan(0.25);
    expect(clasp.position.distanceTo(tab.position)).toBeGreaterThan(0.25);
    expect(clasp.position.distanceTo(stud.position)).toBeGreaterThan(0.25);
    expect(clasp.position.distanceTo(rivet.position)).toBeGreaterThan(0.25);
    expect(clasp.position.distanceTo(bead.position)).toBeGreaterThan(0.25);

    const loop = makeNametagLoop();
    expect(loop.userData.part).toBe("loop");
    expect(loop.userData.mode).toBe("PAPER");
    expect(loop.geometry.type).toBe("BoxGeometry");
    expect((loop.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0x3d2a1c);
    const lp = (loop.geometry as THREE.BoxGeometry).parameters;
    expect(lp.width).toBeLessThan(0.12);
    expect(lp.height).toBeLessThan(0.12);
    expect(lp.depth).toBeLessThan(0.12);
    expect(loop.position.distanceTo(clip.position)).toBeGreaterThan(0.25);
    expect(loop.position.distanceTo(cord.position)).toBeGreaterThan(0.25);
    expect(loop.position.distanceTo(pin.position)).toBeGreaterThan(0.25);
    expect(loop.position.distanceTo(tab.position)).toBeGreaterThan(0.25);
    expect(loop.position.distanceTo(stud.position)).toBeGreaterThan(0.25);
    expect(loop.position.distanceTo(rivet.position)).toBeGreaterThan(0.25);
    expect(loop.position.distanceTo(bead.position)).toBeGreaterThan(0.25);
    expect(loop.position.distanceTo(clasp.position)).toBeGreaterThan(0.25);

    const washer = makeNametagWasher();
    expect(washer.userData.part).toBe("washer");
    expect(washer.userData.mode).toBe("PAPER");
    expect(washer.geometry.type).toBe("BoxGeometry");
    expect((washer.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0xc4b496);
    const ws = (washer.geometry as THREE.BoxGeometry).parameters;
    expect(ws.width).toBeLessThan(0.12);
    expect(ws.height).toBeLessThan(0.12);
    expect(ws.depth).toBeLessThan(0.12);
    expect(washer.position.distanceTo(clip.position)).toBeGreaterThan(0.25);
    expect(washer.position.distanceTo(cord.position)).toBeGreaterThan(0.25);
    expect(washer.position.distanceTo(pin.position)).toBeGreaterThan(0.25);
    expect(washer.position.distanceTo(tab.position)).toBeGreaterThan(0.25);
    expect(washer.position.distanceTo(stud.position)).toBeGreaterThan(0.25);
    expect(washer.position.distanceTo(rivet.position)).toBeGreaterThan(0.25);
    expect(washer.position.distanceTo(bead.position)).toBeGreaterThan(0.25);
    expect(washer.position.distanceTo(clasp.position)).toBeGreaterThan(0.25);
    expect(washer.position.distanceTo(loop.position)).toBeGreaterThan(0.25);

    expect(makePaperNametag("Ferry clerk")).toBeNull();
  });
});
