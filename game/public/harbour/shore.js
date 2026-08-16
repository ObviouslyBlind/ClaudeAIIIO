import * as THREE from "three";

/** Same lagoon tint as the water plane in main.js. Original palette only. */
const WATER = new THREE.Color(0x1d7a86);

/**
 * Far-shore foam dashes. Keep this low; the harbour gets its own denser band.
 * Shared geometry, not one unique mesh budget per sample.
 */
export const FOAM_SAMPLES = 22;

/** Extra foam near the public quay. Spawn actually looks here, not at a 20 km ring. */
export const PORT_FOAM_SAMPLES = 28;

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/**
 * Vertex colour for one terrain sample.
 * h — height in metres (same formula as heightAt).
 * t — planar ellipse radius, ~1 at the mean shore.
 * grass, sand, rock — THREE.Color; never mutated.
 *
 * Old path was a hard cut (grass until t>0.78, then sand, water if h<0).
 * A later 0.5–0.8 blend still read as a green cliff from spawn: olive mid-slope
 * met the lagoon. Widen the apron and wet the lip before the water tint.
 */
export function paintShoreColor(h, t, grass, sand, rock) {
  if (h <= 0) {
    const u = clamp01((-h) / 5.5);
    return sand.clone().lerp(WATER, 0.16 + 0.84 * u * u);
  }

  const c = grass.clone();
  if (h > 34) c.lerp(rock, smoothstep(34, 58, h));

  const radial = smoothstep(0.36, 0.64, t);
  const shelf = t > 0.26 ? smoothstep(12, 1.25, h) : 0;
  const beach = Math.max(radial, shelf);
  c.lerp(sand, beach);

  if (h < 2.45) {
    const wet = sand.clone().lerp(WATER, 0.36);
    c.lerp(wet, smoothstep(2.45, 0.12, h));
  }
  return c;
}

function quayHole(spec, x, z) {
  const toward = spec.id === "north" ? 1 : -1;
  const along = (z - spec.port.z) * toward;
  const across = Math.abs(x - spec.port.x);
  return across < 18 && along > -28 && along < 92;
}

function addFoam(group, geo, mat, spec, x, z, h) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, h + 0.05, z);
  const dx = (x - spec.cx) / spec.rx;
  const dz = (z - spec.cz) / spec.rz;
  const ang = Math.atan2(dz, dx);
  const tx = -Math.sin(ang) * spec.rx;
  const tz = Math.cos(ang) * spec.rz;
  m.rotation.y = Math.atan2(tx, tz);
  m.castShadow = false;
  m.receiveShadow = false;
  group.add(m);
}

function contourHit(spec, heightAtFn, ca, sa) {
  for (let s = 1.06; s >= 0.74; s -= 0.01) {
    const x = spec.cx + ca * spec.rx * s;
    const z = spec.cz + sa * spec.rz * s;
    if (quayHole(spec, x, z)) break;
    const h = heightAtFn(spec, x, z);
    if (h >= 0.3 && h <= 0.8) return { x, z, h };
  }
  return null;
}

function walkContour(spec, heightAtFn, x, along0, along1, step) {
  const toward = spec.id === "north" ? 1 : -1;
  for (let along = along0; along <= along1; along += step) {
    const z = spec.port.z + toward * along;
    if (quayHole(spec, x, z)) continue;
    const h = heightAtFn(spec, x, z);
    if (h >= 0.3 && h <= 0.8) return { x, z, h };
  }
  return null;
}

/**
 * Thin pale foam along the 0.3–0.8 m contour.
 * Sparse dashes around the island; a denser band on both flanks of the port
 * so spawn is not a ring of forty dots and a green cliff. One shared
 * material, two box geos (ring + harbour). Skips the public quay pad.
 */
export function makeShoreFoam(spec, heightAtFn, scene) {
  const group = new THREE.Group();
  group.name = "shore-foam-" + spec.id;

  const ringGeo = new THREE.BoxGeometry(2.0, 0.06, 9.0);
  const portGeo = new THREE.BoxGeometry(2.4, 0.07, 14.0);
  const mat = new THREE.MeshLambertMaterial({ color: 0xefe6c9 });

  for (let i = 0; i < FOAM_SAMPLES; i++) {
    const ang = (i / FOAM_SAMPLES) * Math.PI * 2;
    const hit = contourHit(spec, heightAtFn, Math.cos(ang), Math.sin(ang));
    if (!hit) continue;
    if (Math.hypot(hit.x - spec.port.x, hit.z - spec.port.z) < 380) continue;
    addFoam(group, ringGeo, mat, spec, hit.x, hit.z, hit.h);
  }

  let portCount = 0;
  for (const side of [-1, 1]) {
    for (let i = 1; i <= 10 && portCount < PORT_FOAM_SAMPLES; i++) {
      const hit = walkContour(spec, heightAtFn, spec.port.x + side * (22 + i * 18), -50, 90, 2);
      if (!hit) continue;
      addFoam(group, portGeo, mat, spec, hit.x, hit.z, hit.h);
      portCount++;
    }
  }
  for (let i = -8; i <= 8 && portCount < PORT_FOAM_SAMPLES; i++) {
    const x = spec.port.x + i * 26;
    if (Math.abs(x - spec.port.x) < 22) continue;
    const hit = walkContour(spec, heightAtFn, x, 70, 260, 3);
    if (!hit) continue;
    addFoam(group, portGeo, mat, spec, hit.x, hit.z, hit.h);
    portCount++;
  }

  scene.add(group);
  return group;
}
