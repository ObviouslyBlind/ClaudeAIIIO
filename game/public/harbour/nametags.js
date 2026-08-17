import * as THREE from "three";

/**
 * Outdoor PAPER name labels. Canvas sprites on THREE.Sprite (camera billboard).
 * Kraft card + brown ink. Not a HUD, not a CoD plate, not Capital Rift UI.
 */

/** Player-to-walker metres. `/g/tags45` FAIL TAGS: 48 m hid every crate-scale quay hand. */
export const NAMETAG_NEAR_M = 240;
const LABEL_Y = 2.15;
/** World metres on an unscaled walker. Scaled quay hands compensate in dressPaperNametags. */
const CARD_W_M = 3.6;
const CARD_H_M = 0.9;
const PAPER_FACE = "#efe4c8";
const PAPER_EDGE = "#8a6238";
const INK = "#3d2a1c";
const STAMP = "#7a2e22";
/** Canvas-card fold is on. Not a 3D mesh. */
export const NAMETAG_FOLD = true;
/** Canvas-card punch-hole / string grommet is on. Not a 3D mesh. */
export const NAMETAG_HOLE = true;
/** Tiny kraft PAPER clip on the card. 3D box, existing walker hex. */
export const NAMETAG_CLIP = true;
/** Tiny kraft PAPER string/cord on the card. 3D box, existing walker hex. */
export const NAMETAG_STRING = true;
/** Tiny kraft PAPER pin on the card. 3D box, existing walker hex. */
export const NAMETAG_PIN = true;
/** Tiny kraft PAPER tab on the card. 3D box, existing walker hex. */
export const NAMETAG_TAB = true;
/** Tiny kraft PAPER stud on the card. 3D box, existing walker hex. */
export const NAMETAG_STUD = true;
/** Tiny kraft PAPER rivet on the card. 3D box, existing walker hex. */
export const NAMETAG_RIVET = true;
/** Tiny kraft PAPER bead on the card. 3D box, existing walker hex. */
export const NAMETAG_BEAD = true;
/** Tiny kraft PAPER clasp on the card. 3D box, existing walker hex. */
export const NAMETAG_CLASP = true;
/** Tiny kraft PAPER loop on the card. 3D box, existing walker hex. */
export const NAMETAG_LOOP = true;

const SKIN = 0xf2d2a8;
const PANTS = 0x6e4a32;
const HAIR = 0x3d2a1c;
const SHOES = 0x4a3220;

const WALKER_NAMES = ["Ferry clerk", "Quay hand", "Stall keep"];
const SHIRTS = [0xc45c3a, 0x4a6e8a, 0x6a8f44];

const _world = new THREE.Vector3();

function playerPos(getPlayer) {
  if (!getPlayer) return null;
  const p = getPlayer();
  if (!p) return null;
  return p.position ? p.position : p;
}

function meshOf(person) {
  if (!person) return null;
  if (person.isObject3D) return person;
  if (person.mesh && person.mesh.isObject3D) return person.mesh;
  return null;
}

