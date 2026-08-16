import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlots, ISLANDS, type IslandId } from "./land.ts";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const plots = buildPlots();

for (const id of Object.keys(ISLANDS) as IslandId[]) {
  const dir = join(root, "assets/maps", id);
  await mkdir(dir, { recursive: true });
  const body = {
    island: id,
    units: "metres",
    origin: "channel midpoint, +Z south",
    note: "PAPER cadastral parcels. Generated from src/land.ts. Not OSM. Not a given lot list.",
    islandSpec: ISLANDS[id],
    plots: plots.filter((p) => p.island === id),
  };
  await writeFile(join(dir, "plots.json"), JSON.stringify(body, null, 2) + "\n");
}

console.log("wrote plots.json for", Object.keys(ISLANDS).join(", "));
