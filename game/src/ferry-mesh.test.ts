import { describe, expect, it } from "vitest";
import { HOME_Z, makeFerry } from "../public/harbour/ferry.js";
import { ISLANDS } from "./land.ts";

describe("ferry berth", () => {
  it("parks the hull in the channel just off the north quay, not kilometres out", () => {
    const portZ = ISLANDS.north.port.z;
    expect(portZ).toBe(-6950);
    expect(HOME_Z).toBeGreaterThan(portZ);
    expect(HOME_Z - portZ).toBeGreaterThan(90);
    expect(HOME_Z - portZ).toBeLessThan(160);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(HOME_Z);
    expect(mesh.position.y).toBeCloseTo(0.4, 5);
    expect(Math.abs(mesh.position.x)).toBeLessThan(1);
  });
});
