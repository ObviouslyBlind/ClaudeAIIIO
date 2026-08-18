import {
  heightAt,
  ISLANDS,
  pointInRing,
  type IslandId,
  type IslandSpec,
  type Ring,
} from "./land.ts";

/** Ten House constituencies per island (PLAN §4). Local metres, not OSM. */

export type District = {
  id: string;
  island: IslandId;
  name: string;
  ring: Ring;
};

type Seed = {
  slug: string;
  nameN: string;
  nameS: string;
  x: number;
  za: number;
};

/** +za is toward the channel. Port sits near za 2050. */
function seedsFor(island: IslandId): Seed[] {
  const hill = island === "north" ? -1 : 1;
  const harbourX = island === "north" ? 0 : -2280;
  const harbourZa = island === "north" ? 2050 : 1720;
  return [
    { slug: "harbour", nameN: "Palmetto Harbour", nameS: "Coral Harbour", x: harbourX, za: harbourZa },
    {
      slug: "mill-town",
      nameN: "Mill Town",
      nameS: "Canebrake",
      x: island === "north" ? 70 * hill : -900,
      za: island === "north" ? 1120 : 320,
    },
    { slug: "west-quay", nameN: "West Quay", nameS: "West Quay", x: -1580, za: 1900 },
    { slug: "east-quay", nameN: "East Quay", nameS: "East Quay", x: 1580, za: 1900 },
    { slug: "west-farm", nameN: "West Farm Belt", nameS: "West Farm Belt", x: -2280, za: 280 },
    { slug: "east-farm", nameN: "East Farm Belt", nameS: "East Farm Belt", x: 2280, za: 280 },
    {
      slug: "mine-belt",
      nameN: "Red Hill Mine Belt",
      nameS: "Red Hill Mine Belt",
      x: 900 * hill,
      za: -1200,
    },
    {
      slug: "timber",
      nameN: "Cedar Timber Stand",
      nameS: "Canebrake Belt",
      x: -2360 * (hill === -1 ? 1 : -1),
      za: -820,
    },
    { slug: "ridge", nameN: "Windward Ridge", nameS: "Leeward Ridge", x: 120, za: -1880 },
    {
      slug: "workshop",
      nameN: "Foundry Ward",
      nameS: "Orchard Belt",
      x: 2080 * (hill === -1 ? 1 : -1),
      za: -780,
    },
  ];
}

function hash01(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function dist2(x: number, za: number, s: Seed): number {
  const dx = x - s.x;
  const dz = za - s.za;
  return dx * dx + dz * dz;
}

/** Same coastline wobble as heightAt, padded so every land sample sits in a ring. */
function insideClip(spec: IslandSpec, x: number, za: number): boolean {
  const dx = x / spec.rx;
  const dz = za / spec.rz;
  const ang = Math.atan2(dz, dx);
  const edge = 1 + 0.06 * Math.sin(ang * 5) + 0.03 * Math.sin(ang * 9 + 1.1);
  return Math.hypot(dx, dz) <= edge * 1.12;
}

function owns(x: number, za: number, seed: Seed, seeds: Seed[]): boolean {
  const selfD = dist2(x, za, seed);
  for (const other of seeds) {
    if (other.slug === seed.slug) continue;
    if (dist2(x, za, other) < selfD - 1e-3) return false;
  }
  return true;
}

function cellRing(spec: IslandSpec, seed: Seed, seeds: Seed[]): Ring {
  const rays = 16;
  const ring: Ring = [];
  for (let i = 0; i < rays; i++) {
    const ang = (i / rays) * Math.PI * 2 + (hash01(i * 19 + seed.x) - 0.5) * 0.1;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    let lo = 0;
    let hi = 14000;
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2;
      const x = seed.x + dx * mid;
      const za = seed.za + dz * mid;
      if (insideClip(spec, x, za) && owns(x, za, seed, seeds)) lo = mid;
      else hi = mid;
    }
    const expand = 1.12 + hash01(i * 7 + seed.za) * 0.06;
    ring.push([seed.x + dx * lo * expand, seed.za + dz * lo * expand]);
  }
  return ring;
}

function toWorld(island: IslandId, x: number, za: number): [number, number] {
  const spec = ISLANDS[island];
  const toward = island === "north" ? 1 : -1;
  return [spec.cx + x, spec.cz + za * toward];
}

function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % ring.length];
    a += x1 * z2 - x2 * z1;
  }
  return Math.abs(a) / 2;
}

function authorDistricts(): District[] {
  const out: District[] = [];
  for (const spec of Object.values(ISLANDS)) {
    const seeds = seedsFor(spec.id);
    for (const seed of seeds) {
      const local = cellRing(spec, seed, seeds);
      out.push({
        id: `${spec.id}-${seed.slug}`,
        island: spec.id,
        name: spec.id === "north" ? seed.nameN : seed.nameS,
        ring: local.map(([x, za]) => toWorld(spec.id, x, za)),
      });
    }
  }
  return out;
}

const DISTRICTS = authorDistricts();

export function buildDistricts(): District[] {
  return DISTRICTS;
}

/** Smallest containing ring wins where constituencies overlap.
 *  16-ray cells leave hairline gaps — snap those land pixels to the nearest ring. */
export function districtAt(x: number, z: number): District | undefined {
  const hits = DISTRICTS.filter((d) => pointInRing(x, z, d.ring));
  if (hits.length) return hits.reduce((a, b) => (ringArea(a.ring) <= ringArea(b.ring) ? a : b));
  const n = ISLANDS.north;
  const s = ISLANDS.south;
  const spec = Math.hypot(x - n.cx, z - n.cz) <= Math.hypot(x - s.cx, z - s.cz) ? n : s;
  if (heightAt(spec, x, z) < 0.4) return undefined;
  let best: District | undefined;
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    if (d.island !== spec.id) continue;
    let cx = 0;
    let cz = 0;
    for (const p of d.ring) {
      cx += p[0];
      cz += p[1];
    }
    cx /= d.ring.length;
    cz /= d.ring.length;
    const dist = Math.hypot(x - cx, z - cz);
    if (dist < bestD) {
      best = d;
      bestD = dist;
    }
  }
  return best;
}
