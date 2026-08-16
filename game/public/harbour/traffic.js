import * as THREE from "three";

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

function makeCar(color) {
  const g = new THREE.Group();
  g.frustumCulled = false;
  const mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 7.2), mat);
  body.position.y = 1.0;
  body.castShadow = true;
  body.frustumCulled = false;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 1.1, 3.2),
    new THREE.MeshLambertMaterial({ color: 0x1a2430, emissive: 0x1a2430, emissiveIntensity: 0.2 }),
  );
  cabin.position.set(0, 2.0, -0.3);
  cabin.frustumCulled = false;
  g.add(cabin);
  const mast = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 10, 0.35),
    new THREE.MeshLambertMaterial({ color: 0xff2a1a, emissive: 0xff2a1a, emissiveIntensity: 0.5 }),
  );
  mast.position.y = 6.5;
  mast.frustumCulled = false;
  g.add(mast);
  g.userData.kind = "traffic";
  return g;
}

const COLORS = [0xff2a1a, 0x1a6dff, 0xffe14a, 0xffffff, 0xff2a1a, 0x1a6dff];

/**
 * PAPER NPC cars that loop the paved spline. They never leave `kind === "paved"`.
 * Start packed near the port so spawn actually sees them.
 */
export function createTraffic({ scene, getMap, specOf, heightAt }) {
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
      };
      cars.push(car);
      scene.add(mesh);
      place(car);
    }
  }

  spawnIsland("north");
  spawnIsland("south");

  function tick(dt) {
    for (const car of cars) {
      car.along += car.speed * car.dir * dt;
      place(car);
    }
  }

  return { cars, tick, place };
}
