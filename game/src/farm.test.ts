import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { dressFarm, isFarmPlot, undressFarm } from "../public/harbour/farm.js";

const KRAFT = 0xf4ead8;
const WOOD = 0x7a5230;
const WOOD_DARK = 0x5a3a22;
const HANDLE = 0x8a6238;
const METAL = 0x6a6a62;
const LAMP_BULB = 0xffd090;

function hexes(root: THREE.Object3D) {
  const colors: number[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
    if (mesh.isMesh && mat?.color) colors.push(mat.color.getHex());
  });
  return colors;
}

describe("farm PAPER milk churn", () => {
  it("matches farm plots only", () => {
    expect(isFarmPlot({ use: "farm" })).toBe(true);
    expect(isFarmPlot({ kind: "farm" })).toBe(true);
    expect(isFarmPlot({ use: "house" })).toBe(false);
    expect(isFarmPlot(null)).toBe(false);
  });

  it("puts a kraft PAPER milk churn beside the trough", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);

    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.userData.provenance).toBe("SIMULATED");
    expect(dress!.visible).toBe(true);

    const churns: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "farm-churn" && obj.name === "farm-churn") {
        churns.push(obj);
      }
    });
    expect(churns.length).toBe(1);

    const churn = churns[0];
    expect(churn.userData.kind).toBe("farm-churn");
    expect(churn.userData.mode).toBe("PAPER");

    const trough = dress!.getObjectByName("farm-trough")!;
    expect(trough).toBeTruthy();
    const dist = Math.hypot(churn.position.x - trough.position.x, churn.position.z - trough.position.z);
    expect(dist).toBeGreaterThan(0.2);
    expect(dist).toBeLessThan(0.7);

    const colors = hexes(churn);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === METAL)).toBe(true);

    churn.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(["BoxGeometry", "CylinderGeometry"]).toContain(mesh.geometry.type);
        expect(mesh.userData.kind).toBe("farm-churn");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the churn on undress", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);
    dressFarm(scene);
    expect(scene.children.filter((c) => c.name === "farm-dress").length).toBe(1);

    undressFarm(scene);
    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(scene.userData.interiorUse).toBe("house");
  });
});

describe("farm PAPER wood pail", () => {
  it("puts one kraft wood PAPER pail beside the churn", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);

    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const pails: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "farm-pail" && obj.name === "farm-pail") {
        pails.push(obj);
      }
    });
    expect(pails.length).toBe(1);

    const pail = pails[0];
    expect(pail.userData.kind).toBe("farm-pail");
    expect(pail.userData.mode).toBe("PAPER");

    const churn = dress!.getObjectByName("farm-churn")!;
    expect(churn).toBeTruthy();
    const dist = Math.hypot(pail.position.x - churn.position.x, pail.position.z - churn.position.z);
    expect(dist).toBeGreaterThan(0.15);
    expect(dist).toBeLessThan(0.7);

    const trough = dress!.getObjectByName("farm-trough")!;
    const toTrough = Math.hypot(pail.position.x - trough.position.x, pail.position.z - trough.position.z);
    expect(toTrough).toBeGreaterThan(0.5);

    const colors = hexes(pail);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.some((c) => c === WOOD || c === WOOD_DARK)).toBe(true);
    expect(colors.every((c) => [KRAFT, WOOD, WOOD_DARK, HANDLE, METAL].includes(c))).toBe(true);

    pail.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(["BoxGeometry", "CylinderGeometry"]).toContain(mesh.geometry.type);
        expect(mesh.userData.kind).toBe("farm-pail");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the pail on undress", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);
    dressFarm(scene);
    expect(scene.children.filter((c) => c.name === "farm-dress").length).toBe(1);
    const dressed = scene.getObjectByName("farm-dress")!;
    const pails: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "farm-pail") pails.push(obj);
    });
    expect(pails.length).toBe(1);

    undressFarm(scene);
    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(scene.userData.interiorUse).toBe("house");
  });
});

