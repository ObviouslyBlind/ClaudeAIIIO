import { heightAt, ISLANDS } from "../src/land.ts";

const n = ISLANDS.north;
// Sample a 400m x 400m window around the north port at 10m steps.
// Print a coarse ASCII map: '~' water (<0.06), '.' beach (<0.5), '#' land.
const lines: string[] = [];
for (let dz = -160; dz <= 240; dz += 10) {
  let row = "";
  for (let dx = -200; dx <= 200; dx += 10) {
    const h = heightAt(n, n.port.x + dx, n.port.z + dz);
    row += h < 0.06 ? "~" : h < 0.5 ? "." : "#";
  }
  lines.push(row + `  z=${(n.port.z + dz).toFixed(0)}`);
}
console.log("north port window (x -200..200, z -160..240, seaward = +z):");
console.log(lines.join("\n"));

// Where does open sea start on the port axis?
for (let dz = 0; dz <= 400; dz += 10) {
  const h = heightAt(n, n.port.x, n.port.z + dz);
  if (dz % 40 === 0) console.log(`axis z+${dz}: h=${h.toFixed(2)}`);
}
