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
    const pencils: THREE.Object3D[] = [];
    const clips: THREE.Object3D[] = [];
    const stamps: THREE.Object3D[] = [];
    const cards: THREE.Object3D[] = [];
    const twines: THREE.Object3D[] = [];
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
      if (obj.userData?.kind === "warehouse-pencil" && obj.name === "warehouse-pencil") {
        pencils.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clip" && obj.name === "warehouse-clip") {
        clips.push(obj);
      }
      if (obj.userData?.kind === "warehouse-stamp" && obj.name === "warehouse-stamp") {
        stamps.push(obj);
      }
      if (obj.userData?.kind === "warehouse-card" && obj.name === "warehouse-card") {
        cards.push(obj);
      }
      if (obj.userData?.kind === "warehouse-twine" && obj.name === "warehouse-twine") {
        twines.push(obj);
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
    expect(pencils.length).toBe(1);
    expect(clips.length).toBe(1);
    expect(stamps.length).toBe(1);
    expect(cards.length).toBe(1);
    expect(twines.length).toBe(1);
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
    expect(chalk.userData.part).toBe("chalk");
    expect(pencils[0].userData.part).toBe("pencil");
    expect(clips[0].userData.part).toBe("clip");
    expect(stamps[0].userData.part).toBe("stamp");
    expect(cards[0].userData.part).toBe("card");
    expect(twines[0].userData.part).toBe("twine");
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

describe("warehouse PAPER kraft twine", () => {
  it("sits one small kraft PAPER twine ball on a warehouse crate", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const twines: THREE.Object3D[] = [];
    const pencils: THREE.Object3D[] = [];
    const chalks: THREE.Object3D[] = [];
    const clipboards: THREE.Object3D[] = [];
    const pallets: THREE.Object3D[] = [];
    const dollies: THREE.Object3D[] = [];
    const crates: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-twine" && obj.name === "warehouse-twine") {
        twines.push(obj);
      }
      if (obj.userData?.kind === "warehouse-pencil" && obj.name === "warehouse-pencil") {
        pencils.push(obj);
      }
      if (obj.userData?.kind === "warehouse-chalk" && obj.name === "warehouse-chalk") {
        chalks.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clipboard" && obj.name === "warehouse-clipboard") {
        clipboards.push(obj);
      }
      if (obj.userData?.kind === "warehouse-pallet" && obj.name === "warehouse-pallet") {
        pallets.push(obj);
      }
      if (obj.userData?.kind === "warehouse-dolly" && obj.name === "warehouse-dolly") {
        dollies.push(obj);
      }
      if (obj.name === "warehouse-floor-crate") crates.push(obj);
    });
    expect(twines.length).toBe(1);
    expect(pencils.length).toBe(1);
    expect(chalks.length).toBe(1);
    expect(clipboards.length).toBeGreaterThanOrEqual(1);
    expect(pallets.length).toBe(1);
    expect(dollies.length).toBe(1);
    expect(crates.length).toBeGreaterThanOrEqual(2);

    const twine = twines[0];
    expect(twine.userData.kind).toBe("warehouse-twine");
    expect(twine.userData.mode).toBe("PAPER");
    expect(twine.userData.part).toBe("twine");
    expect(horizDist(twine, pencils[0])).toBeGreaterThan(1.5);
    expect(horizDist(twine, chalks[0])).toBeGreaterThan(1.5);
    expect(horizDist(twine, clipboards[0])).toBeGreaterThan(1.5);
    expect(horizDist(twine, pallets[0])).toBeGreaterThan(1.5);
    expect(horizDist(twine, dollies[0])).toBeGreaterThan(1.5);
    for (const crate of crates) expect(horizDist(twine, crate)).toBeGreaterThan(1.2);

    const colors = hexes(twine);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === 0x8a6238 || c === 0x5a3a22 || c === 0xf3efe4)).toBe(true);
    expect(colors.some((c) => c === 0x8a6238 || c === 0x5a3a22)).toBe(true);
    expect(colors.every((c) => c === 0xf3efe4 || !isGrey(c))).toBe(true);

    let boxes = 0;
    twine.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-twine");
        expect(mesh.userData.mode).toBe("PAPER");
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox!;
        const w = bb.max.x - bb.min.x;
        const h = bb.max.y - bb.min.y;
        const d = bb.max.z - bb.min.z;
        expect(Math.max(w, h, d)).toBeLessThan(0.25);
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
  });

  it("keeps dress idempotent and hides the twine on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);
    dressWarehouse(scene);
    expect(interior.children.filter((c) => c.name === "warehouse-dress").length).toBe(1);

    const dressed = interior.getObjectByName("warehouse-dress")!;
    const twines: THREE.Object3D[] = [];
    const pencils: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "warehouse-twine") twines.push(obj);
      if (obj.name === "warehouse-pencil") pencils.push(obj);
    });
    expect(twines.length).toBe(1);
    expect(pencils.length).toBe(1);

    undressWarehouse(scene);
    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("warehouse PAPER kraft inventory card", () => {
  it("sits one tiny kraft PAPER card on a crate; pencil and twine stay", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const cards: THREE.Object3D[] = [];
    const pencils: THREE.Object3D[] = [];
    const twines: THREE.Object3D[] = [];
    const chalks: THREE.Object3D[] = [];
    const brooms: THREE.Object3D[] = [];
    const crates: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-card" && obj.name === "warehouse-card") {
        cards.push(obj);
      }
      if (obj.userData?.kind === "warehouse-pencil" && obj.name === "warehouse-pencil") {
        pencils.push(obj);
      }
      if (obj.userData?.kind === "warehouse-twine" && obj.name === "warehouse-twine") {
        twines.push(obj);
      }
      if (obj.userData?.kind === "warehouse-chalk" && obj.name === "warehouse-chalk") {
        chalks.push(obj);
      }
      if (obj.userData?.kind === "warehouse-broom" && obj.name === "warehouse-broom") {
        brooms.push(obj);
      }
      if (obj.name === "warehouse-floor-crate") crates.push(obj);
    });
    expect(cards.length).toBe(1);
    expect(pencils.length).toBe(1);
    expect(twines.length).toBe(1);

    const card = cards[0];
    expect(card.userData.kind).toBe("warehouse-card");
    expect(card.userData.mode).toBe("PAPER");
    expect(card.userData.part).toBe("card");
    expect(horizDist(card, pencils[0])).toBeGreaterThan(1.5);
    expect(horizDist(card, twines[0])).toBeGreaterThan(1.5);
    expect(horizDist(card, chalks[0])).toBeGreaterThan(1.5);
    expect(horizDist(card, brooms[0])).toBeGreaterThan(1.5);
    for (const crate of crates) expect(horizDist(card, crate)).toBeGreaterThan(1.2);

    const colors = hexes(card);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === 0xf3efe4 || c === 0x5a3a22 || c === 0x8a6238)).toBe(true);
    expect(colors.some((c) => c === 0xf3efe4)).toBe(true);
    expect(colors.every((c) => c === 0xf3efe4 || !isGrey(c))).toBe(true);

    let boxes = 0;
    card.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-card");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
  });
});

