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
const HAWSER_HEXES = new Set([DECK, BOOT, POST]);
const HAWSER_CLEAR = [
  "fender",
  "bucket",
  "oar",
  "cleat",
  "rail",
  "bollard",
  "lifering",
  "lantern",
  "handle",
  "smoke",
];

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

  it("hangs one kraft PAPER tyre fender on the north hull face", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    let fenders = 0;
    mesh.traverse((obj) => {
      if (obj.userData?.part === "fender") {
        expect(obj.userData.mode).toBe("PAPER");
        expect(obj.position.z).toBeLessThan(-5.5);
        const size = new THREE.Vector3();
        new THREE.Box3().setFromObject(obj).getSize(size);
        expect(Math.max(size.x, size.y, size.z)).toBeGreaterThan(2.4);
        fenders += 1;
      }
    });
    expect(fenders).toBeGreaterThanOrEqual(1);
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

  it("sits one tiny kraft PAPER hawser coil on the cream deck; fender stays north and large", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    const tagged: THREE.Object3D[] = [];
    mesh.traverse((obj) => {
      if (obj.userData?.part) tagged.push(obj);
    });
    const hawsers = tagged.filter((o) => o.userData.part === "hawser");
    const fenders = tagged.filter((o) => o.userData.part === "fender");
    expect(hawsers.length).toBeGreaterThanOrEqual(1);
    expect(fenders.length).toBeGreaterThanOrEqual(1);

    const hawser = hawsers[0];
    expect(hawser.userData.part).toBe("hawser");
    expect(hawser.userData.mode).toBe("PAPER");
    expect(hawser.position.y).toBeGreaterThan(1.5);
    expect(hawser.position.y).toBeLessThan(2.3);
    expect(Math.abs(hawser.position.z)).toBeLessThan(5);
    const hawserSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(hawser).getSize(hawserSize);
    expect(hawserSize.x).toBeLessThan(0.8);
    expect(hawserSize.y).toBeLessThan(0.5);
    expect(hawserSize.z).toBeLessThan(0.8);
    hawser.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const hex = (m.material as THREE.MeshLambertMaterial).color.getHex();
      expect(HAWSER_HEXES.has(hex)).toBe(true);
    });

    for (const name of HAWSER_CLEAR) {
      for (const other of tagged) {
        if (other === hawser) continue;
        if (other.userData.part !== name) continue;
        const dx = hawser.position.x - other.position.x;
        const dz = hawser.position.z - other.position.z;
        expect(Math.hypot(dx, dz)).toBeGreaterThan(1.5);
      }
    }

    const fender = fenders[0];
    expect(fender.position.z).toBeLessThan(-5.5);
    const fenderSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(fender).getSize(fenderSize);
    expect(Math.max(fenderSize.x, fenderSize.y, fenderSize.z)).toBeGreaterThan(2.4);
  });

  it("sits one tiny kraft PAPER horn on the ferry; fender stays north and large", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    const tagged: THREE.Object3D[] = [];
    mesh.traverse((obj) => {
      if (obj.userData?.part) tagged.push(obj);
    });
    const horns = tagged.filter((o) => o.userData.part === "horn");
    const fenders = tagged.filter((o) => o.userData.part === "fender");
    expect(horns.length).toBeGreaterThanOrEqual(1);
    expect(fenders.length).toBeGreaterThanOrEqual(1);

    const horn = horns[0];
    expect(horn.userData.part).toBe("horn");
    expect(horn.userData.mode).toBe("PAPER");
    const hornSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(horn).getSize(hornSize);
    expect(hornSize.x).toBeLessThan(0.8);
    expect(hornSize.y).toBeLessThan(0.5);
    expect(hornSize.z).toBeLessThan(0.8);
    horn.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const hex = (m.material as THREE.MeshLambertMaterial).color.getHex();
      expect(HAWSER_HEXES.has(hex)).toBe(true);
    });

    for (const name of ["hawser", "fender", "bucket", "oar", "cleat", "rail"]) {
      for (const other of tagged) {
        if (other === horn) continue;
        if (other.userData.part !== name) continue;
        const dx = horn.position.x - other.position.x;
        const dz = horn.position.z - other.position.z;
        expect(Math.hypot(dx, dz)).toBeGreaterThan(1.5);
      }
    }

    const fender = fenders[0];
    expect(fender.position.z).toBeLessThan(-5.5);
    const fenderSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(fender).getSize(fenderSize);
    expect(Math.max(fenderSize.x, fenderSize.y, fenderSize.z)).toBeGreaterThan(2.4);
  });

  it("sits one tiny kraft PAPER grommet on the hawser end; other PAPER parts remain", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    const tagged: THREE.Object3D[] = [];
    mesh.traverse((obj) => {
      if (obj.userData?.part) tagged.push(obj);
    });
    const grommets = tagged.filter((o) => o.userData.part === "grommet");
    expect(grommets.length).toBeGreaterThanOrEqual(1);
    for (const name of [
      "fender",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "hawser",
      "horn",
      "bollard",
      "lantern",
      "handle",
      "smoke",
    ]) {
      expect(tagged.some((o) => o.userData.part === name)).toBe(true);
    }

    const grommet = grommets[0];
    expect(grommet.userData.part).toBe("grommet");
    expect(grommet.userData.mode).toBe("PAPER");
    const grommetSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(grommet).getSize(grommetSize);
    expect(grommetSize.x).toBeLessThan(0.8);
    expect(grommetSize.y).toBeLessThan(0.5);
    expect(grommetSize.z).toBeLessThan(0.8);
    grommet.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const hex = (m.material as THREE.MeshLambertMaterial).color.getHex();
      expect(HAWSER_HEXES.has(hex)).toBe(true);
    });

    const hawser = tagged.find((o) => o.userData.part === "hawser")!;
    const dxh = grommet.position.x - hawser.position.x;
    const dzh = grommet.position.z - hawser.position.z;
    expect(Math.hypot(dxh, dzh)).toBeGreaterThan(0.05);
    expect(Math.hypot(dxh, dzh)).toBeLessThan(1.5);

    for (const name of ["fender", "bucket", "oar", "cleat", "rail", "horn"]) {
      for (const other of tagged) {
        if (other === grommet) continue;
        if (other.userData.part !== name) continue;
        const dx = grommet.position.x - other.position.x;
        const dz = grommet.position.z - other.position.z;
        expect(Math.hypot(dx, dz)).toBeGreaterThan(1.5);
      }
    }

    const fender = tagged.find((o) => o.userData.part === "fender")!;
    expect(fender.position.z).toBeLessThan(-5.5);
    const fenderSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(fender).getSize(fenderSize);
    expect(Math.max(fenderSize.x, fenderSize.y, fenderSize.z)).toBeGreaterThan(2.4);
  });

  it("sits one tiny kraft PAPER hatch coaming/lid on the cream deck; other PAPER parts remain", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    const tagged: THREE.Object3D[] = [];
    mesh.traverse((obj) => {
      if (obj.userData?.part) tagged.push(obj);
    });
    const hatches = tagged.filter((o) => o.userData.part === "hatch");
    expect(hatches.length).toBeGreaterThanOrEqual(1);
    for (const name of [
      "fender",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "hawser",
      "horn",
      "grommet",
    ]) {
      expect(tagged.some((o) => o.userData.part === name)).toBe(true);
    }

    const hatch = hatches[0];
    expect(hatch.userData.part).toBe("hatch");
    expect(hatch.userData.mode).toBe("PAPER");
    expect(hatch.position.y).toBeGreaterThan(1.5);
    expect(hatch.position.y).toBeLessThan(2.3);
    expect(Math.abs(hatch.position.z)).toBeLessThan(5);
    const hatchSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(hatch).getSize(hatchSize);
    expect(hatchSize.x).toBeLessThan(0.8);
    expect(hatchSize.y).toBeLessThan(0.5);
    expect(hatchSize.z).toBeLessThan(0.8);
    hatch.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const hex = (m.material as THREE.MeshLambertMaterial).color.getHex();
      expect(HAWSER_HEXES.has(hex)).toBe(true);
    });

    for (const name of [
      "fender",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "hawser",
      "horn",
      "grommet",
    ]) {
      for (const other of tagged) {
        if (other === hatch) continue;
        if (other.userData.part !== name) continue;
        const dx = hatch.position.x - other.position.x;
        const dz = hatch.position.z - other.position.z;
        expect(Math.hypot(dx, dz)).toBeGreaterThan(1.5);
      }
    }

    const fender = tagged.find((o) => o.userData.part === "fender")!;
    expect(fender.position.z).toBeLessThan(-5.5);
    const fenderSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(fender).getSize(fenderSize);
    expect(Math.max(fenderSize.x, fenderSize.y, fenderSize.z)).toBeGreaterThan(2.4);
  });

  it("sits one tiny kraft PAPER scupper on the cream deck edge; other PAPER parts remain", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    const tagged: THREE.Object3D[] = [];
    mesh.traverse((obj) => {
      if (obj.userData?.part) tagged.push(obj);
    });
    const scuppers = tagged.filter((o) => o.userData.part === "scupper");
    expect(scuppers.length).toBeGreaterThanOrEqual(1);
    for (const name of [
      "fender",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "hawser",
      "horn",
      "grommet",
      "hatch",
    ]) {
      expect(tagged.some((o) => o.userData.part === name)).toBe(true);
    }

    const scupper = scuppers[0];
    expect(scupper.userData.part).toBe("scupper");
    expect(scupper.userData.mode).toBe("PAPER");
    expect(scupper.position.y).toBeGreaterThan(1.5);
    expect(scupper.position.y).toBeLessThan(2.3);
    expect(Math.abs(scupper.position.z)).toBeGreaterThan(4);
    const scupperSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(scupper).getSize(scupperSize);
    expect(scupperSize.x).toBeLessThan(0.8);
    expect(scupperSize.y).toBeLessThan(0.5);
    expect(scupperSize.z).toBeLessThan(0.8);
    scupper.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const hex = (m.material as THREE.MeshLambertMaterial).color.getHex();
      expect(HAWSER_HEXES.has(hex)).toBe(true);
    });

    for (const name of [
      "fender",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "hawser",
      "horn",
      "grommet",
      "hatch",
    ]) {
      for (const other of tagged) {
        if (other === scupper) continue;
        if (other.userData.part !== name) continue;
        const dx = scupper.position.x - other.position.x;
        const dz = scupper.position.z - other.position.z;
        expect(Math.hypot(dx, dz)).toBeGreaterThan(1.5);
      }
    }

    const fender = tagged.find((o) => o.userData.part === "fender")!;
    expect(fender.position.z).toBeLessThan(-5.5);
    const fenderSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(fender).getSize(fenderSize);
    expect(Math.max(fenderSize.x, fenderSize.y, fenderSize.z)).toBeGreaterThan(2.4);
  });

  it("sits one tiny kraft PAPER wedge on the cream deck; other PAPER parts remain", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    const tagged: THREE.Object3D[] = [];
    mesh.traverse((obj) => {
      if (obj.userData?.part) tagged.push(obj);
    });
    const wedges = tagged.filter((o) => o.userData.part === "wedge");
    expect(wedges.length).toBeGreaterThanOrEqual(1);
    for (const name of [
      "fender",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "hawser",
      "horn",
      "grommet",
      "hatch",
      "scupper",
      "bollard",
      "lantern",
      "handle",
      "smoke",
    ]) {
      expect(tagged.some((o) => o.userData.part === name)).toBe(true);
    }

    const wedge = wedges[0];
    expect(wedge.userData.part).toBe("wedge");
    expect(wedge.userData.mode).toBe("PAPER");
    expect(wedge.position.y).toBeGreaterThan(1.5);
    expect(wedge.position.y).toBeLessThan(2.3);
    expect(Math.abs(wedge.position.z)).toBeLessThan(5);
    const wedgeSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(wedge).getSize(wedgeSize);
    expect(wedgeSize.x).toBeLessThan(0.8);
    expect(wedgeSize.y).toBeLessThan(0.5);
    expect(wedgeSize.z).toBeLessThan(0.8);
    wedge.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const hex = (m.material as THREE.MeshLambertMaterial).color.getHex();
      expect(HAWSER_HEXES.has(hex)).toBe(true);
    });

    for (const name of [
      "grommet",
      "hatch",
      "scupper",
      "hawser",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "fender",
      "bollard",
      "lantern",
      "handle",
      "smoke",
      "horn",
    ]) {
      for (const other of tagged) {
        if (other === wedge) continue;
        if (other.userData.part !== name) continue;
        const dx = wedge.position.x - other.position.x;
        const dz = wedge.position.z - other.position.z;
        expect(Math.hypot(dx, dz)).toBeGreaterThan(1.5);
      }
    }

    const fender = tagged.find((o) => o.userData.part === "fender")!;
    expect(fender.position.z).toBeLessThan(-5.5);
    const fenderSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(fender).getSize(fenderSize);
    expect(Math.max(fenderSize.x, fenderSize.y, fenderSize.z)).toBeGreaterThan(2.4);
  });

  it("sits one tiny kraft PAPER coaming on the cream deck; other PAPER parts remain", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    const tagged: THREE.Object3D[] = [];
    mesh.traverse((obj) => {
      if (obj.userData?.part) tagged.push(obj);
    });
    const coamings = tagged.filter((o) => o.userData.part === "coaming");
    expect(coamings.length).toBeGreaterThanOrEqual(1);
    for (const name of [
      "wedge",
      "grommet",
      "hatch",
      "scupper",
      "hawser",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "fender",
      "bollard",
      "lantern",
      "handle",
      "smoke",
      "horn",
    ]) {
      expect(tagged.some((o) => o.userData.part === name)).toBe(true);
    }

    const coaming = coamings[0];
    expect(coaming.userData.part).toBe("coaming");
    expect(coaming.userData.mode).toBe("PAPER");
    expect(coaming.position.y).toBeGreaterThan(1.5);
    expect(coaming.position.y).toBeLessThan(2.3);
    expect(Math.abs(coaming.position.z)).toBeLessThan(5);
    const coamingSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(coaming).getSize(coamingSize);
    expect(coamingSize.x).toBeLessThan(0.8);
    expect(coamingSize.y).toBeLessThan(0.5);
    expect(coamingSize.z).toBeLessThan(0.8);
    coaming.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const hex = (m.material as THREE.MeshLambertMaterial).color.getHex();
      expect(hex).toBe(DECK);
    });

    for (const name of [
      "wedge",
      "grommet",
      "hatch",
      "scupper",
      "hawser",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "fender",
      "bollard",
      "lantern",
      "handle",
      "smoke",
      "horn",
    ]) {
      for (const other of tagged) {
        if (other === coaming) continue;
        if (other.userData.part !== name) continue;
        const dx = coaming.position.x - other.position.x;
        const dz = coaming.position.z - other.position.z;
        expect(Math.hypot(dx, dz)).toBeGreaterThan(1.5);
      }
    }

    const fender = tagged.find((o) => o.userData.part === "fender")!;
    expect(fender.position.z).toBeLessThan(-5.5);
    const fenderSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(fender).getSize(fenderSize);
    expect(Math.max(fenderSize.x, fenderSize.y, fenderSize.z)).toBeGreaterThan(2.4);
  });

  it("sits one tiny kraft PAPER plug on the cream deck; other PAPER parts remain", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    const tagged: THREE.Object3D[] = [];
    mesh.traverse((obj) => {
      if (obj.userData?.part) tagged.push(obj);
    });
    const plugs = tagged.filter((o) => o.userData.part === "plug");
    expect(plugs.length).toBeGreaterThanOrEqual(1);
    for (const name of [
      "coaming",
      "wedge",
      "grommet",
      "hatch",
      "scupper",
      "hawser",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "fender",
      "bollard",
      "lantern",
      "handle",
      "smoke",
      "horn",
    ]) {
      expect(tagged.some((o) => o.userData.part === name)).toBe(true);
    }

    const plug = plugs[0];
    expect(plug.userData.part).toBe("plug");
    expect(plug.userData.mode).toBe("PAPER");
    expect(plug.position.y).toBeGreaterThan(1.5);
    expect(plug.position.y).toBeLessThan(2.3);
    expect(Math.abs(plug.position.z)).toBeLessThan(5);
    const plugSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(plug).getSize(plugSize);
    expect(plugSize.x).toBeLessThan(0.8);
    expect(plugSize.y).toBeLessThan(0.5);
    expect(plugSize.z).toBeLessThan(0.8);
    plug.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const hex = (m.material as THREE.MeshLambertMaterial).color.getHex();
      expect(hex).toBe(DECK);
    });

    for (const name of [
      "coaming",
      "wedge",
      "grommet",
      "hatch",
      "scupper",
      "hawser",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "fender",
      "bollard",
      "lantern",
      "handle",
      "smoke",
      "horn",
    ]) {
      for (const other of tagged) {
        if (other === plug) continue;
        if (other.userData.part !== name) continue;
        const dx = plug.position.x - other.position.x;
        const dz = plug.position.z - other.position.z;
        expect(Math.hypot(dx, dz)).toBeGreaterThan(1.5);
      }
    }

    const fender = tagged.find((o) => o.userData.part === "fender")!;
    expect(fender.position.z).toBeLessThan(-5.5);
    const fenderSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(fender).getSize(fenderSize);
    expect(Math.max(fenderSize.x, fenderSize.y, fenderSize.z)).toBeGreaterThan(2.4);
  });

  it("sits one tiny kraft PAPER stopper on the cream deck; other PAPER parts remain", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    const tagged: THREE.Object3D[] = [];
    mesh.traverse((obj) => {
      if (obj.userData?.part) tagged.push(obj);
    });
    const stoppers = tagged.filter((o) => o.userData.part === "stopper");
    expect(stoppers.length).toBeGreaterThanOrEqual(1);
    for (const name of [
      "plug",
      "coaming",
      "wedge",
      "grommet",
      "hatch",
      "scupper",
      "hawser",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "fender",
      "bollard",
      "lantern",
      "handle",
      "smoke",
      "horn",
    ]) {
      expect(tagged.some((o) => o.userData.part === name)).toBe(true);
    }

    const stopper = stoppers[0];
    expect(stopper.userData.part).toBe("stopper");
    expect(stopper.userData.mode).toBe("PAPER");
    expect(stopper.position.y).toBeGreaterThan(1.5);
    expect(stopper.position.y).toBeLessThan(2.3);
    expect(Math.abs(stopper.position.z)).toBeLessThan(5);
    const stopperSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(stopper).getSize(stopperSize);
    expect(stopperSize.x).toBeLessThan(0.8);
    expect(stopperSize.y).toBeLessThan(0.5);
    expect(stopperSize.z).toBeLessThan(0.8);
    stopper.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const hex = (m.material as THREE.MeshLambertMaterial).color.getHex();
      expect(hex).toBe(DECK);
    });

    for (const name of [
      "plug",
      "coaming",
      "wedge",
      "grommet",
      "hatch",
      "scupper",
      "hawser",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "fender",
      "bollard",
      "lantern",
      "handle",
      "smoke",
      "horn",
    ]) {
      for (const other of tagged) {
        if (other === stopper) continue;
        if (other.userData.part !== name) continue;
        const dx = stopper.position.x - other.position.x;
        const dz = stopper.position.z - other.position.z;
        expect(Math.hypot(dx, dz)).toBeGreaterThan(1.5);
      }
    }

    const fender = tagged.find((o) => o.userData.part === "fender")!;
    expect(fender.position.z).toBeLessThan(-5.5);
    const fenderSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(fender).getSize(fenderSize);
    expect(Math.max(fenderSize.x, fenderSize.y, fenderSize.z)).toBeGreaterThan(2.4);
  });

  it("sits one tiny kraft PAPER chock on the cream deck; other PAPER parts remain", () => {
    expect(HOME_Z).toBe(-6835);
    const mesh = makeFerry();
    expect(mesh.position.z).toBe(-6835);
    const tagged: THREE.Object3D[] = [];
    mesh.traverse((obj) => {
      if (obj.userData?.part) tagged.push(obj);
    });
    const chocks = tagged.filter((o) => o.userData.part === "chock");
    expect(chocks.length).toBeGreaterThanOrEqual(1);
    for (const name of [
      "stopper",
      "plug",
      "coaming",
      "wedge",
      "grommet",
      "hatch",
      "scupper",
      "hawser",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "fender",
      "bollard",
      "lantern",
      "handle",
      "smoke",
      "horn",
    ]) {
      expect(tagged.some((o) => o.userData.part === name)).toBe(true);
    }

    const chock = chocks[0];
    expect(chock.userData.part).toBe("chock");
    expect(chock.userData.mode).toBe("PAPER");
    expect(chock.position.y).toBeGreaterThan(1.5);
    expect(chock.position.y).toBeLessThan(2.3);
    expect(Math.abs(chock.position.z)).toBeLessThan(5);
    const chockSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(chock).getSize(chockSize);
    expect(chockSize.x).toBeLessThan(0.8);
    expect(chockSize.y).toBeLessThan(0.5);
    expect(chockSize.z).toBeLessThan(0.8);
    chock.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh) return;
      expect(m.geometry.type).toBe("BoxGeometry");
      const hex = (m.material as THREE.MeshLambertMaterial).color.getHex();
      expect(hex).toBe(0xc4b496);
    });

    for (const name of [
      "stopper",
      "plug",
      "coaming",
      "wedge",
      "grommet",
      "hatch",
      "scupper",
      "hawser",
      "bucket",
      "oar",
      "cleat",
      "rail",
      "fender",
      "bollard",
      "lantern",
      "handle",
      "smoke",
      "horn",
    ]) {
      for (const other of tagged) {
        if (other === chock) continue;
        if (other.userData.part !== name) continue;
        const dx = chock.position.x - other.position.x;
        const dz = chock.position.z - other.position.z;
        expect(Math.hypot(dx, dz)).toBeGreaterThan(1.5);
      }
    }

    const fender = tagged.find((o) => o.userData.part === "fender")!;
    expect(fender.position.z).toBeLessThan(-5.5);
    const fenderSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(fender).getSize(fenderSize);
    expect(Math.max(fenderSize.x, fenderSize.y, fenderSize.z)).toBeGreaterThan(2.4);
  });
});
