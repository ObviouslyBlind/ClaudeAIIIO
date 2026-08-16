import * as THREE from "three";
import { dressPaperNametags } from "./nametags.js";

/** Same warm wood / cloth as player.js, plus original PAPER stall/field cloth. */
const SKIN = 0xf2d2a8;
const SHIRT = 0xf4ead8;
const PANTS = 0x6e4a32;
const HAIR = 0x3d2a1c;
const SHOES = 0x4a3220;
const BELT = 0x7a2e22;

/** Cream kraft first so seed 0 matches the player. Then stall / nametag cloth. */
const SHIRTS = [SHIRT, 0xc45c3a, 0x4a6e8a, 0x6a8f44, 0xe8d7b8, 0x2a7a72];
const PANTS_SET = [PANTS, 0x5c3e2a, 0x7a5238, 0x3d4a38];
const HAIRS = [HAIR, 0x4a3220, 0x5a3a22, 0x8a6a42];
const BELTS = [BELT, 0x4a3220, 0x3d2a1c];
const NAMES = [
  "Quay hand",
  "Ferry clerk",
  "Stall keep",
  "Cart boy",
  "Net mender",
  "Lamp lighter",
  "Crate tally",
  "Tide watcher",
  "Rope splicer",
  "Pilot's runner",
  "Market porter",
  "Wharf cook",
];

/** Phone harbour: a handful, not a crowd. */
export const MAX_PEOPLE = 12;
/** Metres off the paved centreline onto the verge (just past the 7.2 m tarmac). */
export const VERGE_OFFSET_M = 4;
/** Same land cut as trees / street props / walk. */
export const LAND_MIN_M = 0.4;
/** Slow stroll, metres per second. */
export const WALK_SPEED_M_S = 0.85;

const QUAY_ALONG_MIN = -22;
const QUAY_ALONG_MAX = 64;
const VERGE_ALONG_MIN = 10;
const VERGE_ALONG_MAX = 180;

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
 * Low-poly PAPER person. Same box recipe as player.js; origin at the soles
 * so world y = land height puts the feet on the dirt.
 */
export function makePaperPerson(seed = 0) {
  const shirt = SHIRTS[seed % SHIRTS.length];
  const pants = PANTS_SET[seed % PANTS_SET.length];
  const hairCol = HAIRS[seed % HAIRS.length];
  const beltCol = BELTS[seed % BELTS.length];

  const figure = new THREE.Group();
  figure.name = "paper-pedestrian";
  figure.userData.mode = "PAPER";
  figure.userData.kind = "pedestrian";
  figure.userData.paperName = NAMES[seed % NAMES.length];

  const leftShoe = paperBox(0.18, 0.08, 0.28, SHOES);
  leftShoe.position.set(-0.11, 0.04, 0.04);
  leftShoe.userData.part = "shoe";
  const rightShoe = paperBox(0.18, 0.08, 0.28, SHOES);
  rightShoe.position.set(0.11, 0.04, 0.04);
  rightShoe.userData.part = "shoe";

  const leftLeg = paperBox(0.16, 0.74, 0.18, pants);
  leftLeg.position.set(-0.11, 0.45, 0);
  leftLeg.userData.part = "leg";
  const rightLeg = paperBox(0.16, 0.74, 0.18, pants);
  rightLeg.position.set(0.11, 0.45, 0);
  rightLeg.userData.part = "leg";

  const body = paperBox(0.46, 0.6, 0.28, shirt);
  body.position.set(0, 1.12, 0);
  body.userData.part = "body";

  const belt = paperBox(0.48, 0.08, 0.3, beltCol);
  belt.position.set(0, 0.84, 0);
  belt.userData.part = "belt";

  const leftArm = paperBox(0.12, 0.56, 0.12, shirt);
  leftArm.position.set(-0.32, 1.08, 0);
  leftArm.userData.part = "arm";
  const rightArm = paperBox(0.12, 0.56, 0.12, shirt);
  rightArm.position.set(0.32, 1.08, 0);
  rightArm.userData.part = "arm";

  const head = paperBox(0.3, 0.32, 0.28, SKIN);
  head.position.set(0, 1.62, 0.01);
  head.userData.part = "head";

  const hair = paperBox(0.32, 0.12, 0.3, hairCol);
  hair.position.set(0, 1.8, 0);
  hair.userData.part = "hair";

  figure.add(leftShoe, rightShoe, leftLeg, rightLeg, body, belt, leftArm, rightArm, head, hair);
  figure.userData.legs = [leftLeg, rightLeg];
  return figure;
}

function polylineLength(points) {
  let n = 0;
  for (let i = 1; i < points.length; i++) {
    n += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  }
  return n;
}

function pointAlong(points, dist) {
  if (!points || points.length < 2) return null;
  let acc = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (acc + len >= dist) {
      const t = (dist - acc) / (len || 1);
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        qx: b.x,
        qz: b.z,
        yaw: Math.atan2(b.x - a.x, b.z - a.z),
      };
    }
    acc += len;
  }
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return {
    x: last.x,
    z: last.z,
    qx: last.x,
    qz: last.z,
    yaw: Math.atan2(last.x - prev.x, last.z - prev.z),
  };
}

