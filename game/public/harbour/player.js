import * as THREE from "three";
import { attachPlayerTag } from "./player-tag.js";

/** Warm PAPER craft — readable body, shirt, head. */
const SKIN = 0xf2d2a8;
const SHIRT = 0x2f7a8a;
const BODY = 0xc45c12;
const PANTS = 0x3d4a38;
const HAIR = 0x3d2a1c;
const SHOES = 0x4a3220;

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

function limb(name, w, h, d, color, hipY, x) {
  const g = new THREE.Group();
  g.name = name;
  g.userData.part = name;
  g.position.set(x, hipY, 0);
  const mesh = paperBox(w, h, d, color);
  mesh.position.set(0, -h / 2, 0);
  mesh.userData.part = name;
  g.add(mesh);
  return g;
}

/**
 * Simple PAPER walker: coloured body, little shirt, head, swinging limbs.
 * `player` stays the same THREE.Mesh: position / rotation are the walk+camera
 * contract. Do not move player.position here.
 *
 * Figure y = 0 at soles. Group is at (0, -1.15, 0) on the player so
 * world feet = player.y - 1.15. Crown ≈ 1.78 m.
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

  const leftShoe = paperBox(0.16, 0.08, 0.26, SHOES);
  leftShoe.position.set(-0.12, 0.04, 0.03);
  leftShoe.userData.part = "shoe";
  const rightShoe = paperBox(0.16, 0.08, 0.26, SHOES);
  rightShoe.position.set(0.12, 0.04, 0.03);
  rightShoe.userData.part = "shoe";

  const leftLeg = limb("left-leg", 0.16, 0.72, 0.18, PANTS, 0.82, -0.12);
  const rightLeg = limb("right-leg", 0.16, 0.72, 0.18, PANTS, 0.82, 0.12);
  leftLeg.userData.part = "leg";
  rightLeg.userData.part = "leg";

  const body = paperBox(0.42, 0.38, 0.26, BODY);
  body.position.set(0, 1.0, 0);
  body.userData.part = "body";

  const shirt = paperBox(0.46, 0.36, 0.3, SHIRT);
  shirt.position.set(0, 1.32, 0);
  shirt.userData.part = "shirt";

  const leftArm = limb("left-arm", 0.12, 0.52, 0.12, SHIRT, 1.48, -0.3);
  const rightArm = limb("right-arm", 0.12, 0.52, 0.12, SHIRT, 1.48, 0.3);
  leftArm.userData.part = "arm";
  rightArm.userData.part = "arm";

  const head = paperBox(0.3, 0.3, 0.26, SKIN);
  head.position.set(0, 1.64, 0.01);
  head.userData.part = "head";

  const hair = paperBox(0.32, 0.1, 0.28, HAIR);
  hair.position.set(0, 1.8, 0);
  hair.userData.part = "hair";

  figure.add(leftShoe, rightShoe, leftLeg, rightLeg, body, shirt, leftArm, rightArm, head, hair);
  player.add(figure);
  attachPlayerTag(player);
}

/** Swing legs and arms while walking. Idle pose when still. */
export function stepPlayerWalk(player, t, walking) {
  const figure = player && player.getObjectByName && player.getObjectByName("paper-figure");
  if (!figure) return;
  const leftLeg = figure.getObjectByName("left-leg");
  const rightLeg = figure.getObjectByName("right-leg");
  const leftArm = figure.getObjectByName("left-arm");
  const rightArm = figure.getObjectByName("right-arm");
  const swing = walking ? Math.sin(t * 9) : 0;
  const amp = walking ? 0.7 : 0;
  if (leftLeg) leftLeg.rotation.x = swing * amp;
  if (rightLeg) rightLeg.rotation.x = -swing * amp;
  if (leftArm) leftArm.rotation.x = -swing * amp * 0.75;
  if (rightArm) rightArm.rotation.x = swing * amp * 0.75;
  figure.position.y = SOLE_Y + (walking ? Math.abs(swing) * 0.04 : 0);
}
