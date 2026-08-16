import * as THREE from "three";
import { attachPlayerTag } from "./player-tag.js";

/** Warm PAPER craft — same family as cottage walls / kraft roofs. */
const SKIN = 0xf2d2a8;
const SHIRT = 0xf4ead8;
const PANTS = 0x6e4a32;
const HAIR = 0x3d2a1c;
const SHOES = 0x4a3220;
const BELT = 0x7a2e22;

/**
 * Metres from player.position down to the soles.
 * Spawn / walk set y = landHeight + 1.15 (old capsule centre). Camera uses that
 * same point. The figure hangs below it so feet sit on the ground.
 */
const SOLE_Y = -1.15;

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
 * Replace the spawn capsule with a PAPER person (body + head + legs).
 * `player` stays the same THREE.Mesh: position / rotation are the walk+camera
 * contract. Do not move player.position here.
 *
 * Figure layout, metres, y = 0 at soles (group origin). Group is at (0, -1.15, 0)
 * on the player so world feet = player.y - 1.15:
 *
 *   shoes   y 0.00–0.08   (±0.11, 0.04, 0.04)   0.18×0.08×0.28
 *   legs    y 0.08–0.82   (±0.11, 0.45, 0)      0.16×0.74×0.18
 *   belt    y 0.80–0.88   (0, 0.84, 0)          0.48×0.08×0.30
 *   body    y 0.82–1.42   (0, 1.12, 0)          0.46×0.60×0.28
 *   arms    y 0.80–1.36   (±0.32, 1.08, 0)      0.12×0.56×0.12
 *   head    y 1.46–1.78   (0, 1.62, 0.01)       0.30×0.32×0.28
 *   hair    y 1.74–1.86   (0, 1.80, 0)          0.32×0.12×0.30
 *
 * Crown ≈ 1.86 m. Eyes ≈ 1.62 m local → world y ≈ player.y + 0.47.
 */
export function dressPlayer(player) {
  player.castShadow = true;
  player.userData.mode = "PAPER";
  player.userData.kind = "player";

  if (player.geometry) player.geometry.dispose();
  player.geometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  if (!player.material) player.material = new THREE.MeshLambertMaterial({ color: SKIN });
  player.material.visible = false;

  while (player.children.length) player.remove(player.children[0]);

  const figure = new THREE.Group();
  figure.name = "paper-figure";
  figure.userData.mode = "PAPER";
  figure.position.y = SOLE_Y;

  const leftShoe = paperBox(0.18, 0.08, 0.28, SHOES);
  leftShoe.position.set(-0.11, 0.04, 0.04);
  leftShoe.userData.part = "shoe";
  const rightShoe = paperBox(0.18, 0.08, 0.28, SHOES);
  rightShoe.position.set(0.11, 0.04, 0.04);
  rightShoe.userData.part = "shoe";

  const leftLeg = paperBox(0.16, 0.74, 0.18, PANTS);
  leftLeg.position.set(-0.11, 0.45, 0);
  leftLeg.userData.part = "leg";
  const rightLeg = paperBox(0.16, 0.74, 0.18, PANTS);
  rightLeg.position.set(0.11, 0.45, 0);
  rightLeg.userData.part = "leg";

  const body = paperBox(0.46, 0.6, 0.28, SHIRT);
  body.position.set(0, 1.12, 0);
  body.userData.part = "body";

  const belt = paperBox(0.48, 0.08, 0.3, BELT);
  belt.position.set(0, 0.84, 0);
  belt.userData.part = "belt";

  const leftArm = paperBox(0.12, 0.56, 0.12, SHIRT);
  leftArm.position.set(-0.32, 1.08, 0);
  leftArm.userData.part = "arm";
  const rightArm = paperBox(0.12, 0.56, 0.12, SHIRT);
  rightArm.position.set(0.32, 1.08, 0);
  rightArm.userData.part = "arm";

  const head = paperBox(0.3, 0.32, 0.28, SKIN);
  head.position.set(0, 1.62, 0.01);
  head.userData.part = "head";

  const hair = paperBox(0.32, 0.12, 0.3, HAIR);
  hair.position.set(0, 1.8, 0);
  hair.userData.part = "hair";

  figure.add(leftShoe, rightShoe, leftLeg, rightLeg, body, belt, leftArm, rightArm, head, hair);
  player.add(figure);
  attachPlayerTag(player);
}
