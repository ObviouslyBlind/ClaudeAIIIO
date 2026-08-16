import * as THREE from "three";

/**
 * Billboard "You · PAPER" above the player figure.
 * Kraft card + brown ink. Camera-facing THREE.Sprite.
 * Not a HUD, not a CoD plate, not Capital Rift UI.
 */

const LABEL = "You · PAPER";
const LABEL_Y = 2.12;
const PAPER_FACE = "#efe4c8";
const PAPER_EDGE = "#8a6238";
const INK = "#3d2a1c";

export function makePlayerTag() {
  if (typeof document === "undefined") return null;
  const w = 384;
  const h = 96;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = PAPER_FACE;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = PAPER_EDGE;
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, w - 10, h - 10);

  ctx.fillStyle = INK;
  ctx.font = "600 34px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(LABEL, w / 2, h / 2);

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
  sprite.scale.set(1.7, 0.42, 1);
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
