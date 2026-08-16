import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { makeInteriorScene } from "../public/harbour/interior.js";
import {
  dressWarehouse,
  isWarehousePlot,
  undressWarehouse,
} from "../public/harbour/warehouse.js";

const KRAFT = new Set([0x8a6238, 0x7a5230, 0x9a6a40, 0x5a3a22]);

function hexes(root: THREE.Object3D) {
  const colors: number[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
    if (mesh.isMesh && mat?.color) colors.push(mat.color.getHex());
  });
  return colors;
}

function isGrey(hex: number) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

function floorCrates(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.name === "warehouse-floor-crate") out.push(obj);
  });
  return out;
}

describe("warehouse PAPER floor crates", () => {
  it("matches warehouse plots only", () => {
    expect(isWarehousePlot({ use: "warehouse" })).toBe(true);
    expect(isWarehousePlot({ kind: "warehouse" })).toBe(true);
    expect(isWarehousePlot({ use: "house" })).toBe(false);
    expect(isWarehousePlot(null)).toBe(false);
  });

  it("puts 2–4 kraft PAPER crates on the downstairs floor", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const crates = floorCrates(dress!);
    expect(crates.length).toBeGreaterThanOrEqual(2);
    expect(crates.length).toBeLessThanOrEqual(4);

    for (const crate of crates) {
      expect(crate.userData.kind).toBe("warehouse-crate");
      expect(crate.userData.mode).toBe("PAPER");
      expect(crate.userData.part).toBe("floor-crate");
      expect(crate.position.y).toBe(0);
      expect(Math.abs(crate.position.x)).toBeLessThan(3.2);
      expect(Math.abs(crate.position.z)).toBeLessThan(3.0);
      const colors = hexes(crate);
      expect(colors.length).toBeGreaterThan(0);
      expect(colors.every((c) => KRAFT.has(c))).toBe(true);
      expect(colors.some((c) => c === 0x8a6238 || c === 0x7a5230 || c === 0x9a6a40)).toBe(true);
      expect(colors.every((c) => !isGrey(c))).toBe(true);
    }
  });

  it("keeps dress idempotent and hides crates on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);
    dressWarehouse(scene);
    expect(interior.children.filter((c) => c.name === "warehouse-dress").length).toBe(1);
    expect(floorCrates(interior).length).toBeGreaterThanOrEqual(2);

    undressWarehouse(scene);
    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("warehouse PAPER wall hook", () => {
  it("hangs a small iron PAPER hook on the warehouse wall", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();

    const hooks: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-hook" && obj.name === "warehouse-hook") {
        hooks.push(obj);
      }
    });
    expect(hooks.length).toBeGreaterThanOrEqual(1);

    const hook = hooks[0];
    expect(hook.userData.kind).toBe("warehouse-hook");
    expect(hook.userData.mode).toBe("PAPER");
    expect(hook.position.y).toBeGreaterThan(1.2);
    expect(hook.position.y).toBeLessThan(2.4);
    const onBack = Math.abs(hook.position.z) > 3.0;
    const onSide = Math.abs(hook.position.x) > 3.5;
    expect(onBack || onSide).toBe(true);

    const colors = hexes(hook);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x4a4036)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    hook.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-hook");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });
});

describe("warehouse PAPER wall clipboard", () => {
  it("hangs a kraft PAPER clipboard on the warehouse wall", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();

    const boards: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-clipboard" && obj.name === "warehouse-clipboard") {
        boards.push(obj);
      }
    });
    expect(boards.length).toBeGreaterThanOrEqual(1);

    const clipboard = boards[0];
    expect(clipboard.userData.kind).toBe("warehouse-clipboard");
    expect(clipboard.userData.mode).toBe("PAPER");
    expect(clipboard.position.y).toBeGreaterThan(1.2);
    expect(clipboard.position.y).toBeLessThan(2.4);
    const onBack = Math.abs(clipboard.position.z) > 3.0;
    const onSide = Math.abs(clipboard.position.x) > 3.5;
    expect(onBack || onSide).toBe(true);

    const colors = hexes(clipboard);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x8a6238)).toBe(true);
    expect(colors.some((c) => c === 0xf3efe4)).toBe(true);
    expect(colors.every((c) => c === 0xf3efe4 || !isGrey(c))).toBe(true);

    clipboard.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-clipboard");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });
});

