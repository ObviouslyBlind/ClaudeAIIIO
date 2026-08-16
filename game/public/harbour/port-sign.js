import * as THREE from "three";

/**
 * PAPER wooden harbour sign on the north quay apron.
 * Kraft board, brown ink, two posts. Not a HUD, not a street-prop iron
 * blade, not CoD stencil, not Capital Rift UI.
 *
 * Hook from quay.js `makeQuay` only. Do not import from main.js.
 */

export const SIGN_LINE = "North port · PAPER";

const WOOD = 0x8a6238;
const WOOD_DARK = 0x6a4a2a;
const WOOD_LIGHT = 0x9a6a40;
const KRAFT = 0xefe4c8;
const INK = "#3d2a1c";
const PAPER_FACE = "#efe4c8";
const PAPER_EDGE = "#8a6238";

/** East of the pier, just outside the paved clear, slightly seaward of the port. */
const LOCAL_X = 12.6;
const ALONG = 18;

function part(w, h, d, color, shadow = true) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.castShadow = shadow;
  m.receiveShadow = true;
  m.userData.mode = "PAPER";
  return m;
}

function kraftFace() {
  if (typeof document === "undefined") {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(3.85, 1.12),
      new THREE.MeshLambertMaterial({ color: KRAFT }),
    );
    m.userData.mode = "PAPER";
    m.userData.kind = "port-sign-face";
    m.userData.line = SIGN_LINE;
    return m;
  }

  const w = 512;
  const h = 160;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = PAPER_FACE;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = PAPER_EDGE;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = INK;
  ctx.font = "600 46px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(SIGN_LINE, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;

  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(3.85, 1.12),
    new THREE.MeshLambertMaterial({ map: tex, color: 0xffffff }),
  );
  m.userData.mode = "PAPER";
  m.userData.kind = "port-sign-face";
  m.userData.line = SIGN_LINE;
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

/**
 * One wooden board on two posts. North quay only.
 * helpers.heightAt(spec, x, z) — same land height as quay.js
 */
export function makePortSign(spec, helpers) {
  if (!spec || spec.id !== "north") return null;

  const toward = 1;
  const { x, z } = spec.port;
  const wx = x + LOCAL_X;
  const wz = z + toward * ALONG;
  const gy = helpers && helpers.heightAt ? helpers.heightAt(spec, wx, wz) : 1.12;

  const g = new THREE.Group();
  g.name = "port-sign";
  g.userData.kind = "port-sign";
  g.userData.dress = "port-sign";
  g.userData.mode = "PAPER";
  g.userData.line = SIGN_LINE;

  const postL = part(0.16, 2.85, 0.16, WOOD_DARK);
  postL.position.set(-1.85, 1.42, 0);
  const postR = part(0.16, 2.85, 0.16, WOOD_DARK);
  postR.position.set(1.85, 1.42, 0);
  g.add(postL, postR);

  const capL = part(0.22, 0.08, 0.22, WOOD, false);
  capL.position.set(-1.85, 2.89, 0);
  capL.userData.part = "cap";
  capL.userData.kind = "port-sign-cap";
  const capR = part(0.22, 0.08, 0.22, WOOD, false);
  capR.position.set(1.85, 2.89, 0);
  capR.userData.part = "cap";
  capR.userData.kind = "port-sign-cap";
  const finL = part(0.07, 0.12, 0.07, WOOD, false);
  finL.position.set(-1.85, 2.99, 0);
  const finR = part(0.07, 0.12, 0.07, WOOD, false);
  finR.position.set(1.85, 2.99, 0);
  g.add(capL, capR, finL, finR);

  const braceL = part(0.09, 0.78, 0.09, WOOD);
  braceL.position.set(-1.52, 1.62, 0);
  braceL.rotation.z = -0.62;
  braceL.userData.part = "brace";
  braceL.userData.kind = "port-sign-brace";
  const braceR = part(0.09, 0.78, 0.09, WOOD);
  braceR.position.set(1.52, 1.62, 0);
  braceR.rotation.z = 0.62;
  braceR.userData.part = "brace";
  braceR.userData.kind = "port-sign-brace";
  g.add(braceL, braceR);

  const beam = part(4.05, 0.12, 0.14, WOOD, false);
  beam.position.set(0, 2.78, 0);
  g.add(beam);

  const board = part(4.05, 1.28, 0.12, WOOD_LIGHT);
  board.position.set(0, 2.12, 0);
  g.add(board);

  const face = kraftFace();
  face.position.set(0, 2.12, 0.08);
  g.add(face);

  g.position.set(wx, gy, wz);
  g.rotation.y = 0.42;
  return g;
}
