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

const RAG_PALETTE = new Set([
  KRAFT,
  0x6a4a32,
  0xf3efe4,
]);

function factoryRags(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "rag") {
      out.push(obj);
    }
  });
  return out;
}

describe("factory PAPER bench rag", () => {
  it("puts one small kraft PAPER rag on a factory workbench", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);

    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const rags = factoryRags(dress!);
    expect(rags.length).toBe(1);

    const rag = rags[0];
    expect(rag.userData.part).toBe("rag");
    expect(rag.userData.mode).toBe("PAPER");
    // First workbench lip top is ~1.005; rag sits on it, not the floor.
    expect(rag.position.y).toBeGreaterThan(0.95);
    expect(rag.position.y).toBeLessThan(1.12);
    expect(Math.abs(rag.position.x - -1.35)).toBeLessThan(1.15);
    expect(Math.abs(rag.position.z - -2.48)).toBeLessThan(0.4);

    const mallets = factoryMallets(dress!);
    expect(mallets.length).toBe(1);
    const toMallet = Math.hypot(
      rag.position.x - mallets[0].position.x,
      rag.position.z - mallets[0].position.z,
    );
    expect(toMallet).toBeGreaterThan(0.5);

    const vises = factoryVises(dress!);
    expect(vises.length).toBe(1);
    const toVise = Math.hypot(
      rag.position.x - vises[0].position.x,
      rag.position.z - vises[0].position.z,
    );
    expect(toVise).toBeGreaterThan(0.5);

    const cans = factoryOilCans(dress!);
    expect(cans.length).toBe(1);
    const toCan = Math.hypot(
      rag.position.x - cans[0].position.x,
      rag.position.z - cans[0].position.z,
    );
    expect(toCan).toBeGreaterThan(0.5);

    const buckets = factoryBuckets(dress!);
    expect(buckets.length).toBe(1);
    const toBucket = Math.hypot(
      rag.position.x - buckets[0].position.x,
      rag.position.z - buckets[0].position.z,
    );
    expect(toBucket).toBeGreaterThan(2);

    const tools = factoryTools(dress!);
    expect(tools.length).toBe(1);
    const toWrench = Math.hypot(
      rag.position.x - tools[0].position.x,
      rag.position.z - tools[0].position.z,
    );
    expect(toWrench).toBeGreaterThan(2);

    const colors = hexes(rag);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => RAG_PALETTE.has(c))).toBe(true);
    expect(colors.some((c) => c === KRAFT || c === 0x6a4a32 || c === 0xf3efe4)).toBe(true);

    const size = new THREE.Box3().setFromObject(rag).getSize(new THREE.Vector3());
    expect(size.x).toBeLessThan(0.28);
    expect(size.y).toBeLessThan(0.08);
    expect(size.z).toBeLessThan(0.22);

    let boxes = 0;
    rag.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the rag on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);
    dressFactory(scene);
    expect(interior.children.filter((c) => c.name === "factory-dress").length).toBe(1);
    expect(factoryRags(interior).length).toBe(1);
    expect(factoryMallets(interior).length).toBe(1);
    expect(factoryOilCans(interior).length).toBe(1);
    expect(factoryTools(interior).length).toBe(1);

    undressFactory(scene);
    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

const RIVET_PALETTE = new Set([KRAFT, 0x6a4a32]);

function factoryRivets(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "rivet") {
      out.push(obj);
    }
  });
  return out;
}

describe("factory PAPER bench rivet", () => {
  it("puts one small kraft PAPER rivet on a factory workbench", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);

    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const rivets = factoryRivets(dress!);
    expect(rivets.length).toBe(1);

    const rivet = rivets[0];
    expect(rivet.userData.part).toBe("rivet");
    expect(rivet.userData.mode).toBe("PAPER");
    // First workbench lip top is ~1.005; rivet sits on it, not the floor.
    expect(rivet.position.y).toBeGreaterThan(0.95);
    expect(rivet.position.y).toBeLessThan(1.12);
    expect(Math.abs(rivet.position.x - -1.35)).toBeLessThan(1.15);
    expect(Math.abs(rivet.position.z - -2.48)).toBeLessThan(0.4);

    const rags = factoryRags(dress!);
    expect(rags.length).toBe(1);
    const toRag = Math.hypot(
      rivet.position.x - rags[0].position.x,
      rivet.position.z - rags[0].position.z,
    );
    expect(toRag).toBeGreaterThan(0.5);

    const mallets = factoryMallets(dress!);
    expect(mallets.length).toBe(1);
    const toMallet = Math.hypot(
      rivet.position.x - mallets[0].position.x,
      rivet.position.z - mallets[0].position.z,
    );
    expect(toMallet).toBeGreaterThan(0.5);

    const cans = factoryOilCans(dress!);
    expect(cans.length).toBe(1);
    const toCan = Math.hypot(
      rivet.position.x - cans[0].position.x,
      rivet.position.z - cans[0].position.z,
    );
    expect(toCan).toBeGreaterThan(0.5);

    const vises = factoryVises(dress!);
    expect(vises.length).toBe(1);
    const toVise = Math.hypot(
      rivet.position.x - vises[0].position.x,
      rivet.position.z - vises[0].position.z,
    );
    expect(toVise).toBeGreaterThan(0.5);

    const buckets = factoryBuckets(dress!);
    expect(buckets.length).toBe(1);
    const toBucket = Math.hypot(
      rivet.position.x - buckets[0].position.x,
      rivet.position.z - buckets[0].position.z,
    );
    expect(toBucket).toBeGreaterThan(2);

    const tools = factoryTools(dress!);
    expect(tools.length).toBe(1);
    const toWrench = Math.hypot(
      rivet.position.x - tools[0].position.x,
      rivet.position.z - tools[0].position.z,
    );
    expect(toWrench).toBeGreaterThan(2);

    const colors = hexes(rivet);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => RIVET_PALETTE.has(c))).toBe(true);
    expect(colors.some((c) => c === KRAFT)).toBe(true);

    const size = new THREE.Box3().setFromObject(rivet).getSize(new THREE.Vector3());
    expect(size.x).toBeLessThan(0.12);
    expect(size.y).toBeLessThan(0.08);
    expect(size.z).toBeLessThan(0.12);

    let boxes = 0;
    rivet.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
  });

  it("keeps dress idempotent and hides the rivet on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);
    dressFactory(scene);
    expect(interior.children.filter((c) => c.name === "factory-dress").length).toBe(1);
    expect(factoryRivets(interior).length).toBe(1);
    expect(factoryRags(interior).length).toBe(1);
    expect(factoryMallets(interior).length).toBe(1);
    expect(factoryOilCans(interior).length).toBe(1);
    expect(factoryTools(interior).length).toBe(1);

    undressFactory(scene);
    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

function factoryPaperOilcans(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "oilcan") {
      out.push(obj);
    }
  });
  return out;
}

