import * as THREE from "three";
import { projectOnPolyline } from "./taxi.js";

const CAR_COUNT = 6;
const SPEED = 9;
const Y_LIFT = 0.45;
/** Metres from the port along the spline. Spawn must see cars here. */
export const SPAWN_SPAN_M = 160;

export function polylineLength(points) {
  let acc = 0;
  for (let i = 0; i < points.length - 1; i++) {
    acc += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z);
  }
  return acc;
}

/** Point and yaw (atan2 dx,dz) at distance along a polyline. Loops. */
export function pointAlongPolyline(points, dist) {
  const total = polylineLength(points);
  if (!points || points.length < 2 || total < 1) return { x: 0, z: 0, yaw: 0, total: 0 };
  let d = ((dist % total) + total) % total;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (d <= len || i === points.length - 2) {
      const t = len < 1e-6 ? 0 : Math.min(1, d / len);
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        yaw: Math.atan2(b.x - a.x, b.z - a.z),
        total,
      };
    }
    d -= len;
  }
  const last = points[points.length - 1];
  return { x: last.x, z: last.z, yaw: 0, total };
}

function part(mesh, name) {
  mesh.userData.part = name;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  return mesh;
}

/** Sedan: painted body, glass cabin, bumpers, kraft lamps, chrome side mirrors, four wheels with kraft hub boxes. No debug masts. */
function makeCar(color) {
  const g = new THREE.Group();
  g.frustumCulled = false;

  const paint = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.22 });
  const glass = new THREE.MeshLambertMaterial({
    color: 0x7ec8e0,
    emissive: 0x1a4050,
    emissiveIntensity: 0.18,
    transparent: true,
    opacity: 0.72,
  });
  const chrome = new THREE.MeshLambertMaterial({ color: 0xc5c8cc });
  const rubber = new THREE.MeshLambertMaterial({ color: 0x1c1c20 });
  /** Cottage kraft cream — reads as lamps on every body paint, including plaster. */
  const kraft = new THREE.MeshLambertMaterial({
    color: 0xf4ead8,
    emissive: 0xf4ead8,
    emissiveIntensity: 0.28,
  });
  /** Original brick — dark PAPER tails, not neon red. */
  const brick = new THREE.MeshLambertMaterial({ color: 0x6e2e22 });

  const body = part(new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.72, 4.2), paint), "body");
  body.position.y = 0.7;
  g.add(body);

  const cabin = part(new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.58, 1.88), paint), "cabin");
  cabin.position.set(0, 1.26, -0.2);
  g.add(cabin);

  const wind = part(new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.42, 0.08), glass), "glass");
  wind.position.set(0, 1.28, 0.72);
  g.add(wind);

  const rearGlass = part(new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.42, 0.08), glass), "glass");
  rearGlass.position.set(0, 1.28, -1.12);
  g.add(rearGlass);

  for (const x of [-0.97, 0.97]) {
    const side = part(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 1.55), glass), "glass");
    side.position.set(x, 1.28, -0.2);
    g.add(side);
  }

  const frontBump = part(new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.28, 0.24), chrome), "bumper");
  frontBump.position.set(0, 0.48, 2.18);
  g.add(frontBump);

  const rearBump = part(new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.28, 0.24), chrome), "bumper");
  rearBump.position.set(0, 0.48, -2.18);
  g.add(rearBump);

  for (const x of [-0.68, 0.68]) {
    const head = part(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.1), kraft), "headlight");
    head.position.set(x, 0.72, 2.16);
    g.add(head);
    const tail = part(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.08), brick), "taillight");
    tail.position.set(x, 0.72, -2.16);
    g.add(tail);
  }

  /** PAPER side mirrors — chrome housing, glass face, A-pillar, two boxes named mirror. */
  for (const x of [-1.16, 1.16]) {
    const housing = part(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.22), chrome), "mirror");
    housing.position.set(x, 1.18, 0.52);
    g.add(housing);
    const outward = x > 0 ? 1 : -1;
    const face = part(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.16), glass), "glass");
    face.position.set(x + outward * 0.1, 1.18, 0.52);
    g.add(face);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  /** Small kraft cream box on the outer face — reads as a hub, not a black slab. */
  const hubGeo = new THREE.BoxGeometry(0.08, 0.24, 0.24);
  const kraftHub = new THREE.MeshLambertMaterial({ color: 0xf4ead8 });
  for (const [x, z] of [
    [1.05, 1.28],
    [-1.05, 1.28],
    [1.05, -1.28],
    [-1.05, -1.28],
  ]) {
    const wheel = part(new THREE.Mesh(wheelGeo, rubber), "wheel");
    wheel.position.set(x, 0.34, z);
    g.add(wheel);
    const outward = x > 0 ? 1 : -1;
    const hub = part(new THREE.Mesh(hubGeo, kraftHub), "hub");
    hub.position.set(x + outward * 0.16, 0.34, z);
    g.add(hub);
  }

  g.userData.kind = "traffic";
  return g;
}

/**
 * Original harbour paint — stall terracotta, slate, field, plaster, teal, brick.
 * Not one cream clone. Taxi yellow (0xf0c430) stays on the cab.
 */
export const COLORS = [0xc45c3a, 0x4a6e8a, 0x6a8f44, 0xe8d7b8, 0x2a7a72, 0x6e2e22];

/**
 * PAPER NPC cars that loop the paved spline. They never leave `kind === "paved"`.
 * Start packed near the port so spawn actually sees them.
 */
export function createTraffic({ scene, getMap, specOf, heightAt, getPlayer, getIslandId }) {
  const cars = [];

  function paved(islandId) {
    const map = getMap();
    if (!map) return null;
    return map.roads.find((r) => r.kind === "paved" && r.island === islandId) || null;
  }

  function place(car) {
    const road = paved(car.islandId);
    if (!road) return;
    const p = pointAlongPolyline(road.points, car.along);
    const spec = specOf(car.islandId);
    const y = heightAt(spec, p.x, p.z);
    car.mesh.position.set(p.x, y + Y_LIFT, p.z);
    car.mesh.rotation.y = p.yaw;
  }

  function spawnIsland(islandId) {
    const road = paved(islandId);
    if (!road || road.points.length < 2) return;
    const span = Math.min(SPAWN_SPAN_M, polylineLength(road.points) * 0.25);
    for (let i = 0; i < CAR_COUNT; i++) {
      const mesh = makeCar(COLORS[i % COLORS.length]);
      const along = 40 + (i / Math.max(1, CAR_COUNT - 1)) * span;
      const dir = i % 2 === 0 ? 1 : -1;
      const car = {
        mesh,
        islandId,
        along,
        dir,
        speed: SPEED * (0.85 + (i % 3) * 0.1),
        slot: i,
        phase: 0,
      };
      cars.push(car);
      scene.add(mesh);
      place(car);
    }
  }

  spawnIsland("north");
  spawnIsland("south");

  function tick(dt) {
    const player = getPlayer ? getPlayer() : null;
    const here = getIslandId ? getIslandId() : null;
    for (const car of cars) {
      const road = paved(car.islandId);
      if (!road) continue;
      if (player && here === car.islandId) {
        const hit = projectOnPolyline(road.points, player.position.x, player.position.z);
        car.phase += car.speed * dt;
        car.along = hit.along + 28 + car.slot * 18 + (car.phase % 12);
      } else {
        car.along += car.speed * car.dir * dt;
      }
      place(car);
    }
  }

  return { cars, tick, place };
}
