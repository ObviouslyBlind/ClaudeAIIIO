/**
 * Junction kerbs as L-shaped quads, not 3-point ribbons.
 *
 * A ribbon that miters through a 90° (or 270° outer) corner stair-steps: the
 * miter scale in drawRibbon cannot turn a 270° wedge. Two quads per wedge
 * follow the kerb as a square L, same colours as the arm sidewalks.
 */
import { roadClassSpec } from "./roadclass.js";

/** Keep in sync with SHOULDER_PAD_M in roads.js. */
const KERB_SHOULDER_M = 2.2;

function wrap2pi(a) {
  let x = a;
  while (x < 0) x += Math.PI * 2;
  while (x >= Math.PI * 2) x -= Math.PI * 2;
  return x;
}

function angOf(dir) {
  return Math.atan2(dir.x, dir.z);
}

function perpInto(dir, toward) {
  const r = { x: dir.z, z: -dir.x };
  if (r.x * toward.x + r.z * toward.z >= 0) return r;
  return { x: -r.x, z: -r.z };
}

function neg(v) {
  return { x: -v.x, z: -v.z };
}

function addScaled(origin, dir, m) {
  return { x: origin.x + dir.x * m, z: origin.z + dir.z * m };
}

function intersectLines(p, d, q, e) {
  const det = d.x * e.z - d.z * e.x;
  if (Math.abs(det) < 1e-8) return null;
  const t = ((q.x - p.x) * e.z - (q.z - p.z) * e.x) / det;
  return { x: p.x + d.x * t, z: p.z + d.z * t };
}

function nearNode(p, node, limit) {
  return Math.hypot(p.x - node.x, p.z - node.z) < limit;
}

function collectArms(graph, node) {
  const arms = [];
  for (const e of graph.edges) {
    if (e.a !== node.id && e.b !== node.id) continue;
    if (!e.points || e.points.length < 2) continue;
    const s = roadClassSpec(e.cls);
    if (s.dirt || !s.sidewalkM) continue;
    const pts = e.points;
    const fromA = e.a === node.id;
    const a = fromA ? pts[0] : pts[pts.length - 1];
    const b = fromA ? pts[1] : pts[pts.length - 2];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const half = s.carriageM / 2;
    const inner = half + KERB_SHOULDER_M / 2;
    arms.push({
      dir: { x: dx / len, z: dz / len },
      half,
      inner,
      outer: inner + s.sidewalkM,
      walk: s.sidewalkM,
    });
  }
  arms.sort((p, q) => angOf(p.dir) - angOf(q.dir));
  return arms;
}

function squareCorner(node, sideA, distA, sideB, distB) {
  return {
    x: node.x + sideA.x * distA + sideB.x * distB,
    z: node.z + sideA.z * distA + sideB.z * distB,
  };
}

function kerbCorner(node, a, sideA, distA, b, sideB, distB, square) {
  if (square) return squareCorner(node, sideA, distA, sideB, distB);
  const hit = intersectLines(addScaled(node, sideA, distA), a.dir, addScaled(node, sideB, distB), b.dir);
  if (!hit) return squareCorner(node, sideA, distA, sideB, distB);
  return hit;
}

/**
 * Walk and (optional) tarmac quads for one junction.
 * Each walk quad is one leg of an L: inner edge on the grit, outer on the coping.
 */