function paperBox(w, h, d, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Tiny kraft PAPER clip at the top-left of the name card. PANTS brown box —
 * not grey metal. Sprite-local size so it stays a clip on the kraft card.
 */
export function makeNametagClip() {
  const clip = paperBox(0.04, 0.15, 0.03, PANTS);
  clip.name = "paper-nametag-clip";
  clip.userData.part = "clip";
  clip.userData.mode = "PAPER";
  clip.castShadow = false;
  clip.receiveShadow = false;
  clip.frustumCulled = false;
  clip.renderOrder = 4;
  clip.material.depthTest = false;
  clip.position.set(-0.4, 0.9, 0.06);
  return clip;
}

/**
 * Tiny kraft PAPER string/cord hanging near the punch-hole. HAIR brown box —
 * not grey twine. Offset from the clip (top-left), fold (top-right), and
 * punch-hole (top-centre). Sprite-local so it stays a cord on the kraft card.
 */
export function makeNametagString() {
  const cord = paperBox(0.018, 0.2, 0.018, HAIR);
  cord.name = "paper-nametag-string";
  cord.userData.part = "string";
  cord.userData.mode = "PAPER";
  cord.castShadow = false;
  cord.receiveShadow = false;
  cord.frustumCulled = false;
  cord.renderOrder = 4;
  cord.material.depthTest = false;
  cord.position.set(0.16, 0.58, 0.05);
  return cord;
}

/**
 * Tiny kraft PAPER pin on the lower-right of the name card. SHOES brown box —
 * not grey metal. Offset from the clip (top-left), string, fold (top-right),
 * and punch-hole (top-centre). Sprite-local so it stays a pin on the kraft card.
 */
export function makeNametagPin() {
  const pin = paperBox(0.03, 0.1, 0.025, SHOES);
  pin.name = "paper-nametag-pin";
  pin.userData.part = "pin";
  pin.userData.mode = "PAPER";
  pin.castShadow = false;
  pin.receiveShadow = false;
  pin.frustumCulled = false;
  pin.renderOrder = 4;
  pin.material.depthTest = false;
  pin.position.set(0.34, 0.22, 0.05);
  return pin;
}

/**
 * Tiny kraft PAPER tab on the lower-left of the name card. SKIN kraft box —
 * not grey metal. Offset from the clip (top-left), string, pin (lower-right),
 * fold (top-right), and punch-hole (top-centre). Sprite-local so it stays a
 * tab on the kraft card.
 */
export function makeNametagTab() {
  const tab = paperBox(0.08, 0.06, 0.02, SKIN);
  tab.name = "paper-nametag-tab";
  tab.userData.part = "tab";
  tab.userData.mode = "PAPER";
  tab.castShadow = false;
  tab.receiveShadow = false;
  tab.frustumCulled = false;
  tab.renderOrder = 4;
  tab.material.depthTest = false;
  tab.position.set(-0.38, 0.18, 0.05);
  return tab;
}

/**
 * Tiny kraft PAPER stud on the card face. PAPER_EDGE brown box —
 * not grey metal. Offset from the clip (top-left), string, pin (lower-right),
 * tab (lower-left), fold (top-right), and punch-hole (top-centre). Sprite-local
 * so it stays a stud on the kraft card.
 */
export function makeNametagStud() {
  const stud = paperBox(0.05, 0.05, 0.03, PAPER_EDGE);
  stud.name = "paper-nametag-stud";
  stud.userData.part = "stud";
  stud.userData.mode = "PAPER";
  stud.castShadow = false;
  stud.receiveShadow = false;
  stud.frustumCulled = false;
  stud.renderOrder = 4;
  stud.material.depthTest = false;
  stud.position.set(0.0, 0.32, 0.05);
  return stud;
}

/**
 * Tiny kraft PAPER rivet on the card face. PANTS brown box —
 * not grey metal. Offset from the clip (top-left), string, pin (lower-right),
 * tab (lower-left), stud, fold (top-right), and punch-hole (top-centre).
 * Sprite-local so it stays a rivet on the kraft card.
 */
export function makeNametagRivet() {
  const rivet = paperBox(0.04, 0.04, 0.025, PANTS);
  rivet.name = "paper-nametag-rivet";
  rivet.userData.part = "rivet";
  rivet.userData.mode = "PAPER";
  rivet.castShadow = false;
  rivet.receiveShadow = false;
  rivet.frustumCulled = false;
  rivet.renderOrder = 4;
  rivet.material.depthTest = false;
  rivet.position.set(-0.24, 0.62, 0.05);
  return rivet;
}

/**
 * Tiny kraft PAPER bead on the card face. HAIR brown box —
 * not grey metal. Offset from the rivet (-0.24, 0.62, 0.05), clip,
 * string, pin, tab, and stud. Sprite-local so it stays a bead on the
 * kraft card.
 */
export function makeNametagBead() {
  const bead = paperBox(0.035, 0.035, 0.025, HAIR);
  bead.name = "paper-nametag-bead";
  bead.userData.part = "bead";
  bead.userData.mode = "PAPER";
  bead.castShadow = false;
  bead.receiveShadow = false;
  bead.frustumCulled = false;
  bead.renderOrder = 4;
  bead.material.depthTest = false;
  bead.position.set(0.36, 0.82, 0.05);
  return bead;
}

/**
 * Tiny kraft PAPER clasp on the card face. PAPER_EDGE brown box —
 * not grey metal. Offset from the bead (0.36, 0.82, 0.05), clip,
 * string, pin, tab, stud, and rivet. Sprite-local so it stays a clasp
 * on the kraft card.
 */
export function makeNametagClasp() {
  const clasp = paperBox(0.04, 0.03, 0.025, PAPER_EDGE);
  clasp.name = "paper-nametag-clasp";
  clasp.userData.part = "clasp";
  clasp.userData.mode = "PAPER";
  clasp.castShadow = false;
  clasp.receiveShadow = false;
  clasp.frustumCulled = false;
  clasp.renderOrder = 4;
  clasp.material.depthTest = false;
  clasp.position.set(0.0, 0.88, 0.05);
  return clasp;
}

/**
 * Tiny kraft PAPER loop on the card face. HAIR brown box —
 * not grey metal. Offset from the clasp (0.0, 0.88, 0.05), clip,
 * string, pin, tab, stud, rivet, and bead. Sprite-local so it stays a
 * loop on the kraft card.
 */
export function makeNametagLoop() {
  const loop = paperBox(0.035, 0.04, 0.022, HAIR);
  loop.name = "paper-nametag-loop";
  loop.userData.part = "loop";
  loop.userData.mode = "PAPER";
  loop.castShadow = false;
  loop.receiveShadow = false;
  loop.frustumCulled = false;
  loop.renderOrder = 4;
  loop.material.depthTest = false;
  loop.position.set(0.18, 1.10, 0.05);
  return loop;
}

/** Tracked letters so PAPER reads as a stamp even without canvas letterSpacing. */
function fillSpaced(ctx, text, x, y, tracking) {
  const chars = String(text).split("");
  const widths = chars.map((c) => ctx.measureText(c).width);
  let total = 0;
  for (let i = 0; i < widths.length; i++) total += widths[i];
  total += tracking * Math.max(0, chars.length - 1);
  let cx = x - total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cx + widths[i] / 2, y);
    cx += widths[i] + tracking;
  }
}

