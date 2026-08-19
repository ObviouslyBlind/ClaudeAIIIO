import * as THREE from "three";
import { attachPlayerTag } from "./player-tag.js";
import { PLAYER_SOLE_M } from "./walk-plan.js";
import { clampLook, defaultLook, skinHex, wearHex } from "./look.js";

const SHOES = 0x4a3220;
const HAIR_COLOUR = 0x3d2a1c;

/**
 * Metres from player.position down to the soles.
 * Spawn / walk set y = landHeight + PLAYER_SOLE_M. Camera uses that
 * same point. The figure hangs below it so feet sit on the ground.
 */
const SOLE_Y = -PLAYER_SOLE_M;

function paperBox(w, h, d, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function limb(name, w, h, d, color, hipY, x, shoe) {
  const g = new THREE.Group();
  g.name = name;
  g.userData.part = name;
  g.position.set(x, hipY, 0);
  const mesh = paperBox(w, h, d, color);
  mesh.position.set(0, -h / 2, 0);
  mesh.userData.part = name.indexOf("leg") >= 0 ? "leg" : "arm";
  g.add(mesh);
  if (shoe) {
    shoe.position.set(0, -h + 0.04, 0.05);
    g.add(shoe);
  }
  return g;
}

function addHair(figure, style, skin) {
  if (style === "bald") return;
  const hairCol = HAIR_COLOUR;
  if (style === "bun") {
    const cap = paperBox(0.32, 0.08, 0.28, hairCol);
    cap.position.set(0, 1.78, 0);
    cap.userData.part = "hair";
    const bun = paperBox(0.16, 0.14, 0.16, hairCol);
    bun.position.set(0, 1.86, -0.12);
    bun.userData.part = "hair";
    figure.add(cap, bun);
    return;
  }
  if (style === "fade") {
    const fade = paperBox(0.3, 0.06, 0.26, hairCol);
    fade.position.set(0, 1.76, 0);
    fade.userData.part = "hair";
    figure.add(fade);
    return;
  }
  if (style === "locs") {
    const cap = paperBox(0.32, 0.08, 0.28, hairCol);
    cap.position.set(0, 1.78, 0);
    cap.userData.part = "hair";
    figure.add(cap);
    for (const x of [-0.1, 0, 0.1]) {
      const loc = paperBox(0.05, 0.22, 0.05, hairCol);
      loc.position.set(x, 1.66, -0.12);
      loc.userData.part = "hair";
      figure.add(loc);
    }
    return;
  }
  const hair = paperBox(0.32, 0.1, 0.28, hairCol);
  hair.position.set(0, 1.8, 0);
  hair.userData.part = "hair";
  figure.add(hair);
  void skin;
}

/**
 * Simple PAPER walker: coloured body, little shirt, head, swinging limbs.
 * `player` stays the same THREE.Mesh: position / rotation are the walk+camera
 * contract. Do not move player.position here.
 *
 * Figure y = 0 at soles. Group is at (0, -1.15, 0) on the player so
 * world feet = player.y - 1.15. Crown ≈ 1.78 m.
 */
export function dressPlayer(player, look, opts) {
  const worn = clampLook(look || defaultLook());
  const skin = skinHex(worn.skin);
  const shirtCol = wearHex(worn.shirt);
  const bodyCol = wearHex(worn.jacket);
  const pantsCol = wearHex(worn.pants);
  const solesAtZero = Boolean(opts && opts.solesAtZero);

  player.castShadow = true;
  player.userData.mode = "PAPER";
  player.userData.kind = player.userData.kind || "player";
  player.userData.look = worn;

  if (player.geometry) player.geometry.dispose();
  player.geometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  if (!player.material) player.material = new THREE.MeshLambertMaterial({ color: skin });
  player.material.visible = false;

  while (player.children.length) player.remove(player.children[0]);

  const figure = new THREE.Group();
  figure.name = "paper-figure";
  figure.userData.mode = "PAPER";
  figure.position.y = solesAtZero ? 0 : SOLE_Y;

  const leftShoe = paperBox(0.16, 0.08, 0.26, SHOES);
  leftShoe.userData.part = "shoe";
  const rightShoe = paperBox(0.16, 0.08, 0.26, SHOES);
  rightShoe.userData.part = "shoe";

  const leftLeg = limb("left-leg", 0.16, 0.72, 0.18, pantsCol, 0.82, -0.12, leftShoe);
  const rightLeg = limb("right-leg", 0.16, 0.72, 0.18, pantsCol, 0.82, 0.12, rightShoe);
  leftLeg.userData.part = "leg";
  rightLeg.userData.part = "leg";

  const body = paperBox(0.42, 0.38, 0.26, bodyCol);
  body.position.set(0, 1.0, 0);
  body.userData.part = "body";

  const shirt = paperBox(0.46, 0.36, 0.3, shirtCol);
  shirt.position.set(0, 1.32, 0);
  shirt.userData.part = "shirt";

  const leftArm = limb("left-arm", 0.12, 0.52, 0.12, shirtCol, 1.48, -0.3);
  const rightArm = limb("right-arm", 0.12, 0.52, 0.12, shirtCol, 1.48, 0.3);
  leftArm.userData.part = "arm";
  rightArm.userData.part = "arm";

  const head = paperBox(0.3, 0.3, 0.26, skin);
  head.position.set(0, 1.64, 0.01);
  head.userData.part = "head";

  figure.add(leftLeg, rightLeg, body, shirt, leftArm, rightArm, head);
  addHair(figure, worn.hair, skin);
  player.add(figure);
  if (!solesAtZero) attachPlayerTag(player);
}

/**
 * Swing legs and arms from gait phase (radians from distance), not wall-clock.
 * Idle pose when still.
 */
export function stepPlayerWalk(player, phase, walking) {
  const figure = player && player.getObjectByName && player.getObjectByName("paper-figure");
  if (!figure) return;
  const leftLeg = figure.getObjectByName("left-leg");
  const rightLeg = figure.getObjectByName("right-leg");
  const leftArm = figure.getObjectByName("left-arm");
  const rightArm = figure.getObjectByName("right-arm");
  const swing = walking ? Math.sin(phase) : 0;
  const amp = walking ? 0.62 : 0;
  if (leftLeg) leftLeg.rotation.x = swing * amp;
  if (rightLeg) rightLeg.rotation.x = -swing * amp;
  if (leftArm) leftArm.rotation.x = -swing * amp * 0.8;
  if (rightArm) rightArm.rotation.x = swing * amp * 0.8;
  figure.position.y = SOLE_Y + (walking ? Math.abs(swing) * 0.05 : 0);
}
