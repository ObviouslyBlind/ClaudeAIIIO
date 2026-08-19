/**
 * Overhead raster of drawn tarmac. Polygon tests can pass while ShapeGeometry
 * drops triangles — this paints the actual BufferGeometry in world XZ
 * (RingGeometry / PlaneGeometry are local XY until the mesh transform).
 * Run: cd game && npx tsx scripts/raster-joins.ts
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { createLandBoard, heightAt, ISLANDS } from "../src/land.ts";
import { makeRoads } from "../public/harbour/roads.js";
import { buildCircusFootprint, multiContains } from "../public/harbour/roadfoot.js";
import { circusMeshRadii } from "../public/harbour/roadclip.js";
import { SOUTH_RAB } from "../src/southGeom.ts";

type Mesh = {
  userData: { roadKind?: string; roadName?: string; footprint?: boolean; island?: string };
  geometry: {
    attributes: { position: { count: number; getX: (i: number) => number; getY: (i: number) => number; getZ: (i: number) => number } };
    index: { count: number; getX?: (i: number) => number; array?: ArrayLike<number> } | null;
  };
  material: { color: { getHex: () => number } };
  position?: { x: number; y: number; z: number };
  matrixWorld?: { elements: ArrayLike<number> };
  updateMatrixWorld?: (force?: boolean) => void;
};

function indexAt(mesh: Mesh, i: number) {
  const idx = mesh.geometry.index;
  if (!idx) return i;
  if (idx.array) return Number(idx.array[i]);
  return idx.getX ? idx.getX(i) : i;
}

/** RingGeometry / PlaneGeometry live in local XY; apply the mesh transform. */
function worldXZ(mesh: Mesh, i: number) {
  const pos = mesh.geometry.attributes.position;
  const vx = pos.getX(i);
  const vy = pos.getY(i);
  const vz = pos.getZ(i);
  if (typeof mesh.updateMatrixWorld === "function") {
    mesh.updateMatrixWorld(true);
    const e = mesh.matrixWorld!.elements;
    return {
      x: e[0] * vx + e[4] * vy + e[8] * vz + e[12],
      z: e[2] * vx + e[6] * vy + e[10] * vz + e[14],
    };
  }
  const p = mesh.position;
  return { x: vx + (p?.x || 0), z: vz + (p?.z || 0) };
}

function triCount(mesh: Mesh) {
  const idx = mesh.geometry.index;
  const n = idx ? idx.count : mesh.geometry.attributes.position.count;
  return Math.floor(n / 3);
}

