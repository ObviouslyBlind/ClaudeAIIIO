import * as THREE from "three";
import { routeTaxi } from "./taxi.js";
import { roadsideDrop } from "./roadside.js";

/** Delivery van. Same paved graph as the taxi. PAPER / SIMULATED. */

const SPEED = 18;
const YELLOW = 0xe2c04a;
const CAB = 0xf0c430;
const STEEL = 0x3a4046;
const GLASS = 0x7ec8e0;
const KRAFT = 0xf4ead8;
const HEAD = 0xfff4d2;
const TAIL = 0xc42a22;

function box(w, h, d, color, emissive) {
  const mat = new THREE.MeshLambertMaterial({
    color,
    ...(emissive ? { emissive: color, emissiveIntensity: 0.2 } : {}),
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = true;
  return mesh;
}

function tag(mesh, name) {
  mesh.userData.part = name;
  return mesh;
}

export function makeVan() {
  const g = new THREE.Group();
  g.name = "delivery-van";
  g.userData.kind = "van";
  g.userData.label = "delivery van";
  g.userData.layer = "logistics";
  g.userData.mode = "PAPER";

  const cargo = tag(box(3.35, 2.55, 5.2, YELLOW, true), "body");
  cargo.position.set(0, 1.72, -0.55);
  const cab = tag(box(3.2, 1.55, 2.15, CAB, true), "cabin");
  cab.position.set(0, 1.95, 2.45);
  const nose = tag(box(3.25, 1.15, 0.55, CAB, true), "body");
  nose.position.set(0, 1.05, 3.45);
  const wind = tag(box(2.9, 0.85, 0.12, GLASS), "glass");
  wind.position.set(0, 2.15, 3.52);
  const bumper = tag(box(3.4, 0.32, 0.28, STEEL), "bumper");
  bumper.position.set(0, 0.52, 3.7);
  const rearBump = tag(box(3.4, 0.32, 0.28, STEEL), "bumper");
  rearBump.position.set(0, 0.52, -3.2);
  const plate = tag(box(0.7, 0.18, 0.05, KRAFT, true), "plate");
  plate.position.set(0, 0.72, -3.34);
  const seam = tag(box(0.08, 2.2, 0.06, STEEL), "door");
  seam.position.set(0, 1.7, -3.16);

  g.add(cargo, cab, nose, wind, bumper, rearBump, plate, seam);
  for (const x of [-1.45, 1.45]) {
    const glass = tag(box(0.08, 0.7, 1.4, GLASS), "glass");
    glass.position.set(x, 2.15, 2.4);
    g.add(glass);
    const mirror = tag(box(0.08, 0.18, 0.22, STEEL), "mirror");
    mirror.position.set(x * 1.08, 1.85, 3.15);
    g.add(mirror);
  }
  for (const x of [-1.15, 1.15]) {
    const hl = tag(box(0.42, 0.22, 0.12, HEAD, true), "lamp");
    hl.position.set(x, 0.85, 3.74);
    const tl = tag(box(0.38, 0.18, 0.1, TAIL, true), "lamp");
    tl.position.set(x, 0.9, -3.36);
    g.add(hl, tl);
  }
  const wheel = (x, z) => {
    const w = tag(box(0.32, 0.64, 0.64, STEEL), "wheel");
    w.position.set(x, 0.32, z);
    return w;
  };
  g.add(wheel(-1.35, 2.2), wheel(1.35, 2.2), wheel(-1.35, -1.85), wheel(1.35, -1.85));
  return g;
}

function densify(points, step = 5) {
  if (!points || points.length < 2) return points || [];
  const out = [{ x: points[0].x, z: points[0].z }];
  for (let i = 1; i < points.length; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return out;
}

function drivePath(map, island, from, to) {
  if (!from || !to || !Number.isFinite(to.x) || !Number.isFinite(to.z)) return [];
  const route = map ? routeTaxi(map, island, from.x, from.z, to.x, to.z) : null;
  const pts = (route && route.points) || [from, to];
  return densify(pts);
}

export function createDeliveries({ scene, getMap, specOf, heightAt, onDrop }) {
  const vans = new Map();

  function tickOne(job, dt) {
    const { mesh, path, i } = job;
    if (i >= path.length) return true;
    const target = path[i];
    const y = heightAt(specOf(job.island), mesh.position.x, mesh.position.z);
    const dx = target.x - mesh.position.x;
    const dz = target.z - mesh.position.z;
    const dist = Math.hypot(dx, dz);
    const step = SPEED * dt;
    if (dist <= step) {
      mesh.position.set(target.x, y, target.z);
      job.i += 1;
    } else {
      mesh.position.x += (dx / dist) * step;
      mesh.position.z += (dz / dist) * step;
      mesh.position.y = y;
      mesh.rotation.y = Math.atan2(dx, dz);
    }
    return false;
  }

  return {
    start(delivery, dest) {
      if (!delivery || vans.has(delivery.id)) return;
      const map = getMap();
      const spec = specOf(delivery.island);
      const from = spec.port;
      const drop =
        delivery.drop ||
        (dest && Number.isFinite(dest.curbX)
          ? dest
          : dest && Number.isFinite(dest.x)
            ? roadsideDrop(map.roads, delivery.island, dest.x, dest.z)
            : null);
      const curb = drop ? { x: drop.curbX, z: drop.curbZ } : dest;
      if (!curb || !Number.isFinite(curb.x) || !Number.isFinite(curb.z)) return;
      const path = drivePath(map, delivery.island, from, curb);
      if (!path.length) return;
      const mesh = makeVan();
      mesh.userData.deliveryId = delivery.id;
      mesh.userData.island = delivery.island;
      mesh.position.set(from.x, heightAt(spec, from.x, from.z), from.z);
      scene.add(mesh);
      vans.set(delivery.id, {
        mesh,
        path,
        i: 0,
        island: delivery.island,
        delivery,
        drop,
        phase: "in",
      });
    },
    tick(dt) {
      for (const [id, job] of vans) {
        const done = tickOne(job, dt);
        if (!done) continue;
        if (job.phase === "in") {
          if (onDrop) onDrop(job.delivery, job.drop);
          const map = getMap();
          const here = { x: job.mesh.position.x, z: job.mesh.position.z };
          const away = job.drop
            ? { x: job.drop.awayX, z: job.drop.awayZ }
            : { x: here.x + 40, z: here.z };
          const out = drivePath(map, job.island, here, away);
          job.phase = "out";
          job.path = out.length >= 2 ? out : [here, away];
          job.i = 0;
          continue;
        }
        scene.remove(job.mesh);
        vans.delete(id);
      }
    },
    clickables() {
      return [...vans.values()].map((job) => job.mesh);
    },
    release(id) {
      const job = vans.get(id);
      if (!job || job.phase === "out") return;
      const map = getMap();
      const here = { x: job.mesh.position.x, z: job.mesh.position.z };
      const away = job.drop ? { x: job.drop.awayX, z: job.drop.awayZ } : { x: here.x + 40, z: here.z };
      job.phase = "out";
      job.path = drivePath(map, job.island, here, away);
      job.i = 0;
    },
  };
}
