import * as THREE from "three";

/**
 * Outdoor PAPER name labels. Canvas sprites on THREE.Sprite (camera billboard).
 * Kraft card + brown ink. Not a HUD, not a CoD plate, not Capital Rift UI.
 */

const NEAR_M = 26;
const LABEL_Y = 2.12;
const PAPER_FACE = "#efe4c8";
const PAPER_EDGE = "#8a6238";
const INK = "#3d2a1c";
const STAMP = "#7a2e22";

const SKIN = 0xf2d2a8;
const PANTS = 0x6e4a32;
const HAIR = 0x3d2a1c;
const SHOES = 0x4a3220;

const WALKER_NAMES = ["Ferry clerk", "Quay hand", "Stall keep"];
const SHIRTS = [0xc45c3a, 0x4a6e8a, 0x6a8f44];

function playerPos(getPlayer) {
  if (!getPlayer) return null;
  const p = getPlayer();
  if (!p) return null;
  return p.position ? p.position : p;
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

/** Simple canvas card: name in ink, PAPER stamp. */
export function makePaperNametag(name) {
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
  ctx.fillText(String(name || "PAPER"), w / 2, h / 2 - 8);

  ctx.fillStyle = STAMP;
  ctx.font = "600 15px Georgia, 'Times New Roman', serif";
  ctx.fillText("PAPER", w / 2, h - 20);

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
  sprite.name = "paper-nametag";
  sprite.scale.set(1.7, 0.42, 1);
  sprite.position.y = LABEL_Y;
  sprite.center.set(0.5, 0);
  sprite.frustumCulled = false;
  sprite.renderOrder = 3;
  sprite.userData.mode = "PAPER";
  sprite.userData.kind = "nametag";
  sprite.userData.paperName = name;
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
  g.add(makePaperNametag(name));
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

function nametagOf(person) {
  return person.children.find((c) => c.userData && c.userData.kind === "nametag");
}

/**
 * Parent a PAPER canvas sprite above each NPC mesh. Nearby only.
 */
export function dressPaperNametags(people, { getPlayer } = {}) {
  const list = people || [];
  for (const person of list) {
    if (nametagOf(person)) continue;
    const name = person.userData.paperName || person.userData.name || "PAPER";
    person.add(makePaperNametag(name));
  }
  return {
    tick() {
      const pos = playerPos(getPlayer);
      for (const person of list) {
        const tag = nametagOf(person);
        if (!tag) continue;
        if (!pos) {
          tag.visible = true;
          continue;
        }
        const d = Math.hypot(person.position.x - pos.x, person.position.z - pos.z);
        tag.visible = d < NEAR_M;
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
        const span = person.userData.span || 2.2;
        const pace = person.userData.pace || 0.4;
        const homeZ = person.userData.homeZ;
        if (homeZ == null) continue;
        person.position.z = homeZ + Math.sin(t * pace) * span;
      }
    },
  };
}
