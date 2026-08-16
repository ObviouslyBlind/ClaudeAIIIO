import * as THREE from "three";
import { attachPlayerTag } from "./player-tag.js";

/** Warm PAPER craft — same family as cottage walls / kraft roofs. */
const SKIN = 0xf2d2a8;
const SHIRT = 0xf4ead8;
const PANTS = 0x6e4a32;
const HAIR = 0x3d2a1c;
const SHOES = 0x4a3220;
const BELT = 0x7a2e22;
/** Quay tarp / cart canvas — original kraft tan, reads against the cream shirt. */
const KRAFT = 0xc4b496;
/** Crate wood / nametag edge — original strap, not a new hex. */
const STRAP = 0x8a6238;

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
 *   buckle  y 0.81–0.87   (0, 0.84, 0.17)       0.10×0.06×0.04   kraft
 *   body    y 0.82–1.42   (0, 1.12, 0)          0.46×0.60×0.28
 *   arms    y 0.80–1.36   (±0.32, 1.08, 0)      0.12×0.56×0.12
 *   cuffs   y 0.79–0.85   (±0.32, 0.82, 0)      0.14×0.06×0.14   kraft, wrists
 *   head    y 1.46–1.78   (0, 1.62, 0.01)       0.30×0.32×0.28
 *   hair    y 1.74–1.86   (0, 1.80, 0)          0.32×0.12×0.30
 *   brim    y 1.84–1.88   (0, 1.86, 0)          0.52×0.04×0.52   kraft
 *   hat     y 1.88–1.98   (0, 1.93, 0)          0.28×0.10×0.28   cream
 *   visor   y 1.84–1.87   (0, 1.855, 0.32)      0.30×0.03×0.16   kraft, forward
 *   pocket  y 1.13–1.25   (−0.10, 1.19, 0.16)   0.12×0.12×0.04   kraft, shirt
 *   button  y 1.28–1.32   (0.08, 1.30, 0.155)   0.04×0.04×0.03   kraft, shirt
 *   satchel y 0.64–0.92   (0.38, 0.78, 0.08)    0.18×0.28×0.14   kraft
 *   flap    y 0.88–0.96   (0.38, 0.92, 0.09)    0.18×0.08×0.16   kraft
 *   strap   y 0.92–1.40   (0.05, 1.14, 0.16)    0.04×0.82×0.02   cross-body
 *
 * Hat crown ≈ 1.98 m. Eyes ≈ 1.62 m local → world y ≈ player.y + 0.47.
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

  // Thin kraft pocket on the cream shirt front. Same tan as the visor / satchel.
  const pocket = paperBox(0.12, 0.12, 0.04, KRAFT);
  pocket.position.set(-0.1, 1.19, 0.16);
  pocket.userData.part = "pocket";

  // Tiny kraft shirt button on the cream chest. Not the pocket, buckle, or strap.
  const button = paperBox(0.04, 0.04, 0.03, KRAFT);
  button.position.set(0.08, 1.3, 0.155);
  button.userData.part = "button";

  const belt = paperBox(0.48, 0.08, 0.3, BELT);
  belt.position.set(0, 0.84, 0);
  belt.userData.part = "belt";

  // Tiny kraft buckle on the belt face. Same tan as the satchel / hat brim.
  const buckle = paperBox(0.1, 0.06, 0.04, KRAFT);
  buckle.position.set(0, 0.84, 0.17);
  buckle.userData.part = "buckle";

  const leftArm = paperBox(0.12, 0.56, 0.12, SHIRT);
  leftArm.position.set(-0.32, 1.08, 0);
  leftArm.userData.part = "arm";
  const rightArm = paperBox(0.12, 0.56, 0.12, SHIRT);
  rightArm.position.set(0.32, 1.08, 0);
  rightArm.userData.part = "arm";

  // Thin kraft shirt cuffs at each wrist (arm ends). Same tan as the pocket.
  const leftCuff = paperBox(0.14, 0.06, 0.14, KRAFT);
  leftCuff.position.set(-0.32, 0.82, 0);
  leftCuff.userData.part = "cuff";
  const rightCuff = paperBox(0.14, 0.06, 0.14, KRAFT);
  rightCuff.position.set(0.32, 0.82, 0);
  rightCuff.userData.part = "cuff";

  const head = paperBox(0.3, 0.32, 0.28, SKIN);
  head.position.set(0, 1.62, 0.01);
  head.userData.part = "head";

  const hair = paperBox(0.32, 0.12, 0.3, HAIR);
  hair.position.set(0, 1.8, 0);
  hair.userData.part = "hair";

  // Small kraft satchel on the right hip so spawn reads a market walker, not a
  // blank capsule. Strap crosses the chest; do not move player.position.
  const satchel = paperBox(0.18, 0.28, 0.14, KRAFT);
  satchel.position.set(0.38, 0.78, 0.08);
  satchel.userData.part = "satchel";
  const flap = paperBox(0.18, 0.08, 0.16, KRAFT);
  flap.position.set(0.38, 0.92, 0.09);
  flap.userData.part = "flap";
  const strap = paperBox(0.04, 0.82, 0.02, STRAP);
  strap.position.set(0.05, 1.14, 0.16);
  strap.rotation.z = -Math.atan2(0.7, 0.44);
  strap.userData.part = "strap";

  // Kraft straw hat — same brim + short crown as the quay walkers. Brim uses
  // this file's kraft tan (0xc4a574 is not here); crown is the cream shirt.
  const brim = paperBox(0.52, 0.04, 0.52, KRAFT);
  brim.position.set(0, 1.86, 0);
  brim.userData.part = "hat";
  const crown = paperBox(0.28, 0.1, 0.28, SHIRT);
  crown.position.set(0, 1.93, 0);
  crown.userData.part = "hat";
  // Thin kraft visor — a short brim box sticking forward of the straw hat.
  const visor = paperBox(0.3, 0.03, 0.16, KRAFT);
  visor.position.set(0, 1.855, 0.32);
  visor.userData.part = "visor";

  figure.add(
    leftShoe,
    rightShoe,
    leftLeg,
    rightLeg,
    body,
    pocket,
    button,
    belt,
    buckle,
    leftArm,
    rightArm,
    leftCuff,
    rightCuff,
    head,
    hair,
    brim,
    crown,
    visor,
    satchel,
    flap,
    strap,
  );
  player.add(figure);
  attachPlayerTag(player);
}