/**
 * Tiny folded kraft triangle in the top-right of the card. Canvas only —
 * PAPER_EDGE face + INK crease. Not a 3D mesh.
 */
function drawFoldedCorner(ctx, w) {
  if (!NAMETAG_FOLD) return;
  const s = 26;
  ctx.save();
  ctx.fillStyle = PAPER_EDGE;
  ctx.beginPath();
  ctx.moveTo(w - s, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w - s, 0);
  ctx.lineTo(w, s);
  ctx.stroke();
  ctx.restore();
}

/**
 * Tiny kraft punch-hole / string grommet at the top-centre of the card.
 * Canvas only — PAPER_EDGE washer + INK hole. Not a 3D mesh.
 */
function drawPunchHole(ctx, w) {
  if (!NAMETAG_HOLE) return;
  const cx = w / 2;
  const cy = 16;
  ctx.save();
  ctx.fillStyle = PAPER_EDGE;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Kraft rubber stamp: dashed box + tracked PAPER. Same ink family as the
 * ferry ticket. Sits under the name so brown name ink stays readable.
 */
function drawPaperStamp(ctx, cx, cy) {
  const bw = 196;
  const bh = 40;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.11);
  ctx.strokeStyle = STAMP;
  ctx.lineWidth = 3.5;
  ctx.setLineDash([8, 5]);
  ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
  ctx.setLineDash([]);
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-bw / 2 + 5, -bh / 2 + 5, bw - 10, bh - 10);
  ctx.fillStyle = STAMP;
  ctx.font = "700 22px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fillSpaced(ctx, "PAPER", 0, 1, 7);
  ctx.restore();
}

/** Paint kraft card: face, edge, folded corner, punch-hole, name, PAPER stamp. */
export function paintPaperNametagCard(ctx, w, h, name) {
  ctx.fillStyle = PAPER_FACE;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = PAPER_EDGE;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  drawFoldedCorner(ctx, w);
  drawPunchHole(ctx, w);

  ctx.fillStyle = INK;
  ctx.font = "600 44px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(name || "PAPER"), w / 2, 48);

  drawPaperStamp(ctx, w / 2, h - 36);
}

/** Simple canvas card: name in ink, PAPER stamp, folded kraft corner, punch-hole. */
export function makePaperNametag(name) {
  if (typeof document === "undefined") return null;
  const w = 512;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  paintPaperNametagCard(ctx, w, h, name);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.name = "paper-nametag";
  sprite.scale.set(CARD_W_M, CARD_H_M, 1);
  sprite.position.y = LABEL_Y;
  sprite.center.set(0.5, 0);
  sprite.frustumCulled = false;
  sprite.renderOrder = 3;
  sprite.userData.mode = "PAPER";
  sprite.userData.kind = "nametag";
  sprite.userData.paperName = name;
  if (NAMETAG_CLIP) sprite.add(makeNametagClip());
  if (NAMETAG_STRING) sprite.add(makeNametagString());
  if (NAMETAG_PIN) sprite.add(makeNametagPin());
  if (NAMETAG_TAB) sprite.add(makeNametagTab());
  if (NAMETAG_STUD) sprite.add(makeNametagStud());
  if (NAMETAG_RIVET) sprite.add(makeNametagRivet());
  if (NAMETAG_BEAD) sprite.add(makeNametagBead());
  if (NAMETAG_CLASP) sprite.add(makeNametagClasp());
  if (NAMETAG_LOOP) sprite.add(makeNametagLoop());
  return sprite;
}