describe("farm PAPER kraft pitchfork", () => {
  it("leans one kraft PAPER pitchfork by the trough and pail", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);

    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const forks: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "farm-fork" && obj.name === "farm-fork") {
        forks.push(obj);
      }
    });
    expect(forks.length).toBe(1);

    const fork = forks[0];
    expect(fork.userData.kind).toBe("farm-fork");
    expect(fork.userData.mode).toBe("PAPER");
    expect(Math.abs(fork.rotation.z) > 0.15 || Math.abs(fork.rotation.x) > 0.15).toBe(true);

    const pail = dress!.getObjectByName("farm-pail")!;
    expect(pail).toBeTruthy();
    const toPail = Math.hypot(fork.position.x - pail.position.x, fork.position.z - pail.position.z);
    expect(toPail).toBeGreaterThan(0.12);
    expect(toPail).toBeLessThan(0.7);

    const trough = dress!.getObjectByName("farm-trough")!;
    expect(trough).toBeTruthy();
    const toTrough = Math.hypot(fork.position.x - trough.position.x, fork.position.z - trough.position.z);
    expect(toTrough).toBeGreaterThan(0.5);
    expect(toTrough).toBeLessThan(1.4);

    const churn = dress!.getObjectByName("farm-churn")!;
    expect(churn).toBeTruthy();

    const colors = hexes(fork);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === WOOD_DARK)).toBe(true);
    expect(colors.some((c) => c === METAL)).toBe(true);
    expect(colors.every((c) => [WOOD, WOOD_DARK, METAL].includes(c))).toBe(true);

    let boxes = 0;
    let tines = 0;
    fork.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("farm-fork");
        expect(mesh.userData.mode).toBe("PAPER");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        if (mat?.color?.getHex() === METAL) tines += 1;
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(4);
    expect(tines).toBe(3);
  });

  it("keeps dress idempotent and hides the fork on undress", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);
    dressFarm(scene);
    expect(scene.children.filter((c) => c.name === "farm-dress").length).toBe(1);
    const dressed = scene.getObjectByName("farm-dress")!;
    const forks: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "farm-fork") forks.push(obj);
    });
    expect(forks.length).toBe(1);

    undressFarm(scene);
    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(scene.userData.interiorUse).toBe("house");
  });
});

describe("farm PAPER kraft egg basket", () => {
  it("puts one kraft PAPER egg basket beside the trough", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);

    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const baskets: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "farm-basket" && obj.name === "farm-basket") {
        baskets.push(obj);
      }
    });
    expect(baskets.length).toBe(1);

    const basket = baskets[0];
    expect(basket.userData.kind).toBe("farm-basket");
    expect(basket.userData.mode).toBe("PAPER");

    const trough = dress!.getObjectByName("farm-trough")!;
    expect(trough).toBeTruthy();
    const toTrough = Math.hypot(basket.position.x - trough.position.x, basket.position.z - trough.position.z);
    expect(toTrough).toBeGreaterThan(0.25);
    expect(toTrough).toBeLessThan(0.75);

    const churn = dress!.getObjectByName("farm-churn")!;
    expect(churn).toBeTruthy();
    const toChurn = Math.hypot(basket.position.x - churn.position.x, basket.position.z - churn.position.z);
    expect(toChurn).toBeGreaterThan(0.5);

    const pail = dress!.getObjectByName("farm-pail")!;
    expect(pail).toBeTruthy();
    const toPail = Math.hypot(basket.position.x - pail.position.x, basket.position.z - pail.position.z);
    expect(toPail).toBeGreaterThan(0.5);

    const fork = dress!.getObjectByName("farm-fork")!;
    expect(fork).toBeTruthy();
    const toFork = Math.hypot(basket.position.x - fork.position.x, basket.position.z - fork.position.z);
    expect(toFork).toBeGreaterThan(0.5);

    expect(basket.position.x).toBeGreaterThan(2.8);

    const colors = hexes(basket);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === HANDLE)).toBe(true);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.every((c) => [WOOD, HANDLE, KRAFT].includes(c))).toBe(true);

    let boxes = 0;
    let eggs = 0;
    basket.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("farm-basket");
        expect(mesh.userData.mode).toBe("PAPER");
        const mat = mesh.material as THREE.MeshLambertMaterial;
        if (mat?.color?.getHex() === KRAFT) eggs += 1;
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(6);
    expect(eggs).toBe(3);
  });

  it("keeps dress idempotent and hides the basket on undress", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);
    dressFarm(scene);
    expect(scene.children.filter((c) => c.name === "farm-dress").length).toBe(1);
    const dressed = scene.getObjectByName("farm-dress")!;
    const baskets: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "farm-basket") baskets.push(obj);
    });
    expect(baskets.length).toBe(1);

    undressFarm(scene);
    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(scene.userData.interiorUse).toBe("house");
  });
});

