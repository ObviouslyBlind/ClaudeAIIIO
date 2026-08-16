import * as THREE from "three";

const CAR_COUNT = 5;
const SPEED = 16;
const Y_LIFT = 0.35;

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
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.55, 3.1),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 0.45;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.42, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x3a4a52 }),
  );
  cabin.position.set(0, 0.88, -0.15);
  g.add(cabin);
  g.userData.kind = "traffic";
  return g;
}

const COLORS = [0xc45c3a, 0x4a6a78, 0xe8d7b8, 0x3d5a3c, 0x5a3a22];

/**
 * PAPER NPC cars that loop the paved spline. They never leave `kind === "paved"`.
 */
export function createTraffic({ scene, getMap, specOf, heightAt }) {
  const cars = [];

  function paved(islandId) {
    const map = getMap();
    if (!map) return null;
    return map.roads.find((r) => r.kind === "paved" && r.island === islandId) || null;
  }

  function spawnIsland(islandId) {
    const road = paved(islandId);
    if (!road || road.points.length < 2) return;
    const total = polylineLength(road.points);
    for (let i = 0; i < CAR_COUNT; i++) {
      const mesh = makeCar(COLORS[i % COLORS.length]);
      const along = (i / CAR_COUNT) * total;
      const dir = islandId === "north" ? 1 : -1;
      cars.push({ mesh, islandId, along, dir, speed: SPEED * (0.75 + (i % 3) * 0.12) });
      scene.add(mesh);
    }
  }

  spawnIsland("north");
  spawnIsland("south");

  function tick(dt) {
    for (const car of cars) {
      const road = paved(car.islandId);
      if (!road) continue;
      car.along += car.speed * car.dir * dt;
      const p = pointAlongPolyline(road.points, car.along);
      const spec = specOf(car.islandId);
      const y = heightAt(spec, p.x, p.z);
      car.mesh.position.set(p.x, y + Y_LIFT, p.z);
      car.mesh.rotation.y = p.yaw;
    }
  }

  return { cars, tick };
}