function makePaperWalker(name, shirt) {
  const g = new THREE.Group();
  g.name = "paper-walker";
  g.userData.kind = "npc";
  g.userData.mode = "PAPER";
  g.userData.paperName = name;

  const leftShoe = paperBox(0.16, 0.07, 0.24, SHOES);
  leftShoe.position.set(-0.1, 0.04, 0.03);
  const rightShoe = paperBox(0.16, 0.07, 0.24, SHOES);
  rightShoe.position.set(0.1, 0.04, 0.03);

  const leftLeg = paperBox(0.14, 0.62, 0.16, PANTS);
  leftLeg.position.set(-0.1, 0.38, 0);
  const rightLeg = paperBox(0.14, 0.62, 0.16, PANTS);
  rightLeg.position.set(0.1, 0.38, 0);

  const body = paperBox(0.4, 0.52, 0.24, shirt);
  body.position.set(0, 0.96, 0);

  const leftArm = paperBox(0.1, 0.48, 0.1, shirt);
  leftArm.position.set(-0.28, 0.94, 0);
  const rightArm = paperBox(0.1, 0.48, 0.1, shirt);
  rightArm.position.set(0.28, 0.94, 0);

  const head = paperBox(0.26, 0.28, 0.24, SKIN);
  head.position.set(0, 1.4, 0.01);
  const hair = paperBox(0.28, 0.1, 0.26, HAIR);
  hair.position.set(0, 1.56, 0);

  g.add(leftShoe, rightShoe, leftLeg, rightLeg, body, leftArm, rightArm, head, hair);
  const tag = makePaperNametag(name);
  if (tag) g.add(tag);
  return g;
}

function placeDockWalkers({ scene, specOf, heightAt }) {
  const spec = specOf("north");
  const toward = spec.id === "north" ? 1 : -1;
  const { x, z } = spec.port;
  const slots = [
    { name: WALKER_NAMES[0], dx: 7.5, dz: toward * 14 },
    { name: WALKER_NAMES[1], dx: -4.5, dz: toward * 22 },
    { name: WALKER_NAMES[2], dx: 13, dz: toward * -5 },
  ];
  const people = [];
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const wx = x + s.dx;
    const wz = z + s.dz;
    const y = heightAt(spec, wx, wz);
    const walker = makePaperWalker(s.name, SHIRTS[i]);
    walker.position.set(wx, y, wz);
    walker.rotation.y = toward > 0 ? Math.PI : 0;
    walker.userData.homeX = wx;
    walker.userData.homeZ = wz;
    walker.userData.pace = 0.35 + i * 0.12;
    walker.userData.span = 2.4 + i * 0.4;
    if (scene) scene.add(walker);
    people.push(walker);
  }
  return people;
}

function nametagOf(mesh) {
  if (!mesh || !mesh.children) return null;
  return mesh.children.find((c) => c.userData && c.userData.kind === "nametag") || null;
}

/**
 * Parent a PAPER canvas sprite above each NPC mesh. Nearby only.
 * Accepts Object3Ds or `{ mesh }` walker records from pedestrians.js.
 */
export function dressPaperNametags(people, { getPlayer } = {}) {
  const list = people || [];
  for (const person of list) {
    const mesh = meshOf(person);
    if (!mesh || nametagOf(mesh)) continue;
    const name =
      (mesh.userData && (mesh.userData.paperName || mesh.userData.name)) ||
      person.paperName ||
      person.name ||
      "PAPER";
    const tag = makePaperNametag(name);
    if (tag) {
      const s = mesh.scale.x || 1;
      if (s > 1.05) {
        tag.scale.set(8.8 / s, 2.2 / s, 1);
        tag.position.y = 2.2;
      }
      tag.visible = true;
      mesh.add(tag);
    }
  }
  return {
    tick() {
      const pos = playerPos(getPlayer);
      for (const person of list) {
        const mesh = meshOf(person);
        const tag = nametagOf(mesh);
        if (!tag) continue;
        if (!pos) {
          tag.visible = true;
          continue;
        }
        mesh.getWorldPosition(_world);
        const d = Math.hypot(_world.x - pos.x, _world.z - pos.z);
        tag.visible = d < NAMETAG_NEAR_M;
      }
    },
  };
}

/**
 * Three north-quay walkers with PAPER nametags. Hook from pedestrians.js.
 */
export function attachOutdoorNametags(map, helpers) {
  const people =
    helpers && helpers.people && helpers.people.length
      ? helpers.people
      : placeDockWalkers(helpers || {});
  const tags = dressPaperNametags(people, helpers || {});
  let t = 0;
  return {
    people,
    tick(dt) {
      t += dt || 0;
      tags.tick();
      for (const person of people) {
        const mesh = meshOf(person);
        if (!mesh) continue;
        const span = mesh.userData.span || 2.2;
        const pace = mesh.userData.pace || 0.4;
        const homeZ = mesh.userData.homeZ;
        if (homeZ == null) continue;
        mesh.position.z = homeZ + Math.sin(t * pace) * span;
      }
    },
  };
}
