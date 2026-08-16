import { createWorld, fastForward, hud } from "./sim.ts";

const hours = Number(process.argv[2] ?? "1");
const world = createWorld(7);
fastForward(world, Math.round(hours * 3600));
const h = hud(world);
console.log(
  JSON.stringify(
    {
      ...h,
      lastPrices: world.lastPrice,
    },
    null,
    2,
  ),
);