describe("warehouse PAPER kraft clip", () => {
  it("sits one tiny kraft PAPER clip on the clipboard; card and pencil remain", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const clips: THREE.Object3D[] = [];
    const cards: THREE.Object3D[] = [];
    const pencils: THREE.Object3D[] = [];
    const twines: THREE.Object3D[] = [];
    const chalks: THREE.Object3D[] = [];
    const brooms: THREE.Object3D[] = [];
    const clipboards: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-clip" && obj.name === "warehouse-clip") {
        clips.push(obj);
      }
      if (obj.userData?.kind === "warehouse-card" && obj.name === "warehouse-card") {
        cards.push(obj);
      }
      if (obj.userData?.kind === "warehouse-pencil" && obj.name === "warehouse-pencil") {
        pencils.push(obj);
      }
      if (obj.userData?.kind === "warehouse-twine" && obj.name === "warehouse-twine") {
        twines.push(obj);
      }
      if (obj.userData?.kind === "warehouse-chalk" && obj.name === "warehouse-chalk") {
        chalks.push(obj);
      }
      if (obj.userData?.kind === "warehouse-broom" && obj.name === "warehouse-broom") {
        brooms.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clipboard" && obj.name === "warehouse-clipboard") {
        clipboards.push(obj);
      }
    });
    expect(clips.length).toBe(1);
    expect(cards.length).toBe(1);
    expect(pencils.length).toBe(1);

    const clip = clips[0];
    expect(clip.userData.kind).toBe("warehouse-clip");
    expect(clip.userData.mode).toBe("PAPER");
    expect(clip.userData.part).toBe("clip");
    expect(clip.position.y).toBeGreaterThan(1.2);
    expect(clip.position.y).toBeLessThan(2.4);
    const onBack = Math.abs(clip.position.z) > 3.0;
    const onSide = Math.abs(clip.position.x) > 3.5;
    expect(onBack || onSide).toBe(true);
    expect(horizDist(clip, clipboards[0])).toBeLessThan(0.5);
    expect(horizDist(clip, cards[0])).toBeGreaterThan(1.5);
    expect(horizDist(clip, twines[0])).toBeGreaterThan(1.5);
    expect(horizDist(clip, brooms[0])).toBeGreaterThan(1.5);
    expect(cards[0].userData.part).toBe("card");
    expect(pencils[0].userData.part).toBe("pencil");

    const colors = hexes(clip);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === 0xf3efe4 || c === 0x5a3a22 || c === 0x8a6238)).toBe(true);
    expect(colors.some((c) => c === 0x5a3a22 || c === 0x8a6238)).toBe(true);
    expect(colors.every((c) => c === 0xf3efe4 || !isGrey(c))).toBe(true);

    let boxes = 0;
    clip.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-clip");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
  });
});

