import * as THREE from "three";
import { HIGHWAY_LANE_OFFSET_M, ROAD_DRIVE_LIFT_M } from "./roads.js";
import { laneOffsetM } from "./roadclass.js";
import { drivableEdges, edgeLength, projectOnEdge } from "./roadnet.js";

const CAR_COUNT = 6;
const SPEED = 9;
const Y_LIFT = ROAD_DRIVE_LIFT_M;
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

/** Sedan: painted body, glass cabin, bumpers, kraft lamps, chrome side mirrors, four wheels with kraft hub boxes, short kraft roof aerial, two kraft PAPER wipers, one kraft spare-tyre bolt, one kraft PAPER running board. No debug masts. */
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

  /** Short kraft roof aerial — thin PAPER box on the cabin, like the taxi. Under 0.4 m. */
  const aerialH = 0.32;
  const aerial = part(new THREE.Mesh(new THREE.BoxGeometry(0.04, aerialH, 0.04), kraft), "aerial");
  aerial.position.set(0, 1.55 + aerialH / 2, -0.85);
  g.add(aerial);

  const wind = part(new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.42, 0.08), glass), "glass");
  wind.position.set(0, 1.28, 0.72);
  g.add(wind);

  /** Two thin kraft PAPER wipers on the windscreen — parked blades, not chrome. Same 0xf4ead8 as the aerial. */
  for (const x of [-0.38, 0.38]) {
    const wiper = part(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.04), kraft), "wiper");
    wiper.position.set(x, 1.1, 0.78);
    g.add(wiper);
  }

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

  /** Small kraft cream plate on the rear bumper — reads as a car, not a toy brick. */
  const plate = part(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.04), kraft), "plate");
  plate.position.set(0, 0.62, -2.2);
  g.add(plate);

  /** Tiny kraft PAPER spare-tyre bolt on the boot — hubs already exist, so this is the mount. Same 0xf4ead8. */
  const bolt = part(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), kraft), "bolt");
  bolt.position.set(0, 1.1, -1.62);
  g.add(bolt);

  /** Tiny kraft PAPER running board on one flank. Spare is a bolt, not a spare part, so this is board. Offset from aerial and wipers. Same 0xf4ead8. */
  const runningBoard = part(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.42), kraft), "board");
  runningBoard.position.set(1.14, 0.4, 0);
  g.add(runningBoard);

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

/** Metres. Opposing cars keep their own side of the carriageway. */
export const LANE_OFFSET_M = 1.7;

/**
 * PAPER NPC cars that drive the paved graph. At a junction they pick the next
 * edge — they do not ping-pong on one road. No player-following.
 */
export function createTraffic({ scene, getMap, specOf, heightAt }) {
  const cars = [];

  function graphOf() {
    const map = getMap();
    return map && map.graph ? map.graph : null;
  }

  function edgesOf(islandId) {
    const graph = graphOf();
    const fromGraph = graph ? drivableEdges(graph, islandId) : [];
    if (fromGraph.length) return fromGraph;
    const map = getMap();
    return ((map && map.roads) || [])
      .filter((r) => r.kind === "paved" && !r.roundabout && r.island === islandId && r.points && r.points.length >= 2)
      .map((r, i) => ({
        ...r,
        id: r.id || `${islandId}-road-${i}`,
        a: `${islandId}-a-${i}`,
        b: `${islandId}-b-${i}`,
      }));
  }

  function edgeOf(car) {
    return edgesOf(car.islandId).find((e) => e.id === car.edgeId) || null;
  }

  function place(car) {
    const edge = edgeOf(car);
    if (!edge || !edge.points) return;
    const p = pointAlongPolyline(edge.points, car.along);
    const spec = specOf(car.islandId);
    const graphOff = edge.cls ? laneOffsetM(edge.cls) : 0;
    const off = graphOff || (edge.lanes === 4 ? HIGHWAY_LANE_OFFSET_M : LANE_OFFSET_M);
    const rx = Math.cos(p.yaw) * off * car.dir;
    const rz = -Math.sin(p.yaw) * off * car.dir;
    const x = p.x + rx;
    const z = p.z + rz;
    const y = heightAt(spec, x, z);
    car.mesh.position.set(x, y + Y_LIFT, z);
    car.mesh.rotation.y = car.dir > 0 ? p.yaw : p.yaw + Math.PI;
  }

  function pickNext(car, atB) {
    const edge = edgeOf(car);
    if (!edge) return;
    const nodeId = atB ? edge.b : edge.a;
    if (!nodeId) {
      car.dir *= -1;
      return;
    }
    const choices = edgesOf(car.islandId).filter(
      (e) => e.id !== edge.id && (e.a === nodeId || e.b === nodeId),
    );
    if (!choices.length) {
      car.dir *= -1;
      return;
    }
    const next = choices[Math.floor(Math.random() * choices.length)];
    car.edgeId = next.id;
    if (next.a === nodeId) {
      car.along = 4;
      car.dir = 1;
    } else {
      car.along = Math.max(4, edgeLength(next) - 4);
      car.dir = -1;
    }
  }

  function spawnIsland(islandId) {
    const spec = specOf(islandId);
    const edges = edgesOf(islandId);
    if (!edges.length) return;
    const port = spec.port;
    const ranked = edges
      .map((e) => ({ e, p: projectOnEdge(e, port.x, port.z) }))
      .sort((a, b) => a.p.dist - b.p.dist);
    const near = ranked.slice(0, Math.min(4, ranked.length));
    for (let i = 0; i < CAR_COUNT; i++) {
      const pick = i < CAR_COUNT - 2 ? near[0] : near[Math.min(1 + (i % Math.max(1, near.length - 1)), near.length - 1)];
      const total = edgeLength(pick.e);
      const span = Math.min(SPAWN_SPAN_M, total * 0.35);
      const along = Math.max(8, Math.min(total - 8, pick.p.along + 12 + (i / Math.max(1, CAR_COUNT - 1)) * span));
      const mesh = makeCar(COLORS[i % COLORS.length]);
      const car = {
        mesh,
        islandId,
        edgeId: pick.e.id,
        roadIdx: pick.e.id === near[0].e.id ? 0 : 1,
        along,
        dir: i % 2 === 0 ? 1 : -1,
        speed: SPEED * (0.8 + (i % 4) * 0.12),
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
    for (const car of cars) {
      const edge = edgeOf(car);
      if (!edge) continue;
      const total = edgeLength(edge);
      car.along += car.speed * car.dir * dt;
      if (car.along >= total - 4) {
        car.along = total - 4;
        pickNext(car, true);
      } else if (car.along <= 4) {
        car.along = 4;
        pickNext(car, false);
      }
      place(car);
    }
  }

  return { cars, tick, place };
}
