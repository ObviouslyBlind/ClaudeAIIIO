import * as THREE from "three";

/**
 * Small-prop dressing (PAPER / SIMULATED): bushes, roadside rocks, port
 * barrels, and a bench at every taxi stop. Instanced — one draw call per
 * prop kind — and every seed is rejected if it lands on a parcel, a road,
 * or water, so props never clip the things that matter.
 */

export const BUSHES_PER_ISLAND = 110;
export const ROCKS_PER_ISLAND = 34;
export const BARRELS_PER_PORT = 10;
/** Metres a prop keeps clear of any road centreline. */
export const PROP_ROAD_CLEAR_M = 9;

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const zi = ring[i][1];
    const xj = ring[j][0];
    const zj = ring[j][1];
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function distToPolyline(pts, x, z) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len2 = vx * vx + vz * vz || 1;
    let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t)));
  }
  return best;
}

/** True when (x,z) is buildable dressing ground: dry, off-road, off-parcel. */
export function propSpotOk(x, z, { spec, heightAt, plots, roads }) {
  if (heightAt(spec, x, z) < 0.5) return false;
  for (const r of roads) {
    if (r.island !== spec.id || !r.points || r.points.length < 2) continue;
    if (distToPolyline(r.points, x, z) < PROP_ROAD_CLEAR_M) return false;
  }
  for (const p of plots) {
    if (p.island !== spec.id) continue;
    if (pointInRing(x, z, p.ring)) return false;
  }
  return true;
}

/** Deterministic prop layout for one island. Pure — tested headless. */
export function propSeeds(spec, { heightAt, plots, roads, stops }) {
  const rng = mulberry(spec.id === "north" ? 1211 : 3411);
  const ctx = { spec, heightAt, plots, roads };
  const inland = spec.id === "north" ? -1 : 1;
  const bushes = [];
  let guard = 0;
  while (bushes.length < BUSHES_PER_ISLAND && guard++ < BUSHES_PER_ISLAND * 30) {
    const x =
      spec.id === "south" ? spec.cx + (rng() - 0.5) * spec.rx * 1.55 : spec.port.x + (rng() - 0.5) * 1500;
    const z =
      spec.id === "south"
        ? spec.cz + (rng() - 0.5) * spec.rz * 1.55
        : spec.port.z + inland * (30 + rng() * 2600);
    if (!propSpotOk(x, z, ctx)) continue;
    bushes.push({ x, z, s: 0.7 + rng() * 0.9 });
  }
  const rocks = [];
  guard = 0;
  while (rocks.length < ROCKS_PER_ISLAND && guard++ < ROCKS_PER_ISLAND * 30) {
    const x =
      spec.id === "south" ? spec.cx + (rng() - 0.5) * spec.rx * 1.55 : spec.port.x + (rng() - 0.5) * 1900;
    const z =
      spec.id === "south"
        ? spec.cz + (rng() - 0.5) * spec.rz * 1.55
        : spec.port.z + inland * (20 + rng() * 3000);
    if (!propSpotOk(x, z, ctx)) continue;
    rocks.push({ x, z, s: 0.5 + rng() * 1.1 });
  }
  const barrels = [];
  guard = 0;
  while (barrels.length < BARRELS_PER_PORT && guard++ < BARRELS_PER_PORT * 40) {
    const x = spec.id === "south" ? spec.port.x + 8 + (rng() - 0.5) * 36 : spec.port.x + (rng() - 0.5) * 60;
    const z = spec.id === "south" ? spec.port.z + 6 + (rng() - 0.5) * 16 : spec.port.z + inland * (6 + rng() * 26);
    const h = heightAt(spec, x, z);
    if (h < 0.5) continue;
    barrels.push({ x, z, s: 0.8 + rng() * 0.4 });
  }
  const benches = (stops || [])
    .filter((s) => s.id.startsWith(spec.id + "-"))
    .map((s) => ({ x: s.x + 7, z: s.z + 7, s: 1 }))
    .filter((b) => heightAt(spec, b.x, b.z) > 0.5);
  return { bushes, rocks, barrels, benches };
}

function instanced(geo, mat, seeds, spec, heightAt, lift = 0) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, seeds.length));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  seeds.forEach((s, i) => {
    q.setFromAxisAngle(up, (s.x * 13.7 + s.z * 7.3) % (Math.PI * 2));
    m.compose(
      new THREE.Vector3(s.x, heightAt(spec, s.x, s.z) + lift * s.s, s.z),
      q,
      new THREE.Vector3(s.s, s.s, s.s),
    );
    mesh.setMatrixAt(i, m);
  });
  mesh.count = seeds.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.userData.kind = "prop";
  mesh.userData.mode = "PAPER";
  return mesh;
}

/** Build one island's props. Four instanced meshes, four draw calls. */
export function mountProps({ worldAdd, spec, heightAt, plots, roads, stops }) {
  const seeds = propSeeds(spec, { heightAt, plots, roads, stops });
  const bushGeo = new THREE.IcosahedronGeometry(1.1, 0);
  const bushMat = new THREE.MeshLambertMaterial({ color: 0x4f7d3a });
  const rockGeo = new THREE.DodecahedronGeometry(0.8, 0);
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x8a7a63 });
  const barrelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.92, 8);
  const barrelMat = new THREE.MeshLambertMaterial({ color: 0x8a6238 });
  const benchGeo = new THREE.BoxGeometry(1.8, 0.5, 0.55);
  const benchMat = new THREE.MeshLambertMaterial({ color: 0xc4a574 });

  const meshes = [
    instanced(bushGeo, bushMat, seeds.bushes, spec, heightAt, 0.7),
    instanced(rockGeo, rockMat, seeds.rocks, spec, heightAt, 0.35),
    instanced(barrelGeo, barrelMat, seeds.barrels, spec, heightAt, 0.46),
    instanced(benchGeo, benchMat, seeds.benches, spec, heightAt, 0.25),
  ];
  for (const m of meshes) worldAdd(m);
  return meshes;
}