describe("farm PAPER kraft grain scoop", () => {
  it("puts one kraft PAPER grain scoop on the farm workbench", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);

    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const scoops: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "farm-scoop" && obj.name === "farm-scoop") {
        scoops.push(obj);
      }
    });
    expect(scoops.length).toBe(1);

    const scoop = scoops[0];
    expect(scoop.userData.kind).toBe("farm-scoop");
    expect(scoop.userData.mode).toBe("PAPER");

    const bench = dress!.getObjectByName("farm-bench")!;
    expect(bench).toBeTruthy();
    // Bench top surface is ~0.98; scoop sits on it, not the floor.
    expect(scoop.position.y).toBeGreaterThan(0.9);
    expect(scoop.position.y).toBeLessThan(1.15);
    const toBench = Math.hypot(scoop.position.x - -3.28, scoop.position.z - -0.15);
    expect(toBench).toBeLessThan(0.55);

    const trough = dress!.getObjectByName("farm-trough")!;
    expect(trough).toBeTruthy();
    const toTrough = Math.hypot(scoop.position.x - trough.position.x, scoop.position.z - trough.position.z);
    expect(toTrough).toBeGreaterThan(4);

    const churn = dress!.getObjectByName("farm-churn")!;
    expect(churn).toBeTruthy();
    const toChurn = Math.hypot(scoop.position.x - churn.position.x, scoop.position.z - churn.position.z);
    expect(toChurn).toBeGreaterThan(4);

    const pail = dress!.getObjectByName("farm-pail")!;
    expect(pail).toBeTruthy();
    const toPail = Math.hypot(scoop.position.x - pail.position.x, scoop.position.z - pail.position.z);
    expect(toPail).toBeGreaterThan(4);

    const fork = dress!.getObjectByName("farm-fork")!;
    expect(fork).toBeTruthy();
    const toFork = Math.hypot(scoop.position.x - fork.position.x, scoop.position.z - fork.position.z);
    expect(toFork).toBeGreaterThan(4);

    const basket = dress!.getObjectByName("farm-basket")!;
    expect(basket).toBeTruthy();
    const toBasket = Math.hypot(scoop.position.x - basket.position.x, scoop.position.z - basket.position.z);
    expect(toBasket).toBeGreaterThan(4);

    const colors = hexes(scoop);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.some((c) => c === WOOD_DARK)).toBe(true);
    expect(colors.every((c) => [WOOD, KRAFT, WOOD_DARK].includes(c))).toBe(true);

    let boxes = 0;
    scoop.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("farm-scoop");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(3);
  });

  it("keeps dress idempotent and hides the scoop on undress", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);
    dressFarm(scene);
    expect(scene.children.filter((c) => c.name === "farm-dress").length).toBe(1);
    const dressed = scene.getObjectByName("farm-dress")!;
    const scoops: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "farm-scoop") scoops.push(obj);
    });
    expect(scoops.length).toBe(1);

    undressFarm(scene);
    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(scene.userData.interiorUse).toBe("house");
  });
});

