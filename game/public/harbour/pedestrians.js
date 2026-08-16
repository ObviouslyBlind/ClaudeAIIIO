/**
 * A few PAPER pedestrians on the quay / paved verge so spawn is not empty of people.
 * Nametags live in nametags.js (canvas PAPER sprites).
 */
import { attachOutdoorNametags } from "./nametags.js";

export function makePedestrians(map, helpers) {
  return attachOutdoorNametags(map, helpers);
}
