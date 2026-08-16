import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { makeInteriorScene } from "../public/harbour/interior.js";
import {
  dressFactory,
  isFactoryPlot,
  undressFactory,
} from "../public/harbour/factory.js";

const IRON = new Set([0x6a7068, 0x4a524c, 0x8a9088, 0x6a5a4a]);

function hexes(root: THREE.Object3D) {
  const colors: number[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
    if (mesh.isMesh && mat?.color) colors.push(mat.color.getHex());
  });
  return colors;
}

function factoryTools(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "factory-tool" && obj.userData?.part === "wrench") {
      out.push(obj);
    }
  });
  return out;
}

describe("factory PAPER hanging wrench", () => {
  it("matches factory plots only", () => {
    expect(isFactoryPlot({ use: "factory" })).toBe(true);
    expect(isFactoryPlot({ kind: "factory" })).toBe(true);
    expect(isFactoryPlot({ use: "house" })).toBe(false);
    expect(isFactoryPlot(null)).toBe(false);
  });

  it("hangs one iron PAPER wrench on the factory wall", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);

    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const tools = factoryTools(dress!);
    expect(tools.length).toBe(1);

    const wrench = tools[0];
    expect(wrench.userData.kind).toBe("factory-tool");
    expect(wrench.userData.mode).toBe("PAPER");
    expect(wrench.userData.part).toBe("wrench");
    expect(wrench.position.y).toBeGreaterThan(1.2);
    expect(Math.abs(wrench.position.x)).toBeGreaterThan(2.8);
    expect(Math.abs(wrench.position.x)).toBeLessThan(3.5);
    expect(Math.abs(wrench.position.z)).toBeLessThan(3.0);

    const colors = hexes(wrench);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => IRON.has(c))).toBe(true);
    expect(colors.some((c) => c === 0x6a7068 || c === 0x8a9088)).toBe(true);

    let boxes = 0;
    wrench.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(4);
  });

  it("keeps dress idempotent and hides the wrench on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);
    dressFactory(scene);
    expect(interior.children.filter((c) => c.name === "factory-dress").length).toBe(1);
    expect(factoryTools(interior).length).toBe(1);

    undressFactory(scene);
    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

const KRAFT = 0x8a6238;
const OILCAN_PALETTE = new Set([
  KRAFT,
  0x9a6a40,
  0x6a7068,
  0x4a524c,
  0x8a9088,
  0x6a5a4a,
]);

function factoryOilCans(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "factory-oilcan" && obj.name === "factory-oilcan") {
      out.push(obj);
    }
  });
  return out;
}

describe("factory PAPER oil can", () => {
  it("puts one kraft/iron PAPER oil can on the first workbench", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);

    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const cans = factoryOilCans(dress!);
    expect(cans.length).toBe(1);

    const can = cans[0];
    expect(can.userData.kind).toBe("factory-oilcan");
    expect(can.userData.mode).toBe("PAPER");
    // First workbench lip top is ~1.005; can sits on it, not the floor.
    expect(can.position.y).toBeGreaterThan(0.95);
    expect(can.position.y).toBeLessThan(1.12);
    expect(Math.abs(can.position.x - -1.35)).toBeLessThan(1.15);
    expect(Math.abs(can.position.z - -2.48)).toBeLessThan(0.4);

    const colors = hexes(can);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => OILCAN_PALETTE.has(c))).toBe(true);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.some((c) => IRON.has(c))).toBe(true);

    let boxes = 0;
    can.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("factory-oilcan");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the oil can on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);
    dressFactory(scene);
    expect(interior.children.filter((c) => c.name === "factory-dress").length).toBe(1);
    expect(factoryOilCans(interior).length).toBe(1);
    expect(factoryTools(interior).length).toBe(1);

    undressFactory(scene);
    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

const BUCKET_PALETTE = new Set([
  KRAFT,
  0x9a6a40,
  0x6a7068,
  0x4a524c,
  0x8a9088,
  0x6a5a4a,
]);