describe("farm PAPER kraft lantern", () => {
  it("puts one kraft PAPER lantern on the farm workbench", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);

    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const lanterns: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "farm-lantern" && obj.name === "farm-lantern") {
        lanterns.push(obj);
      }
    });
    expect(lanterns.length).toBe(1);

    const lantern = lanterns[0];
    expect(lantern.userData.kind).toBe("farm-lantern");
    expect(lantern.userData.mode).toBe("PAPER");

    const bench = dress!.getObjectByName("farm-bench")!;
    expect(bench).toBeTruthy();
    // Bench top surface is ~0.98; lantern sits on it, not the floor or rafters.
    expect(lantern.position.y).toBeGreaterThan(0.9);
    expect(lantern.position.y).toBeLessThan(1.15);
    const toBench = Math.hypot(lantern.position.x - -3.28, lantern.position.z - -0.15);
    expect(toBench).toBeLessThan(0.55);

    const scoop = dress!.getObjectByName("farm-scoop")!;
    expect(scoop).toBeTruthy();
    const toScoop = Math.hypot(lantern.position.x - scoop.position.x, lantern.position.z - scoop.position.z);
    expect(toScoop).toBeGreaterThan(0.25);
    expect(toScoop).toBeLessThan(0.9);

    const trough = dress!.getObjectByName("farm-trough")!;
    expect(trough).toBeTruthy();
    const toTrough = Math.hypot(lantern.position.x - trough.position.x, lantern.position.z - trough.position.z);
    expect(toTrough).toBeGreaterThan(4);

    const churn = dress!.getObjectByName("farm-churn")!;
    expect(churn).toBeTruthy();
    const toChurn = Math.hypot(lantern.position.x - churn.position.x, lantern.position.z - churn.position.z);
    expect(toChurn).toBeGreaterThan(4);

    const pail = dress!.getObjectByName("farm-pail")!;
    expect(pail).toBeTruthy();
    const toPail = Math.hypot(lantern.position.x - pail.position.x, lantern.position.z - pail.position.z);
    expect(toPail).toBeGreaterThan(4);

    const fork = dress!.getObjectByName("farm-fork")!;
    expect(fork).toBeTruthy();
    const toFork = Math.hypot(lantern.position.x - fork.position.x, lantern.position.z - fork.position.z);
    expect(toFork).toBeGreaterThan(4);

    const basket = dress!.getObjectByName("farm-basket")!;
    expect(basket).toBeTruthy();
    const toBasket = Math.hypot(lantern.position.x - basket.position.x, lantern.position.z - basket.position.z);
    expect(toBasket).toBeGreaterThan(4);

    const colors = hexes(lantern);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === LAMP_BULB)).toBe(true);
    expect(colors.every((c) => [WOOD, LAMP_BULB].includes(c))).toBe(true);

    let boxes = 0;
    lantern.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("farm-lantern");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(3);
  });

  it("keeps dress idempotent and hides the lantern on undress", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);
    dressFarm(scene);
    expect(scene.children.filter((c) => c.name === "farm-dress").length).toBe(1);
    const dressed = scene.getObjectByName("farm-dress")!;
    const lanterns: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "farm-lantern") lanterns.push(obj);
    });
    expect(lanterns.length).toBe(1);

    undressFarm(scene);
    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(scene.userData.interiorUse).toBe("house");
  });
});

