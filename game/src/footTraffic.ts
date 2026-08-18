/** PAPER foot-traffic bands on paved roads. SIMULATED. Not live sensors. */

import { ISLANDS, type IslandId, type LandBoard, type Parcel, type Road } from "./land.ts";

export const TRAFFIC_NOTE =
  "PAPER foot traffic from road distance to port. SIMULATED. Not live counts.";

export type TrafficBand = "green" | "yellow" | "red";

/** What the player reads. Green sells fastest. Red is the slow band. */
export const BAND_LEVEL: Record<TrafficBand, "High" | "Moderate" | "Low"> = {
  green: "High",
  yellow: "Moderate",
  red: "Low",
};

/** Metres from port centroid. Town streets stay green. */
export const GREEN_PORT_M = 420;
export const YELLOW_PORT_M = 1100;

export const BAND_COLOR: Record<TrafficBand, number> = {
  green: 0x3dcc6a,
  yellow: 0xe2c04a,
  red: 0xc45a3a,
};

function roadMid(road: Road): { x: number; z: number } {
  const pts = road.points;
  if (!pts.length) return { x: 0, z: 0 };
  const p = pts[Math.floor(pts.length / 2)]!;
  return { x: p.x, z: p.z };
}

export function roadTrafficBand(road: Road): TrafficBand {
  if (road.kind === "dirt") return road.name ? "yellow" : "red";
  if (road.kind !== "paved") return "red";
  const spec = ISLANDS[road.island as IslandId];
  if (!spec) return "red";
  const mid = roadMid(road);
  const d = Math.hypot(mid.x - spec.port.x, mid.z - spec.port.z);
  if (d < GREEN_PORT_M) return "green";
  if (d < YELLOW_PORT_M) return "yellow";
  return "red";
}

/** Nearest paved road to a plot, then that road's band. Vacant dirt → red. */
export function plotTrafficBand(board: LandBoard, plot: Parcel): TrafficBand {
  let best: { dist: number; band: TrafficBand } | null = null;
  for (const road of board.roads) {
    if (road.island !== plot.island || road.points.length < 2) continue;
    if (road.kind !== "paved" && !(road.kind === "dirt" && road.name)) continue;
    if (road.roundabout) continue;
    for (const p of road.points) {
      const dist = Math.hypot(p.x - plot.x, p.z - plot.z);
      if (!best || dist < best.dist) best = { dist, band: roadTrafficBand(road) };
    }
  }
  return best && best.dist < 80 ? best.band : "red";
}

export function footTrafficSnapshot(board: LandBoard) {
  return {
    mode: "PAPER" as const,
    provenance: "SIMULATED" as const,
    note: TRAFFIC_NOTE,
    roads: board.roads
      .filter((r) => r.points.length >= 2 && (r.kind === "paved" || (r.kind === "dirt" && r.name)))
      .map((r) => ({
        island: r.island,
        name: r.name || (r.joins ? "Side street" : "Harbour Rd"),
        band: roadTrafficBand(r),
        points: r.points,
      })),
  };
}
