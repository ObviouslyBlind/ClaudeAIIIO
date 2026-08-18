import * as THREE from "three";
import { routeTaxi } from "./taxi.js";
import { roadsideDrop, vanAwayPath } from "./roadside.js";

/** Delivery van. Same paved graph as the taxi. PAPER / SIMULATED. */

const SPEED = 22;
const YELLOW = 0xe2c04a;
const STEEL = 0x3a4046;
const GLASS = 0x7ec8e0;

function box(w, h, d, color) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
}

export function makeVan() {
  const g = new THREE.Group();
  g.name = "delivery-van";
  g.userData.kind = "van";
  g.userData.label = "delivery van";
  g.userData.layer = "logistics";
  g.userData.mode = "PAPER";
  const body = box(2.8, 2.05, 5.4, YELLOW);
  body.position.y = 1.48;
  body.userData.part = "body";
  const cabin = box(2.7, 1.0, 1.55, GLASS);
  cabin.position.set(0, 2.28, 1.65);
  cabin.userData.part = "cabin";
  const wheel = (x, z) => {
    const w = box(0.26, 0.52, 0.52, STEEL);
    w.position.set(x, 0.26, z);
    w.userData.part = "wheel";
    return w;
  };
  g.add(body, cabin, wheel(-1.0, 1.45), wheel(1.0, 1.45), wheel(-1.0, -1.45), wheel(1.0, -1.45));
  return g;
}

export function createDeliveries({ scene, getMap, specOf, heightAt, onDrop }) {
  const vans = new Map();

  function tickOne(job, dt) {
    const { mesh, path, i } = job;
    if (i >= path.length) return true;
    const target = path[i];
    const y = heightAt(specOf(job.island), mesh.position.x, mesh.position.z) + 0.02;
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
      const route = routeTaxi(map, delivery.island, from.x, from.z, curb.x, curb.z);
      const path = (route && route.points) || [{ x: curb.x, z: curb.z }];
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
        leaveAfterDrop: false,
      });
    },
    tick(dt) {
      for (const [id, job] of vans) {
        if (job.phase === "wait") continue;
        const done = tickOne(job, dt);
        if (!done) continue;
        if (job.phase === "in") {
          if (onDrop) onDrop(job.delivery, job.drop);
          job.phase = "out";
          job.path = vanAwayPath(
            job.drop || {
              curbX: job.mesh.position.x,
              curbZ: job.mesh.position.z,
              awayX: job.mesh.position.x,
              awayZ: job.mesh.position.z,
            },
          );
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
    /** Leave only after the crate is taken. */
    release(id) {
      const job = vans.get(id);
      if (!job) return;
      if (job.phase === "wait") {
        job.phase = "out";
        job.path = vanAwayPath(
          job.drop || {
            curbX: job.mesh.position.x,
            curbZ: job.mesh.position.z,
            awayX: job.mesh.position.x,
            awayZ: job.mesh.position.z,
          },
        );
        job.i = 0;
        return;
      }
      job.leaveAfterDrop = true;
    },
  };
}