describe("factory PAPER kraft oilcan", () => {
  it("puts one tiny kraft PAPER oilcan on a factory bench, rag and rivet remain", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);

    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const cans = factoryPaperOilcans(dress!);
    expect(cans.length).toBe(1);
    const can = cans[0];
    expect(can.userData.part).toBe("oilcan");
    expect(can.userData.mode).toBe("PAPER");
    expect(can.userData.part).not.toBe("rag");
    expect(can.userData.part).not.toBe("rivet");
    expect(can.userData.part).not.toBe("wrench");
    expect(can.userData.part).not.toBe("scrap-bin");
    expect(can.userData.part).not.toBe("floor-grate");

    expect(factoryRags(dress!).length).toBe(1);
    expect(factoryRivets(dress!).length).toBe(1);

    const rag = factoryRags(dress!)[0];
    const rivet = factoryRivets(dress!)[0];
    const toRag = Math.hypot(can.position.x - rag.position.x, can.position.z - rag.position.z);
    const toRivet = Math.hypot(can.position.x - rivet.position.x, can.position.z - rivet.position.z);
    expect(toRag).toBeGreaterThan(0.5);
    expect(toRivet).toBeGreaterThan(0.5);

    const colors = hexes(can);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.every((c) => [KRAFT, 0x9a6a40, 0x6a4a32].includes(c))).toBe(true);

    let boxes = 0;
    can.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });
});

function factoryPaperFunnels(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "funnel") {
      out.push(obj);
    }
  });
  return out;
}

describe("factory PAPER kraft funnel", () => {
  it("puts one tiny kraft PAPER funnel on a factory bench, oilcan and rag remain", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);

    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const funnels = factoryPaperFunnels(dress!);
    expect(funnels.length).toBe(1);
    const funnel = funnels[0];
    expect(funnel.userData.part).toBe("funnel");
    expect(funnel.userData.mode).toBe("PAPER");
    expect(funnel.userData.part).not.toBe("oilcan");
    expect(funnel.userData.part).not.toBe("rag");
    expect(funnel.userData.part).not.toBe("rivet");
    expect(funnel.userData.part).not.toBe("wrench");

    expect(factoryPaperOilcans(dress!).length).toBe(1);
    expect(factoryRags(dress!).length).toBe(1);

    const can = factoryPaperOilcans(dress!)[0];
    const rag = factoryRags(dress!)[0];
    const toCan = Math.hypot(funnel.position.x - can.position.x, funnel.position.z - can.position.z);
    const toRag = Math.hypot(funnel.position.x - rag.position.x, funnel.position.z - rag.position.z);
    expect(toCan).toBeGreaterThan(0.5);
    expect(toRag).toBeGreaterThan(0.5);

    const colors = hexes(funnel);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.every((c) => [KRAFT, 0x9a6a40, 0x6a4a32].includes(c))).toBe(true);

    let boxes = 0;
    funnel.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });
});

function factoryPaperCorks(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.part === "cork") {
      out.push(obj);
    }
  });
  return out;
}

describe("factory PAPER kraft cork", () => {
  it("puts one tiny kraft PAPER cork on a factory bench, funnel and oilcan remain", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressFactory(scene);

    const dress = interior.getObjectByName("factory-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const corks = factoryPaperCorks(dress!);
    expect(corks.length).toBe(1);
    const cork = corks[0];
    expect(cork.userData.part).toBe("cork");
    expect(cork.userData.mode).toBe("PAPER");
    expect(cork.userData.part).not.toBe("funnel");
    expect(cork.userData.part).not.toBe("oilcan");
    expect(cork.userData.part).not.toBe("rag");

    expect(factoryPaperFunnels(dress!).length).toBe(1);
    expect(factoryPaperOilcans(dress!).length).toBe(1);

    const funnel = factoryPaperFunnels(dress!)[0];
    const can = factoryPaperOilcans(dress!)[0];
    const rag = factoryRags(dress!)[0];
    const toFunnel = Math.hypot(cork.position.x - funnel.position.x, cork.position.z - funnel.position.z);
    const toCan = Math.hypot(cork.position.x - can.position.x, cork.position.z - can.position.z);
    const toRag = Math.hypot(cork.position.x - rag.position.x, cork.position.z - rag.position.z);
    expect(toFunnel).toBeGreaterThan(0.5);
    expect(toCan).toBeGreaterThan(0.5);
    expect(toRag).toBeGreaterThan(0.5);

    const colors = hexes(cork);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.every((c) => [KRAFT, 0x9a6a40, 0x6a4a32].includes(c))).toBe(true);

    let boxes = 0;
    cork.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });
});
