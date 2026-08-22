import * as THREE from "three";

/**
 * Dollhouse kit — constructed Lambert furniture, cart.js language.
 * Sized for 6 × 5 × 3.2 m rooms. Not grey cubes. Not glTF. Not interior.js.
 * PAPER / SIMULATED.
 */

const WOOD = 0x6a4a2a;
const CREAM = 0xf4ead8;
const STEEL = 0x8a9096;
const WHITE = 0xe8ece8;
const LINEN = 0xe4d8c4;
const GLASS = 0x8ec8d8;
const CHROME = 0xc5c8cc;
const DARK = 0x2a2e32;
const BRASS = 0xd4b07a;
const GREEN = 0x2f8f4e;
const FRUIT = 0xc45c12;
const MELON = 0x1f6b3a;
const FRY = 0xd4a017;
const TILE = 0xb8c4c8;

function lambert(color, extra) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

function box(w, h, d, color, x, y, z, extra) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color, extra));
  mesh.position.set(x || 0, y, z || 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cyl(rTop, rBot, h, color, x, y, z, segs) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBot, h, segs || 8),
    lambert(color),
  );
  mesh.position.set(x || 0, y, z || 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** World metres. Origin of each mesh is the floor under the piece. */
export const KIT_FOOTPRINT = {
  shelf: { w: 1.7, d: 0.42, h: 1.72 },
  fridge: { w: 0.78, d: 0.7, h: 1.82 },
  till: { w: 0.92, d: 0.62, h: 1.12 },
  bed: { w: 2.0, d: 1.12, h: 0.72 },
  shower: { w: 0.92, d: 0.92, h: 2.1 },
  sink: { w: 0.62, d: 0.48, h: 0.95 },
  desk: { w: 1.5, d: 0.72, h: 0.86 },
  cabinet: { w: 0.82, d: 0.42, h: 1.18 },
};

function makeShelf() {
  const g = new THREE.Group();
  g.add(box(1.7, 0.06, 0.4, WOOD, 0, 0.08, 0));
  g.add(box(1.7, 0.04, 0.38, WOOD, 0, 0.58, 0));
  g.add(box(1.7, 0.04, 0.38, WOOD, 0, 1.08, 0));
  g.add(box(1.7, 0.05, 0.4, WOOD, 0, 1.62, 0));
  g.add(box(0.06, 1.7, 0.4, WOOD, -0.82, 0.88, 0));
  g.add(box(0.06, 1.7, 0.4, WOOD, 0.82, 0.88, 0));
  g.add(box(1.62, 1.62, 0.04, 0x3a2a18, 0, 0.9, -0.18));
  const jars = [
    { x: -0.5, y: 0.22, c: FRUIT },
    { x: -0.18, y: 0.22, c: MELON },
    { x: 0.16, y: 0.22, c: FRY },
    { x: 0.48, y: 0.22, c: GREEN },
    { x: -0.42, y: 0.72, c: 0x8a3030 },
    { x: 0.0, y: 0.72, c: 0x2a6b8a },
    { x: 0.4, y: 0.72, c: FRUIT },
    { x: -0.28, y: 1.22, c: CREAM },
    { x: 0.22, y: 1.22, c: MELON },
  ];
  for (const j of jars) {
    g.add(cyl(0.07, 0.08, 0.22, j.c, j.x, j.y, 0.06, 6));
  }
  return g;
}

function makeFridge() {
  const g = new THREE.Group();
  g.add(box(0.74, 1.78, 0.66, WHITE, 0, 0.91, 0));
  g.add(box(0.62, 1.12, 0.04, GLASS, 0, 0.72, 0.34, { transparent: true, opacity: 0.55 }));
  g.add(box(0.62, 0.38, 0.04, 0xd0d4d2, 0, 1.52, 0.34));
  g.add(box(0.04, 1.18, 0.04, CHROME, 0.3, 0.78, 0.36));
  g.add(box(0.7, 0.04, 0.64, STEEL, 0, 0.04, 0));
  g.add(box(0.22, 0.08, 0.08, DARK, 0, 1.72, 0.28));
  return g;
}

function makeTill() {
  const g = new THREE.Group();
  g.add(box(0.9, 0.78, 0.58, WOOD, 0, 0.43, 0));
  g.add(box(0.92, 0.05, 0.6, CREAM, 0, 0.84, 0));
  g.add(box(0.34, 0.16, 0.28, DARK, 0.12, 0.95, 0.04));
  g.add(box(0.22, 0.12, 0.04, 0x3dcc6a, 0.12, 1.1, 0.14));
  g.add(box(0.28, 0.08, 0.22, STEEL, -0.22, 0.91, 0.08));
  g.add(cyl(0.04, 0.04, 0.18, CHROME, -0.28, 1.02, -0.12, 6));
  return g;
}

function makeBed() {
  const g = new THREE.Group();
  g.add(box(2.0, 0.22, 1.12, WOOD, 0, 0.2, 0));
  g.add(box(1.88, 0.14, 1.02, LINEN, 0, 0.38, 0.02));
  g.add(box(1.84, 0.08, 0.98, CREAM, 0, 0.48, 0.02));
  g.add(box(1.96, 0.62, 0.08, WOOD, 0, 0.52, -0.52));
  g.add(box(0.38, 0.14, 0.32, CREAM, -0.42, 0.58, -0.28));
  g.add(box(0.38, 0.14, 0.32, CREAM, 0.42, 0.58, -0.28));
  g.add(box(0.08, 0.28, 0.08, WOOD, -0.9, 0.14, 0.46));
  g.add(box(0.08, 0.28, 0.08, WOOD, 0.9, 0.14, 0.46));
  g.add(box(0.08, 0.28, 0.08, WOOD, -0.9, 0.14, -0.46));
  g.add(box(0.08, 0.28, 0.08, WOOD, 0.9, 0.14, -0.46));
  return g;
}

function makeShower() {
  const g = new THREE.Group();
  g.add(box(0.9, 0.08, 0.9, TILE, 0, 0.04, 0));
  g.add(box(0.9, 2.0, 0.05, WHITE, 0, 1.08, -0.42));
  g.add(box(0.05, 2.0, 0.86, WHITE, -0.42, 1.08, 0));
  g.add(box(0.05, 2.0, 0.86, WHITE, 0.42, 1.08, 0));
  g.add(box(0.82, 1.7, 0.03, GLASS, 0, 0.98, 0.42, { transparent: true, opacity: 0.38 }));
  g.add(cyl(0.03, 0.03, 1.55, CHROME, 0.28, 1.0, -0.32, 6));
  g.add(cyl(0.09, 0.06, 0.05, CHROME, 0.28, 1.82, -0.22, 8));
  g.add(box(0.12, 0.04, 0.08, BRASS, 0.18, 1.08, -0.36));
  return g;
}

function makeSink() {
  const g = new THREE.Group();
  g.add(cyl(0.12, 0.16, 0.62, WHITE, 0, 0.35, 0, 10));
  g.add(box(0.58, 0.08, 0.42, WHITE, 0, 0.7, 0));
  g.add(box(0.42, 0.1, 0.28, 0xd8e4e8, 0, 0.78, 0.02, { transparent: true, opacity: 0.65 }));
  g.add(cyl(0.025, 0.025, 0.22, CHROME, 0, 0.9, -0.12, 6));
  g.add(box(0.1, 0.04, 0.08, CHROME, 0, 1.02, -0.04));
  g.add(box(0.06, 0.04, 0.06, BRASS, -0.12, 0.76, -0.14));
  g.add(box(0.06, 0.04, 0.06, BRASS, 0.12, 0.76, -0.14));
  return g;
}

function makeDesk() {
  const g = new THREE.Group();
  g.add(box(1.48, 0.06, 0.7, WOOD, 0, 0.74, 0));
  g.add(box(0.07, 0.7, 0.07, WOOD, -0.66, 0.36, 0.28));
  g.add(box(0.07, 0.7, 0.07, WOOD, 0.66, 0.36, 0.28));
  g.add(box(0.07, 0.7, 0.07, WOOD, -0.66, 0.36, -0.28));
  g.add(box(0.07, 0.7, 0.07, WOOD, 0.66, 0.36, -0.28));
  g.add(box(0.36, 0.28, 0.5, WOOD, 0.46, 0.28, 0));
  g.add(box(0.32, 0.02, 0.46, DARK, 0.46, 0.38, 0));
  g.add(box(0.28, 0.02, 0.36, CREAM, -0.18, 0.79, 0.04));
  g.add(cyl(0.02, 0.02, 0.28, STEEL, -0.52, 0.9, -0.18, 6));
  g.add(cyl(0.08, 0.1, 0.04, FRY, -0.52, 1.06, -0.18, 8));
  return g;
}

function makeCabinet() {
  const g = new THREE.Group();
  g.add(box(0.8, 1.14, 0.4, STEEL, 0, 0.59, 0));
  g.add(box(0.72, 0.22, 0.04, DARK, 0, 0.28, 0.2));
  g.add(box(0.72, 0.22, 0.04, DARK, 0, 0.56, 0.2));
  g.add(box(0.72, 0.22, 0.04, DARK, 0, 0.84, 0.2));
  g.add(box(0.08, 0.04, 0.04, BRASS, 0.28, 0.28, 0.23));
  g.add(box(0.08, 0.04, 0.04, BRASS, 0.28, 0.56, 0.23));
  g.add(box(0.08, 0.04, 0.04, BRASS, 0.28, 0.84, 0.23));
  g.add(box(0.76, 0.04, 0.38, 0x6a7278, 0, 1.16, 0));
  return g;
}

const MAKERS = {
  shelf: makeShelf,
  fridge: makeFridge,
  till: makeTill,
  bed: makeBed,
  shower: makeShower,
  sink: makeSink,
  desk: makeDesk,
  cabinet: makeCabinet,
};

export function createKitMesh(id) {
  const make = MAKERS[id] || makeCabinet;
  const g = make();
  g.name = "unit-kit-mesh-" + id;
  g.userData.kitId = id;
  g.userData.kind = "unit-kit";
  return g;
}