function offsetFromCentreline(px, pz, qx, qz, side, setbackM) {
  const dx = qx - px;
  const dz = qz - pz;
  const len = Math.hypot(dx, dz) || 1;
  const s = side < 0 ? -1 : 1;
  return {
    x: px + (-dz / len) * s * setbackM,
    z: pz + (dx / len) * s * setbackM,
  };
}

function northPaved(map) {
  return (map?.roads || []).find((r) => r.kind === "paved" && r.island === "north" && r.points?.length > 1) || null;
}

function sampleQuay(spec, heightAt, person, along) {
  const toward = spec.id === "north" ? 1 : -1;
  const x = spec.port.x + person.side * VERGE_OFFSET_M;
  const z = spec.port.z + toward * along;
  const y = heightAt(spec, x, z);
  const yaw = person.dir * toward >= 0 ? 0 : Math.PI;
  return { x, z, y, yaw };
}

function sampleVerge(spec, heightAt, points, person, along) {
  const p = pointAlong(points, along);
  if (!p) return null;
  const at = offsetFromCentreline(p.x, p.z, p.qx, p.qz, person.side, VERGE_OFFSET_M);
  const y = heightAt(spec, at.x, at.z);
  const yaw = person.dir < 0 ? p.yaw + Math.PI : p.yaw;
  return { x: at.x, z: at.z, y, yaw };
}

function samplePerson(spec, heightAt, person, along) {
  if (person.lane === "quay") return sampleQuay(spec, heightAt, person, along);
  return sampleVerge(spec, heightAt, person.points, person, along);
}

function pose(person, at) {
  person.mesh.position.set(at.x, at.y, at.z);
  person.mesh.rotation.y = at.yaw;
  const legs = person.mesh.userData.legs;
  if (legs) {
    const swing = Math.sin(person.along * 2.4) * 0.22;
    legs[0].rotation.x = swing;
    legs[1].rotation.x = -swing;
  }
}

function onLand(at) {
  return at && at.y > LAND_MIN_M;
}

function hookNametags(meshes, helpers) {
  if (typeof document === "undefined") return null;
  try {
    return dressPaperNametags(meshes, helpers);
  } catch {
    return null;
  }
}

/**
 * A few PAPER pedestrians on the north quay and the paved verge so spawn
 * is not empty of people. helpers: { scene, specOf, heightAt, getPlayer }.
 * tick(dt) strolls them. Never writes the player mesh.
 * Nametags (browser only) stay in nametags.js.
 */
export function makePedestrians(map, helpers) {
  const { scene, specOf, heightAt } = helpers;
  const spec = specOf("north");
  const paved = northPaved(map);
  const pavedLen = paved ? polylineLength(paved.points) : 0;

  const root = new THREE.Group();
  root.name = "pedestrians";
  root.userData.kind = "pedestrians";
  root.userData.mode = "PAPER";

  const people = [];

  function spawn(lane, along, side, minAlong, maxAlong, points, seed) {
    if (people.length >= MAX_PEOPLE) return;
    const person = {
      lane,
      island: "north",
      along,
      side,
      dir: seed % 2 === 0 ? 1 : -1,
      speed: WALK_SPEED_M_S * (0.85 + (seed % 3) * 0.12),
      minAlong,
      maxAlong,
      points,
      mesh: makePaperPerson(seed),
    };
    person.mesh.userData.lane = lane;
    const at = samplePerson(spec, heightAt, person, along);
    if (!onLand(at)) return;
    pose(person, at);
    root.add(person.mesh);
    people.push(person);
  }

  const quayAlong = [-18, -6, 8, 22, 40];
  for (let i = 0; i < quayAlong.length; i++) {
    spawn("quay", quayAlong[i], i % 2 === 0 ? -1 : 1, QUAY_ALONG_MIN, QUAY_ALONG_MAX, null, i);
  }

  if (paved && pavedLen > VERGE_ALONG_MIN + 20) {
    const maxAlong = Math.min(VERGE_ALONG_MAX, pavedLen * 0.2);
    const vergeAlong = [16, 40, 64, 88, 112, 136, 160];
    for (let i = 0; i < vergeAlong.length; i++) {
      const along = vergeAlong[i];
      if (along > maxAlong) continue;
      spawn("verge", along, i % 2 === 0 ? 1 : -1, VERGE_ALONG_MIN, maxAlong, paved.points, i + 5);
    }
  }

  root.userData.count = people.length;
  scene.add(root);

  const tags = hookNametags(
    people.map((p) => p.mesh),
    helpers,
  );

  function tick(dt) {
    const step = Number.isFinite(dt) ? dt : 0;
    if (step !== 0) {
      for (const person of people) {
        let along = person.along + person.dir * person.speed * step;
        if (along < person.minAlong || along > person.maxAlong) {
          person.dir *= -1;
          along = person.along + person.dir * person.speed * step;
        }
        along = Math.max(person.minAlong, Math.min(person.maxAlong, along));
        const at = samplePerson(spec, heightAt, person, along);
        if (!onLand(at)) {
          person.dir *= -1;
          continue;
        }
        person.along = along;
        pose(person, at);
      }
    }
    if (tags) tags.tick();
  }

  return { tick, people, root };
}
