import { describe, expect, it } from "vitest";
import { HOME_Z, makeFerry } from "../public/harbour/ferry.js";
import { ISLANDS } from "./land.ts";

describe("ferry berth", () => {
  it("parks the hull in the channel just off the north quay, not kilometres out", () => {
    const portZ = ISLANDS.north.port.z;
    expect(portZ).toBe(-6950);
    expect(HOME_Z).toBe(-6835);
    expect(HOME_Z).toBeGreaterThan(portZ);
    expect(HOME_Z - portZ).toBeGreaterThan(90);
    expect(HOME_Z - portZ).toBeLessThan(160);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(HOME_Z);
    expect(mesh.position.y).toBeCloseTo(0.4, 5);
    expect(Math.abs(mesh.position.x)).toBeLessThan(1);
  });

  it("plants at least two wood/iron bollards on the cream deck", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    let bollards = 0;
    mesh.traverse((obj) => {
      if (obj.userData?.part === "bollard" || obj.name === "bollard") bollards += 1;
    });
    expect(bollards).toBeGreaterThanOrEqual(2);
  });

  it("hangs at least one kraft life ring on the cream cabin", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    let rings = 0;
    mesh.traverse((obj) => {
      if (obj.userData?.part === "lifering") rings += 1;
    });
    expect(rings).toBeGreaterThanOrEqual(1);
  });

  it("puts a kraft PAPER handle on the cabin door", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    let handles = 0;
    mesh.traverse((obj) => {
      if (obj.userData?.part === "handle") handles += 1;
    });
    expect(handles).toBeGreaterThanOrEqual(1);
  });

  it("puffs kraft PAPER smoke above the funnel", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    let smoke = 0;
    mesh.traverse((obj) => {
      if (obj.userData?.part === "smoke") smoke += 1;
    });
    expect(smoke).toBeGreaterThanOrEqual(1);
  });

  it("hangs one kraft PAPER lantern on the wheelhouse roof", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    let lanterns = 0;
    let smoke = 0;
    let handles = 0;
    let rings = 0;
    let bollards = 0;
    mesh.traverse((obj) => {
      if (obj.userData?.part === "lantern") lanterns += 1;
      if (obj.userData?.part === "smoke") smoke += 1;
      if (obj.userData?.part === "handle") handles += 1;
      if (obj.userData?.part === "lifering") rings += 1;
      if (obj.userData?.part === "bollard" || obj.name === "bollard") bollards += 1;
    });
    expect(lanterns).toBeGreaterThanOrEqual(1);
    expect(smoke).toBeGreaterThanOrEqual(1);
    expect(handles).toBeGreaterThanOrEqual(1);
    expect(rings).toBeGreaterThanOrEqual(1);
    expect(bollards).toBeGreaterThanOrEqual(2);
  });

  it("sits a short kraft PAPER rail on the cream deck", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    let rails = 0;
    let lanterns = 0;
    let smoke = 0;
    let handles = 0;
    let rings = 0;
    let bollards = 0;
    mesh.traverse((obj) => {
      if (obj.userData?.part === "rail") rails += 1;
      if (obj.userData?.part === "lantern") lanterns += 1;
      if (obj.userData?.part === "smoke") smoke += 1;
      if (obj.userData?.part === "handle") handles += 1;
      if (obj.userData?.part === "lifering") rings += 1;
      if (obj.userData?.part === "bollard" || obj.name === "bollard") bollards += 1;
    });
    expect(rails).toBeGreaterThanOrEqual(1);
    expect(lanterns).toBeGreaterThanOrEqual(1);
    expect(smoke).toBeGreaterThanOrEqual(1);
    expect(handles).toBeGreaterThanOrEqual(1);
    expect(rings).toBeGreaterThanOrEqual(1);
    expect(bollards).toBeGreaterThanOrEqual(2);
  });

  it("sits a small kraft PAPER cleat on the cream deck", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    let cleats = 0;
    let rails = 0;
    let lanterns = 0;
    let smoke = 0;
    let handles = 0;
    let rings = 0;
    let bollards = 0;
    mesh.traverse((obj) => {
      if (obj.userData?.part === "cleat") {
        expect(obj.userData.part).toBe("cleat");
        cleats += 1;
      }
      if (obj.userData?.part === "rail") rails += 1;
      if (obj.userData?.part === "lantern") lanterns += 1;
      if (obj.userData?.part === "smoke") smoke += 1;
      if (obj.userData?.part === "handle") handles += 1;
      if (obj.userData?.part === "lifering") rings += 1;
      if (obj.userData?.part === "bollard" || obj.name === "bollard") bollards += 1;
    });
    expect(cleats).toBeGreaterThanOrEqual(1);
    expect(rails).toBeGreaterThanOrEqual(1);
    expect(lanterns).toBeGreaterThanOrEqual(1);
    expect(smoke).toBeGreaterThanOrEqual(1);
    expect(handles).toBeGreaterThanOrEqual(1);
    expect(rings).toBeGreaterThanOrEqual(1);
    expect(bollards).toBeGreaterThanOrEqual(2);
  });

  it("hangs one kraft PAPER tyre fender on the hull side", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    let fenders = 0;
    let rails = 0;
    let cleats = 0;
    let lanterns = 0;
    let smoke = 0;
    mesh.traverse((obj) => {
      if (obj.userData?.part === "fender") {
        expect(obj.userData.part).toBe("fender");
        fenders += 1;
      }
      if (obj.userData?.part === "rail") rails += 1;
      if (obj.userData?.part === "cleat") cleats += 1;
      if (obj.userData?.part === "lantern") lanterns += 1;
      if (obj.userData?.part === "smoke") smoke += 1;
    });
    expect(fenders).toBeGreaterThanOrEqual(1);
    expect(rails).toBeGreaterThanOrEqual(1);
    expect(cleats).toBeGreaterThanOrEqual(1);
    expect(lanterns).toBeGreaterThanOrEqual(1);
    expect(smoke).toBeGreaterThanOrEqual(1);
  });
});
