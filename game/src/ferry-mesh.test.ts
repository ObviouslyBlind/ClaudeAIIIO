import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { HOME_Z, makeFerry } from "../public/harbour/ferry.js";
import { ISLANDS } from "./land.ts";

const DECK = 0xc4a574;
const BOOT = 0x2a3d44;
const POST = 0x5a3a22;
const HULL = 0xe6dcc8;
const BUCKET_HEXES = new Set([DECK, BOOT, POST]);
const OAR_HEXES = new Set([DECK, BOOT, POST]);

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

  it("sits a tiny kraft PAPER bucket on the cream deck", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    let buckets = 0;
    let rails = 0;
    let cleats = 0;
    let fenders = 0;
    let lanterns = 0;
    let handles = 0;
    let creamHull = 0;
    mesh.traverse((obj) => {
      if (obj.userData?.part === "bucket") {
        expect(obj.userData.part).toBe("bucket");
        expect(obj.userData.mode).toBe("PAPER");
        expect(obj.position.y).toBeGreaterThan(1.5);
        expect(obj.position.y).toBeLessThan(2.3);
        expect(Math.abs(obj.position.z)).toBeLessThan(5);
        const size = new THREE.Vector3();
        new THREE.Box3().setFromObject(obj).getSize(size);
        expect(size.x).toBeLessThan(1.2);
        expect(size.y).toBeLessThan(1.2);
        expect(size.z).toBeLessThan(1.2);
        obj.traverse((child) => {
          const m = child as THREE.Mesh;
          if (!m.isMesh) return;
          expect(["BoxGeometry", "CylinderGeometry"]).toContain(m.geometry.type);
          const hex = (m.material as THREE.MeshLambertMaterial).color.getHex();
          expect(BUCKET_HEXES.has(hex)).toBe(true);
        });
        buckets += 1;
      }
      if (obj.userData?.part === "rail") rails += 1;
      if (obj.userData?.part === "cleat") cleats += 1;
      if (obj.userData?.part === "fender") fenders += 1;
      if (obj.userData?.part === "lantern") lanterns += 1;
      if (obj.userData?.part === "handle") handles += 1;
      const m = obj as THREE.Mesh;
      if (m.isMesh && (m.material as THREE.MeshLambertMaterial).color?.getHex() === HULL) {
        creamHull += 1;
      }
    });
    expect(buckets).toBeGreaterThanOrEqual(1);
    expect(rails).toBeGreaterThanOrEqual(1);
    expect(cleats).toBeGreaterThanOrEqual(1);
    expect(fenders).toBeGreaterThanOrEqual(1);
    expect(lanterns).toBeGreaterThanOrEqual(1);
    expect(handles).toBeGreaterThanOrEqual(1);
    expect(creamHull).toBeGreaterThan(0);
  });

  it("sits a tiny kraft PAPER oar on the cream deck", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    let oars = 0;
    let buckets = 0;
    let rails = 0;
    let cleats = 0;
    let fenders = 0;
    let lanterns = 0;
    let smoke = 0;
    let handles = 0;
    let creamHull = 0;
    const others: THREE.Object3D[] = [];
    mesh.traverse((obj) => {
      if (obj.userData?.part === "oar") {
        expect(obj.userData.part).toBe("oar");
        expect(obj.userData.mode).toBe("PAPER");
        expect(obj.position.y).toBeGreaterThan(1.5);
        expect(obj.position.y).toBeLessThan(2.3);
        expect(Math.abs(obj.position.z)).toBeLessThan(5);
        const size = new THREE.Vector3();
        new THREE.Box3().setFromObject(obj).getSize(size);
        expect(size.x).toBeLessThan(2.2);
        expect(size.y).toBeLessThan(0.6);
        expect(size.z).toBeLessThan(0.6);
        obj.traverse((child) => {
          const m = child as THREE.Mesh;
          if (!m.isMesh) return;
          expect(m.geometry.type).toBe("BoxGeometry");
          const hex = (m.material as THREE.MeshLambertMaterial).color.getHex();
          expect(OAR_HEXES.has(hex)).toBe(true);
        });
        oars += 1;
        others.push(obj);
      }
      if (obj.userData?.part === "bucket") {
        buckets += 1;
        others.push(obj);
      }
      if (obj.userData?.part === "rail") {
        rails += 1;
        others.push(obj);
      }
      if (obj.userData?.part === "cleat") {
        cleats += 1;
        others.push(obj);
      }
      if (obj.userData?.part === "fender") {
        fenders += 1;
        others.push(obj);
      }
      if (obj.userData?.part === "lantern") lanterns += 1;
      if (obj.userData?.part === "smoke") smoke += 1;
      if (obj.userData?.part === "handle") handles += 1;
      const m = obj as THREE.Mesh;
      if (m.isMesh && (m.material as THREE.MeshLambertMaterial).color?.getHex() === HULL) {
        creamHull += 1;
      }
    });
    expect(oars).toBeGreaterThanOrEqual(1);
    expect(buckets).toBeGreaterThanOrEqual(1);
    expect(rails).toBeGreaterThanOrEqual(1);
    expect(cleats).toBeGreaterThanOrEqual(1);
    expect(fenders).toBeGreaterThanOrEqual(1);
    expect(lanterns).toBeGreaterThanOrEqual(1);
    expect(smoke).toBeGreaterThanOrEqual(1);
    expect(handles).toBeGreaterThanOrEqual(1);
    expect(creamHull).toBeGreaterThan(0);
    const oar = others.find((o) => o.userData?.part === "oar")!;
    for (const other of others) {
      if (other === oar) continue;
      const dx = oar.position.x - other.position.x;
      const dz = oar.position.z - other.position.z;
      expect(Math.hypot(dx, dz)).toBeGreaterThan(1.5);
    }
  });
});