describe("warehouse PAPER kraft stamp", () => {
  it("sits one tiny kraft PAPER stamp on the clipboard; clip and card remain", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const stamps: THREE.Object3D[] = [];
    const clips: THREE.Object3D[] = [];
    const cards: THREE.Object3D[] = [];
    const pencils: THREE.Object3D[] = [];
    const twines: THREE.Object3D[] = [];
    const clipboards: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-stamp" && obj.name === "warehouse-stamp") {
        stamps.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clip" && obj.name === "warehouse-clip") {
        clips.push(obj);
      }
      if (obj.userData?.kind === "warehouse-card" && obj.name === "warehouse-card") {
        cards.push(obj);
      }
      if (obj.userData?.kind === "warehouse-pencil" && obj.name === "warehouse-pencil") {
        pencils.push(obj);
      }
      if (obj.userData?.kind === "warehouse-twine" && obj.name === "warehouse-twine") {
        twines.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clipboard" && obj.name === "warehouse-clipboard") {
        clipboards.push(obj);
      }
    });
    expect(stamps.length).toBe(1);
    expect(clips.length).toBe(1);
    expect(cards.length).toBe(1);

    const stamp = stamps[0];
    expect(stamp.userData.kind).toBe("warehouse-stamp");
    expect(stamp.userData.mode).toBe("PAPER");
    expect(stamp.userData.part).toBe("stamp");
    expect(stamp.position.y).toBeGreaterThan(1.2);
    expect(stamp.position.y).toBeLessThan(2.4);
    const onBack = Math.abs(stamp.position.z) > 3.0;
    const onSide = Math.abs(stamp.position.x) > 3.5;
    expect(onBack || onSide).toBe(true);
    expect(horizDist(stamp, clipboards[0])).toBeLessThan(0.5);
    expect(horizDist(stamp, cards[0])).toBeGreaterThan(1.5);
    expect(horizDist(stamp, twines[0])).toBeGreaterThan(1.5);
    expect(clips[0].userData.part).toBe("clip");
    expect(cards[0].userData.part).toBe("card");
    expect(pencils[0].userData.part).toBe("pencil");

    const colors = hexes(stamp);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === 0xf3efe4 || c === 0x5a3a22 || c === 0x8a6238)).toBe(true);
    expect(colors.some((c) => c === 0x5a3a22 || c === 0x8a6238)).toBe(true);
    expect(colors.every((c) => c === 0xf3efe4 || !isGrey(c))).toBe(true);

    let boxes = 0;
    stamp.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-stamp");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
  });
});