describe("warehouse PAPER kraft broom", () => {
  it("leans one kraft PAPER broom on the warehouse wall", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const brooms: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-broom" && obj.name === "warehouse-broom") {
        brooms.push(obj);
      }
    });
    expect(brooms.length).toBe(1);

    const broom = brooms[0];
    expect(broom.userData.kind).toBe("warehouse-broom");
    expect(broom.userData.mode).toBe("PAPER");
    expect(broom.position.y).toBe(0);
    const onBack = Math.abs(broom.position.z) > 3.0;
    const onSide = Math.abs(broom.position.x) > 3.0;
    expect(onBack || onSide).toBe(true);

    const colors = hexes(broom);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => KRAFT.has(c))).toBe(true);
    expect(colors.some((c) => c === 0x8a6238 || c === 0x7a5230 || c === 0x9a6a40)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    broom.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-broom");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the broom on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);
    dressWarehouse(scene);
    expect(interior.children.filter((c) => c.name === "warehouse-dress").length).toBe(1);

    const dressed = interior.getObjectByName("warehouse-dress")!;
    const brooms: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "warehouse-broom") brooms.push(obj);
    });
    expect(brooms.length).toBe(1);

    undressWarehouse(scene);
    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

function horizDist(a: THREE.Object3D, b: THREE.Object3D) {
  const dx = a.position.x - b.position.x;
  const dz = a.position.z - b.position.z;
  return Math.hypot(dx, dz);
}

