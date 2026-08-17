import * as THREE from "three";

/**
 * Billboard "You · PAPER" above the player figure.
 * Kraft card + brown ink + dashed PAPER rubber-stamp.
 * Same outdoor walker-card recipe. Camera-facing THREE.Sprite.
 * Not a HUD, not a CoD plate, not Capital Rift UI.
 */

export const LABEL = "You · PAPER";
const NAME = "You";
const LABEL_Y = 2.12;
/** World metres. Same kraft card as outdoor walker nametags. */
const CARD_W_M = 2.4;
const CARD_H_M = 0.6;
const PAPER_FACE = "#efe4c8";
const PAPER_EDGE = "#8a6238";
const INK = "#3d2a1c";
const STAMP = "#7a2e22";
/** Canvas-card fold is on. Not a 3D mesh. Same recipe as outdoor nametags. */
export const PLAYER_TAG_FOLD = true;

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
 * PAPER_EDGE face + INK crease. Same recipe as outdoor nametags. Not a 3D mesh.
 */
function drawFoldedCorner(ctx, w) {
  if (!PLAYER_TAG_FOLD) return;
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
 * Kraft rubber stamp: dashed box + tracked PAPER. Same ink family as the
 * outdoor walker cards. Sits under "You" so brown name ink stays readable.
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

/** Paint kraft card: face, edge, folded corner, name, PAPER stamp. */
export function paintPlayerTagCard(ctx, w, h) {
  ctx.fillStyle = PAPER_FACE;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = PAPER_EDGE;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  drawFoldedCorner(ctx, w);

  ctx.fillStyle = INK;
  ctx.font = "600 44px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(NAME, w / 2, 48);

  drawPaperStamp(ctx, w / 2, h - 36);
}

export function makePlayerTag() {
  if (typeof document === "undefined") return null;
  const w = 512;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  paintPlayerTagCard(ctx, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.name = "paper-player-tag";
  sprite.scale.set(CARD_W_M, CARD_H_M, 1);
  sprite.position.y = LABEL_Y;
  sprite.center.set(0.5, 0);
  sprite.frustumCulled = false;
  sprite.renderOrder = 3;
  sprite.userData.mode = "PAPER";
  sprite.userData.kind = "player-tag";
  sprite.userData.paperName = LABEL;
  return sprite;
}

/**
 * Parent the tag on the paper figure (soles at y=0) so it sits above the crown.
 * No-op in Node (no document). Idempotent.
 */
export function attachPlayerTag(player) {
  if (!player) return null;
  const host =
    (player.getObjectByName && player.getObjectByName("paper-figure")) || player;
  const existing =
    host.getObjectByName && host.getObjectByName("paper-player-tag");
  if (existing) return existing;
  const tag = makePlayerTag();
  if (!tag) return null;
  host.add(tag);
  return tag;
}