describe("farm PAPER kraft seed packet", () => {
  it("puts one small kraft PAPER seed packet on the farm workbench", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);

    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const seeds: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "farm-seed" && obj.name === "farm-seed") {
        seeds.push(obj);
      }
    });
    expect(seeds.length).toBe(1);

    const seed = seeds[0];
    expect(seed.userData.kind).toBe("farm-seed");
    expect(seed.userData.part).toBe("seed");
    expect(seed.userData.mode).toBe("PAPER");

    const bench = dress!.getObjectByName("farm-bench")!;
    expect(bench).toBeTruthy();
    // Bench top surface is ~0.98; packet sits on it, not the floor.
    expect(seed.position.y).toBeGreaterThan(0.9);
    expect(seed.position.y).toBeLessThan(1.15);
    const toBench = Math.hypot(seed.position.x - -3.28, seed.position.z - -0.15);
    expect(toBench).toBeLessThan(0.55);

    const lantern = dress!.getObjectByName("farm-lantern")!;
    expect(lantern).toBeTruthy();
    const toLantern = Math.hypot(seed.position.x - lantern.position.x, seed.position.z - lantern.position.z);
    expect(toLantern).toBeGreaterThan(0.2);
    expect(toLantern).toBeLessThan(0.9);

    const scoop = dress!.getObjectByName("farm-scoop")!;
    expect(scoop).toBeTruthy();
    const toScoop = Math.hypot(seed.position.x - scoop.position.x, seed.position.z - scoop.position.z);
    expect(toScoop).toBeGreaterThan(0.2);
    expect(toScoop).toBeLessThan(0.9);

    const basket = dress!.getObjectByName("farm-basket")!;
    expect(basket).toBeTruthy();
    const toBasket = Math.hypot(seed.position.x - basket.position.x, seed.position.z - basket.position.z);
    expect(toBasket).toBeGreaterThan(4);

    const trough = dress!.getObjectByName("farm-trough")!;
    expect(trough).toBeTruthy();
    const toTrough = Math.hypot(seed.position.x - trough.position.x, seed.position.z - trough.position.z);
    expect(toTrough).toBeGreaterThan(4);

    const churn = dress!.getObjectByName("farm-churn")!;
    expect(churn).toBeTruthy();
    const toChurn = Math.hypot(seed.position.x - churn.position.x, seed.position.z - churn.position.z);
    expect(toChurn).toBeGreaterThan(4);

    const pail = dress!.getObjectByName("farm-pail")!;
    expect(pail).toBeTruthy();
    const toPail = Math.hypot(seed.position.x - pail.position.x, seed.position.z - pail.position.z);
    expect(toPail).toBeGreaterThan(4);

    const fork = dress!.getObjectByName("farm-fork")!;
    expect(fork).toBeTruthy();
    const toFork = Math.hypot(seed.position.x - fork.position.x, seed.position.z - fork.position.z);
    expect(toFork).toBeGreaterThan(4);

    const colors = hexes(seed);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.some((c) => c === LAMP_BULB)).toBe(true);
    expect(colors.every((c) => [WOOD, KRAFT, LAMP_BULB].includes(c))).toBe(true);

    let boxes = 0;
    seed.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("farm-seed");
        expect(mesh.userData.part).toBe("seed");
        expect(mesh.userData.mode).toBe("PAPER");
        const geo = mesh.geometry as THREE.BoxGeometry;
        expect(geo.parameters.width).toBeLessThan(0.12);
        expect(geo.parameters.height).toBeLessThan(0.12);
        expect(geo.parameters.depth).toBeLessThan(0.12);
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
    expect(boxes).toBeLessThanOrEqual(4);
  });

  it("keeps dress idempotent and hides the seed packet on undress", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);
    dressFarm(scene);
    expect(scene.children.filter((c) => c.name === "farm-dress").length).toBe(1);
    const dressed = scene.getObjectByName("farm-dress")!;
    const seeds: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "farm-seed") seeds.push(obj);
    });
    expect(seeds.length).toBe(1);
    expect(dressed.getObjectByName("farm-lantern")).toBeTruthy();
    expect(dressed.getObjectByName("farm-scoop")).toBeTruthy();
    expect(dressed.getObjectByName("farm-basket")).toBeTruthy();

    undressFarm(scene);
    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(scene.userData.interiorUse).toBe("house");
  });
});

