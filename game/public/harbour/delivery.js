import * as THREE from "three";
import { routeTaxi } from "./taxi.js";
import { roadsideDrop, vanAwayPath } from "./roadside.js";

/** Delivery van. Same paved graph as the taxi. PAPER / SIMULATED. */

const SPEED = 28;
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
  const body = box(1.7, 1.35, 3.4, YELLOW);
  body.position.y = 1.05;
  body.userData.part = "body";
  const cabin = box(1.65, 0.7, 1.1, GLASS);
  cabin.position.set(0, 1.55, 1.05);
  cabin.userData.part = "cabin";
  const wheel = (x, z) => {
    const w = box(0.22, 0.44, 0.44, STEEL);
    w.position.set(x, 0.22, z);
    w.userData.part = "wheel";
    return w;
  };
  g.add(body, cabin, wheel(-0.8, 1.1), wheel(0.8, 1.1), wheel(-0.8, -1.1), wheel(0.8, -1.1));
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
        roadsideDrop(map.roads, delivery.island, dest.x, dest.z);
      const curb = drop ? { x: drop.curbX, z: drop.curbZ } : dest;
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
          if (job.leaveAfterDrop) {
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
          } else {
            job.phase = "wait";
          }
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