function writePng(path: string, w: number, h: number, rgb: Uint8Array) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  }
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })();
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([t, data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
}

function rasterWindow(
  meshes: Mesh[],
  cx: number,
  cz: number,
  half: number,
  px: number,
  kinds: Set<string>,
) {
  const rgb = new Uint8Array(px * px * 3);
  const sand = [210, 186, 140];
  for (let i = 0; i < rgb.length; i += 3) {
    rgb[i] = sand[0];
    rgb[i + 1] = sand[1];
    rgb[i + 2] = sand[2];
  }
  const toPix = (x: number, z: number) => ({
    u: Math.round(((x - (cx - half)) / (half * 2)) * (px - 1)),
    v: Math.round(((cz + half - z) / (half * 2)) * (px - 1)),
  });
  const put = (u: number, v: number, hex: number) => {
    if (u < 0 || v < 0 || u >= px || v >= px) return;
    const o = (v * px + u) * 3;
    rgb[o] = (hex >> 16) & 255;
    rgb[o + 1] = (hex >> 8) & 255;
    rgb[o + 2] = hex & 255;
  };
  const fillTri = (ax: number, az: number, bx: number, bz: number, cx2: number, cz2: number, hex: number) => {
    const a = toPix(ax, az);
    const b = toPix(bx, bz);
    const c = toPix(cx2, cz2);
    const minU = Math.max(0, Math.min(a.u, b.u, c.u));
    const maxU = Math.min(px - 1, Math.max(a.u, b.u, c.u));
    const minV = Math.max(0, Math.min(a.v, b.v, c.v));
    const maxV = Math.min(px - 1, Math.max(a.v, b.v, c.v));
    const area = (b.u - a.u) * (c.v - a.v) - (c.u - a.u) * (b.v - a.v);
    if (area === 0) return;
    for (let v = minV; v <= maxV; v++) {
      for (let u = minU; u <= maxU; u++) {
        const w0 = (b.u - u) * (c.v - v) - (c.u - u) * (b.v - v);
        const w1 = (c.u - u) * (a.v - v) - (a.u - u) * (c.v - v);
        const w2 = (a.u - u) * (b.v - v) - (b.u - u) * (a.v - v);
        if (area > 0 ? w0 >= 0 && w1 >= 0 && w2 >= 0 : w0 <= 0 && w1 <= 0 && w2 <= 0) put(u, v, hex);
      }
    }
  };
  for (const m of meshes) {
    const kind = m.userData.roadKind || "";
    if (!kinds.has(kind)) continue;
    const hex = m.material.color.getHex();
    const pos = m.geometry.attributes.position;
    const nIdx = m.geometry.index ? m.geometry.index.count : pos.count;
    for (let i = 0; i + 2 < nIdx; i += 3) {
      const ia = indexAt(m, i);
      const ib = indexAt(m, i + 1);
      const ic = indexAt(m, i + 2);
      const a = worldXZ(m, ia);
      const b = worldXZ(m, ib);
      const c = worldXZ(m, ic);
      fillTri(a.x, a.z, b.x, b.z, c.x, c.z, hex);
    }
  }
  return rgb;
}

function sandGapScore(rgb: Uint8Array, px: number, cx: number, cz: number, half: number, samples: { x: number; z: number }[]) {
  const sandish = (o: number) => rgb[o]! > 180 && rgb[o + 2]! < 170;
  let n = 0;
  for (const s of samples) {
    const u = Math.round(((s.x - (cx - half)) / (half * 2)) * (px - 1));
    const v = Math.round(((cz + half - s.z) / (half * 2)) * (px - 1));
    if (u < 0 || v < 0 || u >= px || v >= px) continue;
    if (sandish((v * px + u) * 3)) n += 1;
  }
  return n;
}

mkdirSync("/tmp/road-raster", { recursive: true });
const map = createLandBoard();
const added: Mesh[] = [];
makeRoads(map, { scene: { add(obj: Mesh) { added.push(obj); } }, specOf: (id: "north" | "south") => ISLANDS[id], heightAt });

const circus = added.filter((m) => m.userData.footprint && /Circus/.test(String(m.userData.roadName || "")));
const harbourMesh = added.find((m) => m.userData.roadName === "Harbour Circus" && m.userData.footprint);
console.log("circus footprint meshes", circus.length, circus.map((m) => `${m.userData.roadName} tris=${triCount(m)} verts=${m.geometry.attributes.position.count}`).join(" | "));
if (harbourMesh) {
  const nVert = harbourMesh.geometry.attributes.position.count;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < nVert; i++) {
    const p = worldXZ(harbourMesh, i);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  console.log("Harbour Circus bbox", { minX, maxX, minZ, maxZ, w: maxX - minX, d: maxZ - minZ, tris: triCount(harbourMesh) });
}

const node = map.graph.nodes.find((n) => n.id === "s-rab-harbour")!;
const foot = buildCircusFootprint(map.graph, node);
const { outer, inner } = circusMeshRadii(node.radius);
console.log("footprint polys", foot.tarmac.length, "rings", foot.tarmac[0]?.length, "outer ring pts", foot.tarmac[0]?.[0]?.length, "inner", inner, "outer", outer);
console.log("clip contains centre", multiContains(foot.clip, node.x, node.z), "tarmac contains centre", multiContains(foot.tarmac, node.x, node.z));

const duals = added.filter((m) => m.userData.roadKind === "paved" && m.userData.roadName === "Island Hwy");
console.log("Island Hwy paved meshes", duals.length, "tris", duals.map(triCount).join(","));

const kinds = new Set(["paved", "junction", "median", "shoulder", "island", "sidewalk", "paint"]);
const harbour = SOUTH_RAB.harbour;
const rgbCircus = rasterWindow(added, harbour.x, harbour.z, 90, 360, kinds);
writePng("/tmp/road-raster/harbour-circus.png", 360, 360, rgbCircus);

const port = ISLANDS.south.port;
const rgbSpawn = rasterWindow(added, port.x + 80, port.z + 60, 160, 360, kinds);
writePng("/tmp/road-raster/spawn-corridor.png", 360, 360, rgbSpawn);

const quay = map.graph.nodes.find((n) => n.id === "s-quay-sw")!;
const rgbQuay = rasterWindow(added, quay.x, quay.z, 50, 280, kinds);
writePng("/tmp/road-raster/quayward-sw.png", 280, 280, rgbQuay);

const hwyT = map.graph.nodes.find((n) => n.id === "s-hwy-hc-j1")!;
const rgbT = rasterWindow(added, hwyT.x, hwyT.z, 50, 280, kinds);
writePng("/tmp/road-raster/channel-sands-t.png", 280, 280, rgbT);

// Sample the dual-to-ring seams: 8 points on a circle just outside inner, on approach bearings.
const hwy = map.graph.edges.find(
  (e) => e.cls === "highway" && (e.a === node.id || e.b === node.id) && (e.a === "s-port" || e.b === "s-port"),
)!;
const pts = hwy.points;
const fromA = hwy.a === node.id;
const a = fromA ? pts[0]! : pts[pts.length - 1]!;
const b = fromA ? pts[1]! : pts[pts.length - 2]!;
const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
const dx = (b.x - a.x) / len;
const dz = (b.z - a.z) / len;
const px = -dz;
const pz = dx;
const seam: { x: number; z: number }[] = [];
for (const r of [outer - 1, outer, outer + 2, outer + 6]) {
  for (const s of [-9, 0, 9]) {
    seam.push({ x: node.x + dx * r + px * s, z: node.z + dz * r + pz * s });
  }
}
const gaps = sandGapScore(rgbCircus, 360, harbour.x, harbour.z, 90, seam);
console.log("sand samples on port dual/ring seam", gaps, "/", seam.length);
console.log("wrote /tmp/road-raster/*.png");