function factoryBuckets(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "factory-bucket" && obj.name === "factory-bucket") {
      out.push(obj);
    }
  });
  return out;
}

describe("factory PAPER bucket", () => {
  it("puts one kraft/iron PAPER bucket on the factory floor", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);

    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const buckets = factoryBuckets(dress!);
    expect(buckets.length).toBe(1);

    const bucket = buckets[0];
    expect(bucket.userData.kind).toBe("factory-bucket");
    expect(bucket.userData.mode).toBe("PAPER");
    // Floor, not the first-bench oil can (~1.005) or the hanging wrench.
    expect(bucket.position.y).toBe(0);
    expect(Math.abs(bucket.position.x)).toBeGreaterThan(2.8);
    expect(Math.abs(bucket.position.x)).toBeLessThan(3.5);
    expect(Math.abs(bucket.position.z)).toBeLessThan(1.2);

    const cans = factoryOilCans(dress!);
    expect(cans.length).toBe(1);
    const toCan = Math.hypot(
      bucket.position.x - cans[0].position.x,
      bucket.position.z - cans[0].position.z,
    );
    expect(toCan).toBeGreaterThan(2);

    const tools = factoryTools(dress!);
    expect(tools.length).toBe(1);
    expect(bucket.position.y).toBeLessThan(tools[0].position.y - 1);

    const colors = hexes(bucket);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => BUCKET_PALETTE.has(c))).toBe(true);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.some((c) => IRON.has(c))).toBe(true);

    let parts = 0;
    bucket.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        parts += 1;
        expect(["BoxGeometry", "CylinderGeometry"]).toContain(mesh.geometry.type);
        expect(mesh.userData.kind).toBe("factory-bucket");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(parts).toBeGreaterThanOrEqual(4);
  });

  it("keeps dress idempotent and hides the bucket on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);
    dressFactory(scene);
    expect(interior.children.filter((c) => c.name === "factory-dress").length).toBe(1);
    expect(factoryBuckets(interior).length).toBe(1);
    expect(factoryOilCans(interior).length).toBe(1);
    expect(factoryTools(interior).length).toBe(1);

    undressFactory(scene);
    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

const VISE_PALETTE = new Set([
  KRAFT,
  0x9a6a40,
  0x6a4a32,
  0x6a7068,
  0x4a524c,
  0x8a9088,
  0x6a5a4a,
]);

function factoryVises(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "factory-vise" && obj.name === "factory-vise") {
      out.push(obj);
    }
  });
  return out;
}

describe("factory PAPER bench vise", () => {
  it("puts one kraft/iron PAPER vise on a factory workbench", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);

    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const vises = factoryVises(dress!);
    expect(vises.length).toBe(1);

    const vise = vises[0];
    expect(vise.userData.kind).toBe("factory-vise");
    expect(vise.userData.mode).toBe("PAPER");
    // First workbench lip top is ~1.005; vise sits on it, not the floor.
    expect(vise.position.y).toBeGreaterThan(0.95);
    expect(vise.position.y).toBeLessThan(1.12);
    expect(Math.abs(vise.position.x - -1.35)).toBeLessThan(1.15);
    expect(Math.abs(vise.position.z - -2.48)).toBeLessThan(0.4);

    const cans = factoryOilCans(dress!);
    expect(cans.length).toBe(1);
    const toCan = Math.hypot(
      vise.position.x - cans[0].position.x,
      vise.position.z - cans[0].position.z,
    );
    expect(toCan).toBeGreaterThan(0.8);

    const buckets = factoryBuckets(dress!);
    expect(buckets.length).toBe(1);
    const toBucket = Math.hypot(
      vise.position.x - buckets[0].position.x,
      vise.position.z - buckets[0].position.z,
    );
    expect(toBucket).toBeGreaterThan(2);

    const tools = factoryTools(dress!);
    expect(tools.length).toBe(1);
    const toWrench = Math.hypot(
      vise.position.x - tools[0].position.x,
      vise.position.z - tools[0].position.z,
    );
    expect(toWrench).toBeGreaterThan(2);

    const colors = hexes(vise);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => VISE_PALETTE.has(c))).toBe(true);
    expect(colors.some((c) => c === KRAFT || c === 0x6a4a32)).toBe(true);
    expect(colors.some((c) => c === 0x6a7068 || c === 0x4a524c)).toBe(true);

    let boxes = 0;
    vise.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("factory-vise");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(3);
  });

  it("keeps dress idempotent and hides the vise on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);
    dressFactory(scene);
    expect(interior.children.filter((c) => c.name === "factory-dress").length).toBe(1);
    expect(factoryVises(interior).length).toBe(1);
    expect(factoryBuckets(interior).length).toBe(1);
    expect(factoryOilCans(interior).length).toBe(1);
    expect(factoryTools(interior).length).toBe(1);

    undressFactory(scene);
    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

const MALLET_PALETTE = new Set([
  KRAFT,
  0x9a6a40,
  0x6a4a32,
  0x5a3a22,
]);

function factoryMallets(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === "factory-mallet" && obj.name === "factory-mallet") {
      out.push(obj);
    }
  });
  return out;
}

