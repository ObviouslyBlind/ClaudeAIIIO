/**
 * Three authored building lots next to the $750 spawn pads.
 * 1 / 2 / 3 storeys in a neat row, inland of Island Hwy.
 * PAPER / SIMULATED. Not OSM.
 */

import { SOUTH_HIGHWAY_NODES, southSpawnPad, type XZ } from "./southGeom.ts";
import { BUILDING_LAND_PRICE } from "./economy.ts";

export const UNIT_LOT_FRONT_M = 18;
export const UNIT_LOT_DEPTH_M = 14;
export const UNIT_LOT_GAP_M = 4;
/** Past the dual and the cart-pad verge. */
export const UNIT_LOT_SETBACK_M = 30;
export const UNIT_LOT_ALONG0_M = 12;

const _hwy0 = SOUTH_HIGHWAY_NODES[0]!;
const _hwy1 = SOUTH_HIGHWAY_NODES[1]!;
export const UNIT_ROW_YAW = Math.atan2(_hwy1.z - _hwy0.z, _hwy1.x - _hwy0.x);

export type UnitPrecinctSpec = {
  id: string;
  name: string;
  floors: number;
  index: number;
};

/** Short, mid, tall — three sets, different storeys. */
export const UNIT_PRECINCT: UnitPrecinctSpec[] = [
  { id: "quay-shops", name: "Quay Shops", floors: 1, index: 0 },
  { id: "strand-flats", name: "Strand Flats", floors: 2, index: 1 },
  { id: "mixed-house", name: "Mixed House", floors: 3, index: 2 },
];

export function unitPlotId(buildingId: string): string {
  return "south-unit-" + buildingId;
}

export function isBuildingLot(plot: { buildingId?: string | null } | null | undefined): boolean {
  return Boolean(plot && plot.buildingId);
}

function unitBasis(): { dir: XZ; perp: XZ } {
  const dx = _hwy1.x - _hwy0.x;
  const dz = _hwy1.z - _hwy0.z;
  const len = Math.hypot(dx, dz) || 1;
  const dir = { x: dx / len, z: dz / len };
  let perp = { x: -dir.z, z: dir.x };
  const spawn = southSpawnPad();
  if (spawn.z + perp.z * 20 < spawn.z) perp = { x: -perp.x, z: -perp.z };
  return { dir, perp };
}

export function unitLotPose(index: number): { x: number; z: number; yaw: number } {
  const { dir, perp } = unitBasis();
  const spawn = southSpawnPad();
  const along = UNIT_LOT_ALONG0_M + index * (UNIT_LOT_FRONT_M + UNIT_LOT_GAP_M);
  const inward = UNIT_LOT_SETBACK_M + UNIT_LOT_DEPTH_M / 2;
  return {
    x: spawn.x + dir.x * along + perp.x * inward,
    z: spawn.z + dir.z * along + perp.z * inward,
    yaw: UNIT_ROW_YAW,
  };
}

export function unitLotRing(index: number): [number, number][] {
  const { dir, perp } = unitBasis();
  const pose = unitLotPose(index);
  const hx = UNIT_LOT_FRONT_M / 2;
  const hz = UNIT_LOT_DEPTH_M / 2;
  const corners: [number, number][] = [
    [-hx, -hz],
    [hx, -hz],
    [hx, hz],
    [-hx, hz],
  ];
  return corners.map(([a, b]) => [
    pose.x + dir.x * a + perp.x * b,
    pose.z + dir.z * a + perp.z * b,
  ]);
}

export const UNIT_LOT_PRICE = BUILDING_LAND_PRICE;
