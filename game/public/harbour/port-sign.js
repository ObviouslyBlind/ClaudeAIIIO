import * as THREE from "three";

/**
 * PAPER wooden harbour sign on the north quay apron.
 * Kraft board, brown ink, two posts. Not a HUD, not a street-prop iron
 * blade, not CoD stencil, not Capital Rift UI.
 *
 * Hook from quay.js `makeQuay` only. Do not import from main.js.
 *
 * Spawn camera sits inland (more negative Z) and cannot orbit.
 * The kraft face must look inland or the first frame only sees the
 * thin seaward back of the board — that is why /g/sign59 FAIL SIGN.
 */

export const SIGN_LINE = "North port · PAPER";

const WOOD = 0x8a6238;
const WOOD_DARK = 0x6a4a2a;
const WOOD_LIGHT = 0x9a6a40;
const KRAFT = 0xefe4c8;
const INK = "#3d2a1c";
const PAPER_FACE = "#efe4c8";
const PAPER_EDGE = "#8a6238";

/** East of the 11 m pier, in the look-at cone (camera x=20 → look-at x=0). */
const LOCAL_X = 13.5;
const ALONG = 18;

const POST_W = 1.4;
const POST_H = 14;
const POST_SPAN = 5.1;
const BOARD_W = 11.2;
const BOARD_H = 5.6;
const BOARD_D = 0.9;
const BOARD_Y = 8.4;
const FACE_W = 10.6;
const FACE_H = 5.2;

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
      new THREE.PlaneGeometry(FACE_W, FACE_H),
      new THREE.MeshLambertMaterial({
        color: KRAFT,
        side: THREE.DoubleSide,
      }),
    );
    m.userData.mode = "PAPER";
    m.userData.kind = "port-sign-face";
    m.userData.line = SIGN_LINE;
    return m;
  }

  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = PAPER_FACE;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = PAPER_EDGE;
  ctx.lineWidth = 18;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  ctx.fillStyle = INK;
  ctx.font = "700 72px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(SIGN_LINE, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;

  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(FACE_W, FACE_H),
    new THREE.MeshLambertMaterial({
      map: tex,
      color: 0xffffff,
      side: THREE.DoubleSide,
    }),
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

  const postL = part(POST_W, POST_H, POST_W, WOOD_DARK);
  postL.position.set(-POST_SPAN, POST_H / 2, 0);
  postL.userData.part = "post";
  const postR = part(POST_W, POST_H, POST_W, WOOD_DARK);
  postR.position.set(POST_SPAN, POST_H / 2, 0);
  postR.userData.part = "post";
  g.add(postL, postR);

  const capY = POST_H + 0.16;
  const capL = part(1.7, 0.28, 1.7, WOOD, false);
  capL.position.set(-POST_SPAN, capY, 0);
  capL.userData.part = "cap";
  capL.userData.kind = "port-sign-cap";
  const capR = part(1.7, 0.28, 1.7, WOOD, false);
  capR.position.set(POST_SPAN, capY, 0);
  capR.userData.part = "cap";
  capR.userData.kind = "port-sign-cap";
  const finL = part(0.35, 0.4, 0.35, WOOD, false);
  finL.position.set(-POST_SPAN, capY + 0.32, 0);
  const finR = part(0.35, 0.4, 0.35, WOOD, false);
  finR.position.set(POST_SPAN, capY + 0.32, 0);
  g.add(capL, capR, finL, finR);

  const braceL = part(0.45, 3.2, 0.45, WOOD);
  braceL.position.set(-POST_SPAN + 1.35, 4.2, 0);
  braceL.rotation.z = -0.55;
  braceL.userData.part = "brace";
  braceL.userData.kind = "port-sign-brace";
  const braceR = part(0.45, 3.2, 0.45, WOOD);
  braceR.position.set(POST_SPAN - 1.35, 4.2, 0);
  braceR.rotation.z = 0.55;
  braceR.userData.part = "brace";
  braceR.userData.kind = "port-sign-brace";
  g.add(braceL, braceR);

  const beam = part(BOARD_W + 0.6, 0.45, 0.5, WOOD, false);
  beam.position.set(0, BOARD_Y + BOARD_H / 2 + 0.28, 0);
  g.add(beam);

  const board = part(BOARD_W, BOARD_H, BOARD_D, WOOD_LIGHT);
  board.position.set(0, BOARD_Y, 0);
  board.userData.part = "board";
  g.add(board);

  /** Inland face (−Z). Spawn camera looks seaward (+Z) at this board. */
  const face = kraftFace();
  face.position.set(0, BOARD_Y, -(BOARD_D / 2 + 0.04));
  face.rotation.y = Math.PI;
  g.add(face);

  /** Tiny kraft nail on the board face. WOOD_DARK already in this file — PAPER box, not grey iron. */
  const nail = part(0.05, 0.05, 0.04, WOOD_DARK, false);
  nail.position.set(-4.6, BOARD_Y + 2.2, -(BOARD_D / 2 + 0.06));
  nail.userData.part = "nail";
  g.add(nail);

  /** Tiny kraft screw, second fastener, offset from the nail. WOOD already in this file — PAPER box, not grey iron. */
  const screw = part(0.05, 0.05, 0.04, WOOD, false);
  screw.position.set(4.6, BOARD_Y + 2.2, -(BOARD_D / 2 + 0.06));
  screw.userData.part = "screw";
  g.add(screw);

  g.position.set(wx, gy, wz);
  g.rotation.y = 0;
  return g;
}
