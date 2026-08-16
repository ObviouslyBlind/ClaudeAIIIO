import * as THREE from "three";

/** Same lagoon tint as the water plane in main.js. Original palette only. */
const WATER = new THREE.Color(0x1d7a86);

/** Samples around each island. Keep low so phones do not choke on extra meshes. */
export const FOAM_SAMPLES = 40;

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
 * That read as a green cliff. Blend a wide beach into wet sand, then lagoon.
 */
export function paintShoreColor(h, t, grass, sand, rock) {
  if (h <= 0) {
    const u = clamp01((-h) / 4);
    return sand.clone().lerp(WATER, 0.22 + 0.78 * u * u);
  }

  const c = grass.clone();
  if (h > 34) c.lerp(rock, smoothstep(34, 58, h));

  const radial = smoothstep(0.5, 0.8, t);
  const shelf = t > 0.44 ? smoothstep(5.5, 1.15, h) : 0;
  const beach = Math.max(radial, shelf);
  c.lerp(sand, beach);

  if (h < 1.55) {
    const wet = sand.clone().lerp(WATER, 0.28);
    c.lerp(wet, smoothstep(1.55, 0.2, h));
  }
  return c;
}

function quayHole(spec, x, z) {
  const toward = spec.id === "north" ? 1 : -1;
  const along = (z - spec.port.z) * toward;
  const across = Math.abs(x - spec.port.x);
  return across < 18 && along > -28 && along < 92;
}

/**
 * Thin pale foam along the 0.3–0.8 m contour. One shared box per island.
 * Skips the public quay so the pier does not grow a ring.
 */
export function makeShoreFoam(spec, heightAtFn, scene) {
  const group = new THREE.Group();
  group.name = "shore-foam-" + spec.id;

  const geo = new THREE.BoxGeometry(1.6, 0.06, 7.2);
  const mat = new THREE.MeshLambertMaterial({ color: 0xefe6c9 });

  for (let i = 0; i < FOAM_SAMPLES; i++) {
    const ang = (i / FOAM_SAMPLES) * Math.PI * 2;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    let hit = null;
    for (let s = 1.06; s >= 0.74; s -= 0.01) {
      const x = spec.cx + ca * spec.rx * s;
      const z = spec.cz + sa * spec.rz * s;
      if (quayHole(spec, x, z)) break;
      const h = heightAtFn(spec, x, z);
      if (h >= 0.3 && h <= 0.8) {
        hit = { x, z, h };
        break;
      }
    }
    if (!hit) continue;
    const m = new THREE.Mesh(geo, mat);
    m.position.set(hit.x, hit.h + 0.05, hit.z);
    const tx = -sa * spec.rx;
    const tz = ca * spec.rz;
    m.rotation.y = Math.atan2(tx, tz);
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
  }

  scene.add(group);
  return group;
}