describe("warehouse PAPER kraft lantern", () => {
  it("hangs one kraft PAPER lantern with a wood bail and cream glass", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const lanterns: THREE.Object3D[] = [];
    const clipboards: THREE.Object3D[] = [];
    const hooks: THREE.Object3D[] = [];
    const brooms: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-lantern" && obj.name === "warehouse-lantern") {
        lanterns.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clipboard" && obj.name === "warehouse-clipboard") {
        clipboards.push(obj);
      }
      if (obj.userData?.kind === "warehouse-hook" && obj.name === "warehouse-hook") {
        hooks.push(obj);
      }
      if (obj.userData?.kind === "warehouse-broom" && obj.name === "warehouse-broom") {
        brooms.push(obj);
      }
    });
    expect(lanterns.length).toBe(1);
    expect(clipboards.length).toBeGreaterThanOrEqual(1);
    expect(hooks.length).toBeGreaterThanOrEqual(1);
    expect(brooms.length).toBe(1);

    const lantern = lanterns[0];
    expect(lantern.userData.kind).toBe("warehouse-lantern");
    expect(lantern.userData.mode).toBe("PAPER");
    expect(lantern.position.y).toBeGreaterThan(1.8);
    expect(lantern.position.y).toBeLessThan(2.8);
    expect(horizDist(lantern, clipboards[0])).toBeGreaterThan(1.5);
    expect(horizDist(lantern, hooks[0])).toBeGreaterThan(1.5);
    expect(horizDist(lantern, brooms[0])).toBeGreaterThan(1.5);

    const colors = hexes(lantern);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x8a6238)).toBe(true);
    expect(colors.some((c) => c === 0xe8d8a8)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    lantern.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-lantern");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(3);
  });

  it("keeps dress idempotent and hides the lantern on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);
    dressWarehouse(scene);
    expect(interior.children.filter((c) => c.name === "warehouse-dress").length).toBe(1);

    const dressed = interior.getObjectByName("warehouse-dress")!;
    const lanterns: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "warehouse-lantern") lanterns.push(obj);
    });
    expect(lanterns.length).toBe(1);

    undressWarehouse(scene);
    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("warehouse PAPER kraft coil", () => {
  it("sits one kraft PAPER rope coil on the warehouse floor", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const coils: THREE.Object3D[] = [];
    const crates: THREE.Object3D[] = [];
    const brooms: THREE.Object3D[] = [];
    const lanterns: THREE.Object3D[] = [];
    const clipboards: THREE.Object3D[] = [];
    const hooks: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-coil" && obj.name === "warehouse-coil") {
        coils.push(obj);
      }
      if (obj.name === "warehouse-floor-crate") crates.push(obj);
      if (obj.userData?.kind === "warehouse-broom" && obj.name === "warehouse-broom") {
        brooms.push(obj);
      }
      if (obj.userData?.kind === "warehouse-lantern" && obj.name === "warehouse-lantern") {
        lanterns.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clipboard" && obj.name === "warehouse-clipboard") {
        clipboards.push(obj);
      }
      if (obj.userData?.kind === "warehouse-hook" && obj.name === "warehouse-hook") {
        hooks.push(obj);
      }
    });
    expect(coils.length).toBe(1);
    expect(crates.length).toBeGreaterThanOrEqual(2);
    expect(brooms.length).toBe(1);
    expect(lanterns.length).toBe(1);
    expect(clipboards.length).toBeGreaterThanOrEqual(1);
    expect(hooks.length).toBeGreaterThanOrEqual(1);

    const coil = coils[0];
    expect(coil.userData.kind).toBe("warehouse-coil");
    expect(coil.userData.mode).toBe("PAPER");
    expect(coil.position.y).toBe(0);
    expect(Math.abs(coil.position.x)).toBeLessThan(3.2);
    expect(Math.abs(coil.position.z)).toBeLessThan(3.0);
    for (const crate of crates) expect(horizDist(coil, crate)).toBeGreaterThan(1.2);
    expect(horizDist(coil, brooms[0])).toBeGreaterThan(1.5);
    expect(horizDist(coil, lanterns[0])).toBeGreaterThan(1.5);
    expect(horizDist(coil, clipboards[0])).toBeGreaterThan(1.5);
    expect(horizDist(coil, hooks[0])).toBeGreaterThan(1.5);

    const colors = hexes(coil);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => KRAFT.has(c))).toBe(true);
    expect(colors.some((c) => c === 0x8a6238 || c === 0x7a5230 || c === 0x9a6a40)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    coil.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-coil");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the coil on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);
    dressWarehouse(scene);
    expect(interior.children.filter((c) => c.name === "warehouse-dress").length).toBe(1);

    const dressed = interior.getObjectByName("warehouse-dress")!;
    const coils: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "warehouse-coil") coils.push(obj);
    });
    expect(coils.length).toBe(1);

    undressWarehouse(scene);
    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("warehouse PAPER kraft pallet", () => {
  it("sits one kraft PAPER pallet on the warehouse floor", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const pallets: THREE.Object3D[] = [];
    const crates: THREE.Object3D[] = [];
    const coils: THREE.Object3D[] = [];
    const brooms: THREE.Object3D[] = [];
    const lanterns: THREE.Object3D[] = [];
    const clipboards: THREE.Object3D[] = [];
    const hooks: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-pallet" && obj.name === "warehouse-pallet") {
        pallets.push(obj);
      }
      if (obj.name === "warehouse-floor-crate") crates.push(obj);
      if (obj.userData?.kind === "warehouse-coil" && obj.name === "warehouse-coil") {
        coils.push(obj);
      }
      if (obj.userData?.kind === "warehouse-broom" && obj.name === "warehouse-broom") {
        brooms.push(obj);
      }
      if (obj.userData?.kind === "warehouse-lantern" && obj.name === "warehouse-lantern") {
        lanterns.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clipboard" && obj.name === "warehouse-clipboard") {
        clipboards.push(obj);
      }
      if (obj.userData?.kind === "warehouse-hook" && obj.name === "warehouse-hook") {
        hooks.push(obj);
      }
    });
    expect(pallets.length).toBe(1);
    expect(crates.length).toBeGreaterThanOrEqual(2);
    expect(coils.length).toBe(1);
    expect(brooms.length).toBe(1);
    expect(lanterns.length).toBe(1);
    expect(clipboards.length).toBeGreaterThanOrEqual(1);
    expect(hooks.length).toBeGreaterThanOrEqual(1);

    const pallet = pallets[0];
    expect(pallet.userData.kind).toBe("warehouse-pallet");
    expect(pallet.userData.mode).toBe("PAPER");
    expect(pallet.position.y).toBe(0);
    expect(Math.abs(pallet.position.x)).toBeLessThan(3.2);
    expect(Math.abs(pallet.position.z)).toBeLessThan(3.0);
    for (const crate of crates) expect(horizDist(pallet, crate)).toBeGreaterThan(1.2);
    expect(horizDist(pallet, coils[0])).toBeGreaterThan(1.5);
    expect(horizDist(pallet, brooms[0])).toBeGreaterThan(1.5);
    expect(horizDist(pallet, lanterns[0])).toBeGreaterThan(1.5);
    expect(horizDist(pallet, clipboards[0])).toBeGreaterThan(1.5);
    expect(horizDist(pallet, hooks[0])).toBeGreaterThan(1.5);

    const colors = hexes(pallet);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => KRAFT.has(c))).toBe(true);
    expect(colors.some((c) => c === 0x8a6238 || c === 0x7a5230 || c === 0x9a6a40)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    pallet.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-pallet");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the pallet on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);
    dressWarehouse(scene);
    expect(interior.children.filter((c) => c.name === "warehouse-dress").length).toBe(1);

    const dressed = interior.getObjectByName("warehouse-dress")!;
    const pallets: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "warehouse-pallet") pallets.push(obj);
    });
    expect(pallets.length).toBe(1);

    undressWarehouse(scene);
    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("warehouse PAPER kraft chalk", () => {
  it("sits one kraft PAPER chalk stick on the warehouse clipboard", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const chalks: THREE.Object3D[] = [];
    const crates: THREE.Object3D[] = [];
    const pallets: THREE.Object3D[] = [];
    const coils: THREE.Object3D[] = [];
    const brooms: THREE.Object3D[] = [];
    const lanterns: THREE.Object3D[] = [];
    const clipboards: THREE.Object3D[] = [];
    const hooks: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-chalk" && obj.name === "warehouse-chalk") {
        chalks.push(obj);
      }
      if (obj.name === "warehouse-floor-crate") crates.push(obj);
      if (obj.userData?.kind === "warehouse-pallet" && obj.name === "warehouse-pallet") {
        pallets.push(obj);
      }
      if (obj.userData?.kind === "warehouse-coil" && obj.name === "warehouse-coil") {
        coils.push(obj);
      }
      if (obj.userData?.kind === "warehouse-broom" && obj.name === "warehouse-broom") {
        brooms.push(obj);
      }
      if (obj.userData?.kind === "warehouse-lantern" && obj.name === "warehouse-lantern") {
        lanterns.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clipboard" && obj.name === "warehouse-clipboard") {
        clipboards.push(obj);
      }
      if (obj.userData?.kind === "warehouse-hook" && obj.name === "warehouse-hook") {
        hooks.push(obj);
      }
    });
    expect(chalks.length).toBe(1);
    expect(crates.length).toBeGreaterThanOrEqual(2);
    expect(pallets.length).toBe(1);
    expect(coils.length).toBe(1);
    expect(brooms.length).toBe(1);
    expect(lanterns.length).toBe(1);
    expect(clipboards.length).toBeGreaterThanOrEqual(1);
    expect(hooks.length).toBeGreaterThanOrEqual(1);

    const chalk = chalks[0];
    expect(chalk.userData.kind).toBe("warehouse-chalk");
    expect(chalk.userData.mode).toBe("PAPER");
    expect(chalk.position.y).toBeGreaterThan(1.2);
    expect(chalk.position.y).toBeLessThan(2.4);
    const onBack = Math.abs(chalk.position.z) > 3.0;
    const onSide = Math.abs(chalk.position.x) > 3.5;
    expect(onBack || onSide).toBe(true);
    expect(horizDist(chalk, clipboards[0])).toBeLessThan(0.5);
    for (const crate of crates) expect(horizDist(chalk, crate)).toBeGreaterThan(1.2);
    expect(horizDist(chalk, pallets[0])).toBeGreaterThan(1.5);
    expect(horizDist(chalk, coils[0])).toBeGreaterThan(1.5);
    expect(horizDist(chalk, brooms[0])).toBeGreaterThan(1.5);
    expect(horizDist(chalk, lanterns[0])).toBeGreaterThan(1.5);
    expect(horizDist(chalk, hooks[0])).toBeGreaterThan(1.5);

    const colors = hexes(chalk);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === 0xf3efe4 || c === 0x8a6238 || c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf3efe4)).toBe(true);
    expect(colors.some((c) => c === 0x8a6238 || c === 0x5a3a22)).toBe(true);
    expect(colors.every((c) => c === 0xf3efe4 || !isGrey(c))).toBe(true);

    let boxes = 0;
    chalk.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-chalk");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the chalk on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);
    dressWarehouse(scene);
    expect(interior.children.filter((c) => c.name === "warehouse-dress").length).toBe(1);

    const dressed = interior.getObjectByName("warehouse-dress")!;
    const chalks: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "warehouse-chalk") chalks.push(obj);
    });
    expect(chalks.length).toBe(1);

    undressWarehouse(scene);
    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("warehouse PAPER kraft pencil", () => {
  it("sits one small kraft PAPER pencil on the warehouse clipboard", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const pencils: THREE.Object3D[] = [];
    const chalks: THREE.Object3D[] = [];
    const crates: THREE.Object3D[] = [];
    const pallets: THREE.Object3D[] = [];
    const clipboards: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-pencil" && obj.name === "warehouse-pencil") {
        pencils.push(obj);
      }
      if (obj.userData?.kind === "warehouse-chalk" && obj.name === "warehouse-chalk") {
        chalks.push(obj);
      }
      if (obj.name === "warehouse-floor-crate") crates.push(obj);
      if (obj.userData?.kind === "warehouse-pallet" && obj.name === "warehouse-pallet") {
        pallets.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clipboard" && obj.name === "warehouse-clipboard") {
        clipboards.push(obj);
      }
    });
    expect(pencils.length).toBe(1);
    expect(chalks.length).toBe(1);
    expect(crates.length).toBeGreaterThanOrEqual(2);
    expect(pallets.length).toBe(1);
    expect(clipboards.length).toBeGreaterThanOrEqual(1);

    const pencil = pencils[0];
    expect(pencil.userData.kind).toBe("warehouse-pencil");
    expect(pencil.userData.mode).toBe("PAPER");
    expect(pencil.userData.part).toBe("pencil");
    expect(pencil.position.y).toBeGreaterThan(1.2);
    expect(pencil.position.y).toBeLessThan(2.4);
    const onBack = Math.abs(pencil.position.z) > 3.0;
    const onSide = Math.abs(pencil.position.x) > 3.5;
    expect(onBack || onSide).toBe(true);
    expect(horizDist(pencil, clipboards[0])).toBeLessThan(0.5);
    expect(horizDist(pencil, chalks[0])).toBeLessThan(0.5);
    for (const crate of crates) expect(horizDist(pencil, crate)).toBeGreaterThan(1.2);
    expect(horizDist(pencil, pallets[0])).toBeGreaterThan(1.5);

    const colors = hexes(pencil);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === 0x8a6238 || c === 0x5a3a22 || c === 0xf3efe4)).toBe(true);
    expect(colors.some((c) => c === 0x8a6238 || c === 0x5a3a22)).toBe(true);
    expect(colors.every((c) => c === 0xf3efe4 || !isGrey(c))).toBe(true);

    let boxes = 0;
    pencil.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-pencil");
        expect(mesh.userData.mode).toBe("PAPER");
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox!;
        const w = bb.max.x - bb.min.x;
        const h = bb.max.y - bb.min.y;
        const d = bb.max.z - bb.min.z;
        expect(Math.max(w, h, d)).toBeLessThan(0.25);
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });

  it("keeps dress idempotent and hides the pencil on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);
    dressWarehouse(scene);
    expect(interior.children.filter((c) => c.name === "warehouse-dress").length).toBe(1);

    const dressed = interior.getObjectByName("warehouse-dress")!;
    const pencils: THREE.Object3D[] = [];
    const chalks: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "warehouse-pencil") pencils.push(obj);
      if (obj.name === "warehouse-chalk") chalks.push(obj);
    });
    expect(pencils.length).toBe(1);
    expect(chalks.length).toBe(1);

    undressWarehouse(scene);
    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});