describe("warehouse PAPER kraft eraser", () => {
  it("sits one tiny kraft PAPER eraser on the clipboard; stamp, clip, pencil stay", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const erasers: THREE.Object3D[] = [];
    const stamps: THREE.Object3D[] = [];
    const clips: THREE.Object3D[] = [];
    const pencils: THREE.Object3D[] = [];
    const cards: THREE.Object3D[] = [];
    const twines: THREE.Object3D[] = [];
    const chalks: THREE.Object3D[] = [];
    const clipboards: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-eraser" && obj.name === "warehouse-eraser") {
        erasers.push(obj);
      }
      if (obj.userData?.kind === "warehouse-stamp" && obj.name === "warehouse-stamp") {
        stamps.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clip" && obj.name === "warehouse-clip") {
        clips.push(obj);
      }
      if (obj.userData?.kind === "warehouse-pencil" && obj.name === "warehouse-pencil") {
        pencils.push(obj);
      }
      if (obj.userData?.kind === "warehouse-card" && obj.name === "warehouse-card") {
        cards.push(obj);
      }
      if (obj.userData?.kind === "warehouse-twine" && obj.name === "warehouse-twine") {
        twines.push(obj);
      }
      if (obj.userData?.kind === "warehouse-chalk" && obj.name === "warehouse-chalk") {
        chalks.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clipboard" && obj.name === "warehouse-clipboard") {
        clipboards.push(obj);
      }
    });
    expect(erasers.length).toBe(1);
    expect(stamps.length).toBe(1);
    expect(clips.length).toBe(1);
    expect(pencils.length).toBe(1);
    expect(cards.length).toBe(1);
    expect(twines.length).toBe(1);
    expect(chalks.length).toBe(1);

    const eraser = erasers[0];
    expect(eraser.userData.kind).toBe("warehouse-eraser");
    expect(eraser.userData.mode).toBe("PAPER");
    expect(eraser.userData.part).toBe("eraser");
    expect(eraser.position.y).toBeGreaterThan(1.2);
    expect(eraser.position.y).toBeLessThan(2.4);
    const onBack = Math.abs(eraser.position.z) > 3.0;
    const onSide = Math.abs(eraser.position.x) > 3.5;
    expect(onBack || onSide).toBe(true);
    expect(horizDist(eraser, clipboards[0])).toBeLessThan(0.5);
    expect(horizDist(eraser, cards[0])).toBeGreaterThan(1.5);
    expect(horizDist(eraser, twines[0])).toBeGreaterThan(1.5);
    expect(stamps[0].userData.part).toBe("stamp");
    expect(clips[0].userData.part).toBe("clip");
    expect(pencils[0].userData.part).toBe("pencil");
    expect(cards[0].userData.part).toBe("card");
    expect(twines[0].userData.part).toBe("twine");
    expect(chalks[0].userData.part).toBe("chalk");

    const colors = hexes(eraser);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === 0x5a3a22 || c === 0x8a6238)).toBe(true);
    expect(colors.some((c) => c === 0x5a3a22 || c === 0x8a6238)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    eraser.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-eraser");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
  });
});

describe("warehouse PAPER kraft tack", () => {
  it("sits one tiny kraft PAPER tack on the clipboard; eraser, pencil, clip stay", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const tacks: THREE.Object3D[] = [];
    const erasers: THREE.Object3D[] = [];
    const pencils: THREE.Object3D[] = [];
    const clips: THREE.Object3D[] = [];
    const stamps: THREE.Object3D[] = [];
    const cards: THREE.Object3D[] = [];
    const twines: THREE.Object3D[] = [];
    const chalks: THREE.Object3D[] = [];
    const clipboards: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-tack" && obj.name === "warehouse-tack") {
        tacks.push(obj);
      }
      if (obj.userData?.kind === "warehouse-eraser" && obj.name === "warehouse-eraser") {
        erasers.push(obj);
      }
      if (obj.userData?.kind === "warehouse-pencil" && obj.name === "warehouse-pencil") {
        pencils.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clip" && obj.name === "warehouse-clip") {
        clips.push(obj);
      }
      if (obj.userData?.kind === "warehouse-stamp" && obj.name === "warehouse-stamp") {
        stamps.push(obj);
      }
      if (obj.userData?.kind === "warehouse-card" && obj.name === "warehouse-card") {
        cards.push(obj);
      }
      if (obj.userData?.kind === "warehouse-twine" && obj.name === "warehouse-twine") {
        twines.push(obj);
      }
      if (obj.userData?.kind === "warehouse-chalk" && obj.name === "warehouse-chalk") {
        chalks.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clipboard" && obj.name === "warehouse-clipboard") {
        clipboards.push(obj);
      }
    });
    expect(tacks.length).toBe(1);
    expect(erasers.length).toBe(1);
    expect(pencils.length).toBe(1);
    expect(clips.length).toBe(1);
    expect(stamps.length).toBe(1);
    expect(cards.length).toBe(1);
    expect(twines.length).toBe(1);
    expect(chalks.length).toBe(1);

    const tack = tacks[0];
    expect(tack.userData.kind).toBe("warehouse-tack");
    expect(tack.userData.mode).toBe("PAPER");
    expect(tack.userData.part).toBe("tack");
    expect(tack.position.y).toBeGreaterThan(1.2);
    expect(tack.position.y).toBeLessThan(2.4);
    const onBack = Math.abs(tack.position.z) > 3.0;
    const onSide = Math.abs(tack.position.x) > 3.5;
    expect(onBack || onSide).toBe(true);
    expect(horizDist(tack, clipboards[0])).toBeLessThan(0.5);
    expect(horizDist(tack, cards[0])).toBeGreaterThan(1.5);
    expect(horizDist(tack, twines[0])).toBeGreaterThan(1.5);
    expect(erasers[0].userData.part).toBe("eraser");
    expect(pencils[0].userData.part).toBe("pencil");
    expect(clips[0].userData.part).toBe("clip");
    expect(stamps[0].userData.part).toBe("stamp");
    expect(cards[0].userData.part).toBe("card");
    expect(twines[0].userData.part).toBe("twine");
    expect(chalks[0].userData.part).toBe("chalk");

    const colors = hexes(tack);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === 0x5a3a22 || c === 0x8a6238)).toBe(true);
    expect(colors.some((c) => c === 0x5a3a22 || c === 0x8a6238)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    tack.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-tack");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
  });
});