describe("factory PAPER bench mallet", () => {
  it("puts one kraft PAPER mallet on a factory workbench", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);

    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const mallets = factoryMallets(dress!);
    expect(mallets.length).toBe(1);

    const mallet = mallets[0];
    expect(mallet.userData.kind).toBe("factory-mallet");
    expect(mallet.userData.mode).toBe("PAPER");
    // First workbench lip top is ~1.005; mallet sits on it, not the floor.
    expect(mallet.position.y).toBeGreaterThan(0.95);
    expect(mallet.position.y).toBeLessThan(1.12);
    expect(Math.abs(mallet.position.x - -1.35)).toBeLessThan(1.15);
    expect(Math.abs(mallet.position.z - -2.48)).toBeLessThan(0.4);

    const vises = factoryVises(dress!);
    expect(vises.length).toBe(1);
    const toVise = Math.hypot(
      mallet.position.x - vises[0].position.x,
      mallet.position.z - vises[0].position.z,
    );
    expect(toVise).toBeGreaterThan(0.5);

    const cans = factoryOilCans(dress!);
    expect(cans.length).toBe(1);
    const toCan = Math.hypot(
      mallet.position.x - cans[0].position.x,
      mallet.position.z - cans[0].position.z,
    );
    expect(toCan).toBeGreaterThan(0.5);

    const buckets = factoryBuckets(dress!);
    expect(buckets.length).toBe(1);
    const toBucket = Math.hypot(
      mallet.position.x - buckets[0].position.x,
      mallet.position.z - buckets[0].position.z,
    );
    expect(toBucket).toBeGreaterThan(2);

    const tools = factoryTools(dress!);
    expect(tools.length).toBe(1);
    const toWrench = Math.hypot(
      mallet.position.x - tools[0].position.x,
      mallet.position.z - tools[0].position.z,
    );
    expect(toWrench).toBeGreaterThan(2);

    const colors = hexes(mallet);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => MALLET_PALETTE.has(c))).toBe(true);
    expect(colors.some((c) => c === KRAFT || c === 0x6a4a32)).toBe(true);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);

    let boxes = 0;
    mallet.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("factory-mallet");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the mallet on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);
    dressFactory(scene);
    expect(interior.children.filter((c) => c.name === "factory-dress").length).toBe(1);
    expect(factoryMallets(interior).length).toBe(1);
    expect(factoryVises(interior).length).toBe(1);
    expect(factoryBuckets(interior).length).toBe(1);
    expect(factoryOilCans(interior).length).toBe(1);
    expect(factoryTools(interior).length).toBe(1);

    undressFactory(scene);
    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});