describe("farm PAPER kraft pail lid", () => {
  it("puts one small kraft PAPER lid on the pail, lantern scoop seed remain", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);

    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const lids: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "farm-lid" && obj.name === "farm-lid") {
        lids.push(obj);
      }
    });
    expect(lids.length).toBe(1);

    const lid = lids[0];
    expect(lid.userData.kind).toBe("farm-lid");
    expect(lid.userData.part).toBe("lid");
    expect(lid.userData.mode).toBe("PAPER");

    const pail = dress!.getObjectByName("farm-pail")!;
    expect(pail).toBeTruthy();
    const toPail = Math.hypot(lid.position.x - pail.position.x, lid.position.z - pail.position.z);
    expect(toPail).toBeLessThan(0.2);
    expect(lid.position.y).toBeGreaterThan(0.28);
    expect(lid.position.y).toBeLessThan(0.5);

    const lantern = dress!.getObjectByName("farm-lantern")!;
    expect(lantern).toBeTruthy();
    const toLantern = Math.hypot(lid.position.x - lantern.position.x, lid.position.z - lantern.position.z);
    expect(toLantern).toBeGreaterThan(4);

    const scoop = dress!.getObjectByName("farm-scoop")!;
    expect(scoop).toBeTruthy();
    const toScoop = Math.hypot(lid.position.x - scoop.position.x, lid.position.z - scoop.position.z);
    expect(toScoop).toBeGreaterThan(4);

    const seed = dress!.getObjectByName("farm-seed")!;
    expect(seed).toBeTruthy();
    const toSeed = Math.hypot(lid.position.x - seed.position.x, lid.position.z - seed.position.z);
    expect(toSeed).toBeGreaterThan(4);

    const basket = dress!.getObjectByName("farm-basket")!;
    expect(basket).toBeTruthy();
    const toBasket = Math.hypot(lid.position.x - basket.position.x, lid.position.z - basket.position.z);
    expect(toBasket).toBeGreaterThan(0.5);

    const fork = dress!.getObjectByName("farm-fork")!;
    expect(fork).toBeTruthy();
    const toFork = Math.hypot(lid.position.x - fork.position.x, lid.position.z - fork.position.z);
    expect(toFork).toBeGreaterThan(0.12);

    const colors = hexes(lid);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.every((c) => [KRAFT, WOOD, WOOD_DARK, HANDLE].includes(c))).toBe(true);

    let boxes = 0;
    lid.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("farm-lid");
        expect(mesh.userData.part).toBe("lid");
        expect(mesh.userData.mode).toBe("PAPER");
        const geo = mesh.geometry as THREE.BoxGeometry;
        expect(geo.parameters.width).toBeLessThan(0.16);
        expect(geo.parameters.height).toBeLessThan(0.08);
        expect(geo.parameters.depth).toBeLessThan(0.16);
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
    expect(boxes).toBeLessThanOrEqual(3);
  });

  it("keeps dress idempotent and hides the lid on undress", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);
    dressFarm(scene);
    expect(scene.children.filter((c) => c.name === "farm-dress").length).toBe(1);
    const dressed = scene.getObjectByName("farm-dress")!;
    const lids: THREE.Object3D[] = [];
    dressed.traverse((obj) => {
      if (obj.name === "farm-lid") lids.push(obj);
    });
    expect(lids.length).toBe(1);
    expect(dressed.getObjectByName("farm-lantern")).toBeTruthy();
    expect(dressed.getObjectByName("farm-scoop")).toBeTruthy();
    expect(dressed.getObjectByName("farm-seed")).toBeTruthy();

    undressFarm(scene);
    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(scene.userData.interiorUse).toBe("house");
  });
});

