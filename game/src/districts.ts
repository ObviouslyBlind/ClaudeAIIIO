import type { IslandId } from "./land.ts";

/** Ten House constituencies per island (PLAN §4). Builder fills polygons. */

export type District = {
  id: string;
  island: IslandId;
  name: string;
  ring: [number, number][];
};

export function buildDistricts(): District[] {
  return [];
}

export function districtAt(_x: number, _z: number): District | undefined {
  return undefined;
}