describe("warehouse PAPER kraft ribbon", () => {
  it("sits one tiny kraft PAPER ribbon on the clipboard; tack, eraser, pencil stay", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressWarehouse(scene);

    const dress = interior.getObjectByName("warehouse-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const ribbons: THREE.Object3D[] = [];
    const tacks: THREE.Object3D[] = [];
    const erasers: THREE.Object3D[] = [];
    const pencils: THREE.Object3D[] = [];
    const clips: THREE.Object3D[] = [];
    const stamps: THREE.Object3D[] = [];
    const cards: THREE.Object3D[] = [];
    const twines: THREE.Object3D[] = [];
    const chalks: THREE.Object3D[] = [];
    const clipboards: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "warehouse-ribbon" && obj.name === "warehouse-ribbon") {
        ribbons.push(obj);
      }
      if (obj.userData?.kind === "warehouse-tack" && obj.name === "warehouse-tack") {
        tacks.push(obj);
      }
      if (obj.userData?.kind === "warehouse-eraser" && obj.name === "warehouse-eraser") {
        erasers.push(obj);
      }
      if (obj.userData?.kind === "warehouse-pencil" && obj.name === "warehouse-pencil") {
        pencils.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clip" && obj.name === "warehouse-clip") {
        clips.push(obj);
      }
      if (obj.userData?.kind === "warehouse-stamp" && obj.name === "warehouse-stamp") {
        stamps.push(obj);
      }
      if (obj.userData?.kind === "warehouse-card" && obj.name === "warehouse-card") {
        cards.push(obj);
      }
      if (obj.userData?.kind === "warehouse-twine" && obj.name === "warehouse-twine") {
        twines.push(obj);
      }
      if (obj.userData?.kind === "warehouse-chalk" && obj.name === "warehouse-chalk") {
        chalks.push(obj);
      }
      if (obj.userData?.kind === "warehouse-clipboard" && obj.name === "warehouse-clipboard") {
        clipboards.push(obj);
      }
    });
    expect(ribbons.length).toBe(1);
    expect(tacks.length).toBe(1);
    expect(erasers.length).toBe(1);
    expect(pencils.length).toBe(1);
    expect(clips.length).toBe(1);
    expect(stamps.length).toBe(1);
    expect(cards.length).toBe(1);
    expect(twines.length).toBe(1);
    expect(chalks.length).toBe(1);

    const ribbon = ribbons[0];
    expect(ribbon.userData.kind).toBe("warehouse-ribbon");
    expect(ribbon.userData.mode).toBe("PAPER");
    expect(ribbon.userData.part).toBe("ribbon");
    expect(ribbon.position.y).toBeGreaterThan(1.2);
    expect(ribbon.position.y).toBeLessThan(2.4);
    const onBack = Math.abs(ribbon.position.z) > 3.0;
    const onSide = Math.abs(ribbon.position.x) > 3.5;
    expect(onBack || onSide).toBe(true);
    expect(horizDist(ribbon, clipboards[0])).toBeLessThan(0.5);
    expect(horizDist(ribbon, cards[0])).toBeGreaterThan(1.5);
    expect(horizDist(ribbon, twines[0])).toBeGreaterThan(1.5);
    expect(tacks[0].userData.part).toBe("tack");
    expect(erasers[0].userData.part).toBe("eraser");
    expect(pencils[0].userData.part).toBe("pencil");
    expect(clips[0].userData.part).toBe("clip");
    expect(stamps[0].userData.part).toBe("stamp");
    expect(cards[0].userData.part).toBe("card");
    expect(twines[0].userData.part).toBe("twine");
    expect(chalks[0].userData.part).toBe("chalk");

    const colors = hexes(ribbon);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === 0x5a3a22 || c === 0x8a6238 || c === 0x9a6a40)).toBe(true);
    expect(colors.some((c) => c === 0x5a3a22 || c === 0x8a6238 || c === 0x9a6a40)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    ribbon.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("warehouse-ribbon");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
  });
});