describe("farm PAPER kraft mug", () => {
  it("puts one tiny kraft PAPER mug on the workbench; lid and seed remain", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);

    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const mugs: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.part === "mug" && obj.name === "farm-mug") mugs.push(obj);
    });
    expect(mugs.length).toBe(1);
    const mug = mugs[0];
    expect(mug.userData.part).toBe("mug");
    expect(mug.userData.mode).toBe("PAPER");

    const lid = dress!.getObjectByName("farm-lid")!;
    const seed = dress!.getObjectByName("farm-seed")!;
    expect(lid).toBeTruthy();
    expect(seed).toBeTruthy();
    expect(lid.userData.part).toBe("lid");
    expect(seed.userData.part).toBe("seed");

    expect(mug.position.y).toBeGreaterThan(0.9);
    expect(mug.position.y).toBeLessThan(1.15);
    const toBench = Math.hypot(mug.position.x - -3.28, mug.position.z - -0.15);
    expect(toBench).toBeLessThan(0.55);

    const lantern = dress!.getObjectByName("farm-lantern")!;
    const scoop = dress!.getObjectByName("farm-scoop")!;
    const basket = dress!.getObjectByName("farm-basket")!;
    const fork = dress!.getObjectByName("farm-fork")!;
    expect(Math.hypot(mug.position.x - seed.position.x, mug.position.z - seed.position.z)).toBeGreaterThan(0.2);
    expect(Math.hypot(mug.position.x - lantern.position.x, mug.position.z - lantern.position.z)).toBeGreaterThan(0.2);
    expect(Math.hypot(mug.position.x - scoop.position.x, mug.position.z - scoop.position.z)).toBeGreaterThan(0.2);
    expect(Math.hypot(mug.position.x - lid.position.x, mug.position.z - lid.position.z)).toBeGreaterThan(4);
    expect(Math.hypot(mug.position.x - basket.position.x, mug.position.z - basket.position.z)).toBeGreaterThan(4);
    expect(Math.hypot(mug.position.x - fork.position.x, mug.position.z - fork.position.z)).toBeGreaterThan(4);

    const colors = hexes(mug);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.every((c) => [KRAFT, WOOD, WOOD_DARK, HANDLE].includes(c))).toBe(true);

    let boxes = 0;
    mug.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.part).toBe("mug");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
    expect(boxes).toBeLessThanOrEqual(4);
  });
});

describe("farm PAPER kraft egg", () => {
  it("puts one tiny kraft PAPER egg on the workbench; mug and lid remain", () => {
    const scene = new THREE.Scene();
    dressFarm(scene);

    const dress = scene.getObjectByName("farm-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const eggs: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.part === "egg" && obj.name === "farm-egg") eggs.push(obj);
    });
    expect(eggs.length).toBe(1);
    const egg = eggs[0];
    expect(egg.userData.part).toBe("egg");
    expect(egg.userData.mode).toBe("PAPER");

    const mug = dress!.getObjectByName("farm-mug")!;
    const lid = dress!.getObjectByName("farm-lid")!;
    expect(mug).toBeTruthy();
    expect(lid).toBeTruthy();
    expect(mug.userData.part).toBe("mug");
    expect(lid.userData.part).toBe("lid");

    expect(egg.position.y).toBeGreaterThan(0.9);
    expect(egg.position.y).toBeLessThan(1.15);
    const toBench = Math.hypot(egg.position.x - -3.28, egg.position.z - -0.15);
    expect(toBench).toBeLessThan(0.55);

    const seed = dress!.getObjectByName("farm-seed")!;
    const lantern = dress!.getObjectByName("farm-lantern")!;
    const scoop = dress!.getObjectByName("farm-scoop")!;
    expect(Math.hypot(egg.position.x - mug.position.x, egg.position.z - mug.position.z)).toBeGreaterThan(0.2);
    expect(Math.hypot(egg.position.x - lid.position.x, egg.position.z - lid.position.z)).toBeGreaterThan(4);
    expect(Math.hypot(egg.position.x - seed.position.x, egg.position.z - seed.position.z)).toBeGreaterThan(0.2);
    expect(Math.hypot(egg.position.x - lantern.position.x, egg.position.z - lantern.position.z)).toBeGreaterThan(0.2);
    expect(Math.hypot(egg.position.x - scoop.position.x, egg.position.z - scoop.position.z)).toBeGreaterThan(0.2);

    const colors = hexes(egg);
    expect(colors.some((c) => c === KRAFT)).toBe(true);
    expect(colors.every((c) => [KRAFT, WOOD, WOOD_DARK, HANDLE].includes(c))).toBe(true);

    let boxes = 0;
    egg.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.part).toBe("egg");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
    expect(boxes).toBeLessThanOrEqual(3);
  });
});