export function junctionKerbQuads(graph, node, pad) {
  const walks = [];
  const tarmac = [];
  if (!graph || !node || !pad) return { walks, tarmac };
  const arms = collectArms(graph, node);
  if (arms.length < 2) return { walks, tarmac };
  const along = pad.side / 2 + 0.35;
  const limit = pad.side * 1.6;

  for (let i = 0; i < arms.length; i++) {
    const a = arms[i];
    const b = arms[(i + 1) % arms.length];
    const gap = wrap2pi(angOf(b.dir) - angOf(a.dir));
    const deg = (gap * 180) / Math.PI;
    if (deg < 8) continue;

    const walk = Math.min(a.walk, b.walk);
    const reflex = deg > 190;
    const through = deg >= 170 && deg <= 190;
    const facingA = perpInto(a.dir, b.dir);
    const facingB = perpInto(b.dir, a.dir);
    const sideA = reflex ? neg(facingA) : facingA;
    const sideB = reflex ? neg(facingB) : facingB;
    const square = Math.abs(deg - 90) < 12 || Math.abs(deg - 270) < 12;

    if (through) {
      const mid = wrap2pi(angOf(a.dir) + gap / 2);
      const into = { x: Math.sin(mid), z: Math.cos(mid) };
      const inner = Math.max(a.inner, b.inner);
      const outer = inner + walk;
      const p1o = {
        x: node.x + a.dir.x * along + into.x * outer,
        z: node.z + a.dir.z * along + into.z * outer,
      };
      const p1i = {
        x: node.x + a.dir.x * along + into.x * inner,
        z: node.z + a.dir.z * along + into.z * inner,
      };
      const p2o = {
        x: node.x + b.dir.x * along + into.x * outer,
        z: node.z + b.dir.z * along + into.z * outer,
      };
      const p2i = {
        x: node.x + b.dir.x * along + into.x * inner,
        z: node.z + b.dir.z * along + into.z * inner,
      };
      walks.push({ a: p1o, b: p2o, c: p2i, d: p1i, widthM: walk });
      continue;
    }

    const innerHit = kerbCorner(node, a, sideA, a.inner, b, sideB, b.inner, square);
    const outerHit = kerbCorner(node, a, sideA, a.outer, b, sideB, b.outer, square);
    if (!nearNode(innerHit, node, limit) || !nearNode(outerHit, node, limit)) continue;

    const aOuter = {
      x: node.x + sideA.x * a.outer + a.dir.x * along,
      z: node.z + sideA.z * a.outer + a.dir.z * along,
    };
    const aInner = {
      x: node.x + sideA.x * a.inner + a.dir.x * along,
      z: node.z + sideA.z * a.inner + a.dir.z * along,
    };
    const bOuter = {
      x: node.x + sideB.x * b.outer + b.dir.x * along,
      z: node.z + sideB.z * b.outer + b.dir.z * along,
    };
    const bInner = {
      x: node.x + sideB.x * b.inner + b.dir.x * along,
      z: node.z + sideB.z * b.inner + b.dir.z * along,
    };

    walks.push({ a: aOuter, b: outerHit, c: innerHit, d: aInner, widthM: walk });
    walks.push({ a: bOuter, b: bInner, c: innerHit, d: outerHit, widthM: walk });

    if (!reflex) {
      const aTar = {
        x: node.x + sideA.x * a.half + a.dir.x * along,
        z: node.z + sideA.z * a.half + a.dir.z * along,
      };
      const bTar = {
        x: node.x + sideB.x * b.half + b.dir.x * along,
        z: node.z + sideB.z * b.half + b.dir.z * along,
      };
      const tarHit = kerbCorner(node, a, sideA, a.half, b, sideB, b.half, square);
      tarmac.push({
        a: { x: node.x, z: node.z },
        b: aTar,
        c: tarHit,
        d: bTar,
      });
    }
  }

  return { walks, tarmac };
}

export function addQuadXZ(THREE, scene, a, b, c, d, y, color, userData) {
  const ux = b.x - a.x;
  const uz = b.z - a.z;
  const vx = c.x - a.x;
  const vz = c.z - a.z;
  const up = uz * vx - ux * vz;
  const p = up >= 0 ? [a, b, c, d] : [a, d, c, b];
  const pos = new Float32Array([
    p[0].x, y, p[0].z,
    p[1].x, y, p[1].z,
    p[2].x, y, p[2].z,
    p[0].x, y, p[0].z,
    p[2].x, y, p[2].z,
    p[3].x, y, p[3].z,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.userData = { kind: "road", mode: "PAPER", ...userData };
  scene.add(mesh);
  return mesh;
}
