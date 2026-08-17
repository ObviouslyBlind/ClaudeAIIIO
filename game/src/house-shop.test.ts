import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { makeInteriorScene } from "../public/harbour/interior.js";
import {
  dressHouseShop,
  isHouseShopPlot,
  undressHouseShop,
} from "../public/harbour/house-shop.js";

const WOOD = 0x8a6238;
const WOOD_TOP = 0x9a6a40;
const TIN = 0xc4a574;
const CREAM = 0xe8d7b8;
const LINEN = 0xf4ead8;
const KRAFT = new Set([WOOD, WOOD_TOP, TIN, CREAM, 0x6a4428, LINEN, 0xf3efe4]);

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

describe("house-shop PAPER shop bell", () => {
  it("matches house-shop plots only", () => {
    expect(isHouseShopPlot({ use: "house_shop" })).toBe(true);
    expect(isHouseShopPlot({ kind: "house_shop" })).toBe(true);
    expect(isHouseShopPlot({ use: "house" })).toBe(false);
    expect(isHouseShopPlot(null)).toBe(false);
  });

  it("hangs a small kraft PAPER bell above the house-shop counter", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");
    expect(dress!.visible).toBe(true);

    const bells: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "house-shop-bell" && obj.name === "house-shop-bell") {
        bells.push(obj);
      }
    });
    expect(bells.length).toBeGreaterThanOrEqual(1);

    const bell = bells[0];
    expect(bell.userData.kind).toBe("house-shop-bell");
    expect(bell.userData.mode).toBe("PAPER");
    expect(bell.position.y).toBeGreaterThan(1.4);
    expect(bell.position.y).toBeLessThan(2.2);
    expect(Math.abs(bell.position.x)).toBeLessThan(1.4);
    expect(bell.position.z).toBeGreaterThan(0.1);
    expect(bell.position.z).toBeLessThan(1.1);

    const colors = hexes(bell);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === TIN)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.every((c) => c === TIN || c === WOOD)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    bell.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-bell");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the bell on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);
    dressHouseShop(scene);
    const dresses = [];
    interior.traverse((obj) => {
      if (obj.name === "house-shop-dress") dresses.push(obj);
    });
    expect(dresses.length).toBe(1);

    undressHouseShop(scene);
    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("house-shop PAPER receipt pad", () => {
  it("sits a kraft PAPER pad on the house-shop counter", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const pads: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "house-shop-pad" && obj.name === "house-shop-pad") {
        pads.push(obj);
      }
    });
    expect(pads.length).toBe(1);

    const pad = pads[0];
    expect(pad.userData.kind).toBe("house-shop-pad");
    expect(pad.userData.mode).toBe("PAPER");
    // Counter top is ~1.12; pad sits on it, not hanging with the bell.
    expect(pad.position.y).toBeGreaterThan(1.0);
    expect(pad.position.y).toBeLessThan(1.25);
    expect(Math.abs(pad.position.x)).toBeLessThan(1.2);
    expect(pad.position.z).toBeGreaterThan(0.1);
    expect(pad.position.z).toBeLessThan(0.9);

    const bell = dress!.getObjectByName("house-shop-bell");
    expect(bell).toBeTruthy();
    const offset = Math.hypot(pad.position.x - bell!.position.x, pad.position.z - bell!.position.z);
    expect(offset).toBeGreaterThan(0.25);

    const colors = hexes(pad);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => KRAFT.has(c))).toBe(true);
    expect(colors.some((c) => c === WOOD || c === WOOD_TOP)).toBe(true);
    expect(colors.some((c) => c === CREAM || c === TIN)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    pad.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-pad");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the pad on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);
    dressHouseShop(scene);

    const pads: THREE.Object3D[] = [];
    interior.traverse((obj) => {
      if (obj.name === "house-shop-pad") pads.push(obj);
    });
    expect(pads.length).toBe(1);

    undressHouseShop(scene);
    const dress = interior.getObjectByName("house-shop-dress");
    const pad = interior.getObjectByName("house-shop-pad");
    expect(dress).toBeTruthy();
    expect(pad).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("house-shop PAPER counter jar", () => {
  it("sits a kraft PAPER jar on the house-shop counter", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const jars: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "house-shop-jar" && obj.name === "house-shop-jar") {
        jars.push(obj);
      }
    });
    expect(jars.length).toBe(1);

    const jar = jars[0];
    expect(jar.userData.kind).toBe("house-shop-jar");
    expect(jar.userData.mode).toBe("PAPER");
    // Counter top is ~1.12; jar sits on it, not hanging with the bell.
    expect(jar.position.y).toBeGreaterThan(1.0);
    expect(jar.position.y).toBeLessThan(1.25);
    expect(Math.abs(jar.position.x)).toBeLessThan(1.2);
    expect(jar.position.z).toBeGreaterThan(0.1);
    expect(jar.position.z).toBeLessThan(0.9);

    const pad = dress!.getObjectByName("house-shop-pad");
    const bell = dress!.getObjectByName("house-shop-bell");
    expect(pad).toBeTruthy();
    expect(bell).toBeTruthy();
    const padOffset = Math.hypot(
      jar.position.x - pad!.position.x,
      jar.position.z - pad!.position.z,
    );
    const bellOffset = Math.hypot(
      jar.position.x - bell!.position.x,
      jar.position.z - bell!.position.z,
    );
    expect(padOffset).toBeGreaterThan(0.25);
    expect(bellOffset).toBeGreaterThan(0.25);

    const colors = hexes(jar);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === TIN || c === CREAM)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === TIN)).toBe(true);
    expect(colors.some((c) => c === CREAM)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    jar.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-jar");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the jar on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);
    dressHouseShop(scene);

    const jars: THREE.Object3D[] = [];
    interior.traverse((obj) => {
      if (obj.name === "house-shop-jar") jars.push(obj);
    });
    expect(jars.length).toBe(1);

    undressHouseShop(scene);
    const dress = interior.getObjectByName("house-shop-dress");
    const jar = interior.getObjectByName("house-shop-jar");
    expect(dress).toBeTruthy();
    expect(jar).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("house-shop PAPER counter kettle", () => {
  it("sits a kraft PAPER kettle on the house-shop counter", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const kettles: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "house-shop-kettle" && obj.name === "house-shop-kettle") {
        kettles.push(obj);
      }
    });
    expect(kettles.length).toBe(1);

    const kettle = kettles[0];
    expect(kettle.userData.kind).toBe("house-shop-kettle");
    expect(kettle.userData.mode).toBe("PAPER");
    // Counter top is ~1.12; kettle sits on it, not hanging with the bell.
    expect(kettle.position.y).toBeGreaterThan(1.0);
    expect(kettle.position.y).toBeLessThan(1.25);
    expect(Math.abs(kettle.position.x)).toBeLessThan(1.2);
    expect(kettle.position.z).toBeGreaterThan(0.1);
    expect(kettle.position.z).toBeLessThan(0.9);

    const jar = dress!.getObjectByName("house-shop-jar");
    const pad = dress!.getObjectByName("house-shop-pad");
    const bell = dress!.getObjectByName("house-shop-bell");
    expect(jar).toBeTruthy();
    expect(pad).toBeTruthy();
    expect(bell).toBeTruthy();
    const jarOffset = Math.hypot(
      kettle.position.x - jar!.position.x,
      kettle.position.z - jar!.position.z,
    );
    const padOffset = Math.hypot(
      kettle.position.x - pad!.position.x,
      kettle.position.z - pad!.position.z,
    );
    const bellOffset = Math.hypot(
      kettle.position.x - bell!.position.x,
      kettle.position.z - bell!.position.z,
    );
    expect(jarOffset).toBeGreaterThan(0.25);
    expect(padOffset).toBeGreaterThan(0.25);
    expect(bellOffset).toBeGreaterThan(0.25);

    const colors = hexes(kettle);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === TIN || c === CREAM)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === TIN)).toBe(true);
    expect(colors.some((c) => c === CREAM)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    kettle.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-kettle");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the kettle on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);
    dressHouseShop(scene);

    const kettles: THREE.Object3D[] = [];
    interior.traverse((obj) => {
      if (obj.name === "house-shop-kettle") kettles.push(obj);
    });
    expect(kettles.length).toBe(1);

    undressHouseShop(scene);
    const dress = interior.getObjectByName("house-shop-dress");
    const kettle = interior.getObjectByName("house-shop-kettle");
    expect(dress).toBeTruthy();
    expect(kettle).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("house-shop PAPER counter cup", () => {
  it("sits a kraft PAPER cup on the house-shop counter", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const cups: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "house-shop-cup" && obj.name === "house-shop-cup") {
        cups.push(obj);
      }
    });
    expect(cups.length).toBe(1);

    const cup = cups[0];
    expect(cup.userData.kind).toBe("house-shop-cup");
    expect(cup.userData.mode).toBe("PAPER");
    // Counter top is ~1.12; cup sits on it, not hanging with the bell.
    expect(cup.position.y).toBeGreaterThan(1.0);
    expect(cup.position.y).toBeLessThan(1.25);
    expect(Math.abs(cup.position.x)).toBeLessThan(1.2);
    expect(cup.position.z).toBeGreaterThan(0.1);
    expect(cup.position.z).toBeLessThan(0.9);

    const kettle = dress!.getObjectByName("house-shop-kettle");
    const jar = dress!.getObjectByName("house-shop-jar");
    const pad = dress!.getObjectByName("house-shop-pad");
    const bell = dress!.getObjectByName("house-shop-bell");
    expect(kettle).toBeTruthy();
    expect(jar).toBeTruthy();
    expect(pad).toBeTruthy();
    expect(bell).toBeTruthy();
    const kettleOffset = Math.hypot(
      cup.position.x - kettle!.position.x,
      cup.position.z - kettle!.position.z,
    );
    const jarOffset = Math.hypot(
      cup.position.x - jar!.position.x,
      cup.position.z - jar!.position.z,
    );
    const padOffset = Math.hypot(
      cup.position.x - pad!.position.x,
      cup.position.z - pad!.position.z,
    );
    const bellOffset = Math.hypot(
      cup.position.x - bell!.position.x,
      cup.position.z - bell!.position.z,
    );
    expect(kettleOffset).toBeGreaterThan(0.25);
    expect(jarOffset).toBeGreaterThan(0.25);
    expect(padOffset).toBeGreaterThan(0.25);
    expect(bellOffset).toBeGreaterThan(0.25);

    const colors = hexes(cup);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === CREAM || c === LINEN)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === CREAM || c === LINEN)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    cup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-cup");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });

  it("keeps dress idempotent and hides the cup on undress", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);
    dressHouseShop(scene);

    const cups: THREE.Object3D[] = [];
    interior.traverse((obj) => {
      if (obj.name === "house-shop-cup") cups.push(obj);
    });
    expect(cups.length).toBe(1);

    undressHouseShop(scene);
    const dress = interior.getObjectByName("house-shop-dress");
    const cup = interior.getObjectByName("house-shop-cup");
    expect(dress).toBeTruthy();
    expect(cup).toBeTruthy();
    expect(dress!.visible).toBe(false);
    expect(interior.userData.interiorUse).toBe("house");
  });
});

describe("house-shop PAPER counter jug", () => {
  it("sits a tiny kraft PAPER jug on the house-shop counter", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const jugs: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "house-shop-jug" && obj.name === "house-shop-jug") {
        jugs.push(obj);
      }
    });
    expect(jugs.length).toBe(1);

    const jug = jugs[0];
    expect(jug.userData.kind).toBe("house-shop-jug");
    expect(jug.userData.part).toBe("jug");
    expect(jug.userData.mode).toBe("PAPER");
    // Counter top is ~1.12; jug sits on it, not hanging with the bell.
    expect(jug.position.y).toBeGreaterThan(1.0);
    expect(jug.position.y).toBeLessThan(1.25);
    expect(Math.abs(jug.position.x)).toBeLessThan(1.2);
    expect(jug.position.z).toBeGreaterThan(0.1);
    expect(jug.position.z).toBeLessThan(0.9);

    const kettle = dress!.getObjectByName("house-shop-kettle");
    const jar = dress!.getObjectByName("house-shop-jar");
    const pad = dress!.getObjectByName("house-shop-pad");
    const bell = dress!.getObjectByName("house-shop-bell");
    const cup = dress!.getObjectByName("house-shop-cup");
    expect(kettle).toBeTruthy();
    expect(jar).toBeTruthy();
    expect(pad).toBeTruthy();
    expect(bell).toBeTruthy();
    expect(cup).toBeTruthy();
    const kettleOffset = Math.hypot(
      jug.position.x - kettle!.position.x,
      jug.position.z - kettle!.position.z,
    );
    const jarOffset = Math.hypot(
      jug.position.x - jar!.position.x,
      jug.position.z - jar!.position.z,
    );
    const padOffset = Math.hypot(
      jug.position.x - pad!.position.x,
      jug.position.z - pad!.position.z,
    );
    const bellOffset = Math.hypot(
      jug.position.x - bell!.position.x,
      jug.position.z - bell!.position.z,
    );
    const cupOffset = Math.hypot(
      jug.position.x - cup!.position.x,
      jug.position.z - cup!.position.z,
    );
    expect(kettleOffset).toBeGreaterThan(0.25);
    expect(jarOffset).toBeGreaterThan(0.25);
    expect(padOffset).toBeGreaterThan(0.25);
    expect(bellOffset).toBeGreaterThan(0.25);
    expect(cupOffset).toBeGreaterThan(0.25);

    const jugPos = new THREE.Vector3();
    jug.getWorldPosition(jugPos);
    const xzOffset = (other: THREE.Object3D) => {
      const otherPos = new THREE.Vector3();
      other.getWorldPosition(otherPos);
      return Math.hypot(jugPos.x - otherPos.x, jugPos.z - otherPos.z);
    };
    const neighbors: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (
        obj.userData?.part === "saucer" ||
        obj.userData?.part === "stamp" ||
        obj.userData?.part === "blotter" ||
        obj.userData?.part === "coaster" ||
        obj.userData?.part === "napkin" ||
        obj.userData?.part === "spoon" ||
        obj.userData?.part === "knife"
      ) {
        neighbors.push(obj);
      }
    });
    expect(neighbors.length).toBe(7);
    for (const other of neighbors) {
      expect(xzOffset(other)).toBeGreaterThan(0.2);
    }

    const colors = hexes(jug);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === TIN || c === CREAM)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === TIN)).toBe(true);
    expect(colors.some((c) => c === CREAM)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    jug.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-jug");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });
});

describe("house-shop PAPER counter pot", () => {
  it("sits a tiny kraft PAPER pot on the house-shop counter", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const pots: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.kind === "house-shop-pot" && obj.name === "house-shop-pot") {
        pots.push(obj);
      }
    });
    expect(pots.length).toBe(1);

    const pot = pots[0];
    expect(pot.userData.kind).toBe("house-shop-pot");
    expect(pot.userData.part).toBe("pot");
    expect(pot.userData.mode).toBe("PAPER");
    // Counter top is ~1.12; pot sits on it, not hanging with the bell.
    expect(pot.position.y).toBeGreaterThan(1.0);
    expect(pot.position.y).toBeLessThan(1.25);
    expect(Math.abs(pot.position.x)).toBeLessThan(1.2);
    expect(pot.position.z).toBeGreaterThan(0.1);
    expect(pot.position.z).toBeLessThan(0.9);

    const jug = dress!.getObjectByName("house-shop-jug");
    const kettle = dress!.getObjectByName("house-shop-kettle");
    const jar = dress!.getObjectByName("house-shop-jar");
    const pad = dress!.getObjectByName("house-shop-pad");
    const bell = dress!.getObjectByName("house-shop-bell");
    const cup = dress!.getObjectByName("house-shop-cup");
    expect(jug).toBeTruthy();
    expect(kettle).toBeTruthy();
    expect(jar).toBeTruthy();
    expect(pad).toBeTruthy();
    expect(bell).toBeTruthy();
    expect(cup).toBeTruthy();
    const jugOffset = Math.hypot(
      pot.position.x - jug!.position.x,
      pot.position.z - jug!.position.z,
    );
    const kettleOffset = Math.hypot(
      pot.position.x - kettle!.position.x,
      pot.position.z - kettle!.position.z,
    );
    const jarOffset = Math.hypot(
      pot.position.x - jar!.position.x,
      pot.position.z - jar!.position.z,
    );
    const padOffset = Math.hypot(
      pot.position.x - pad!.position.x,
      pot.position.z - pad!.position.z,
    );
    const bellOffset = Math.hypot(
      pot.position.x - bell!.position.x,
      pot.position.z - bell!.position.z,
    );
    const cupOffset = Math.hypot(
      pot.position.x - cup!.position.x,
      pot.position.z - cup!.position.z,
    );
    expect(jugOffset).toBeGreaterThan(0.25);
    expect(kettleOffset).toBeGreaterThan(0.25);
    expect(jarOffset).toBeGreaterThan(0.25);
    expect(padOffset).toBeGreaterThan(0.25);
    expect(bellOffset).toBeGreaterThan(0.25);
    expect(cupOffset).toBeGreaterThan(0.25);

    const potPos = new THREE.Vector3();
    pot.getWorldPosition(potPos);
    const xzOffset = (other: THREE.Object3D) => {
      const otherPos = new THREE.Vector3();
      other.getWorldPosition(otherPos);
      return Math.hypot(potPos.x - otherPos.x, potPos.z - otherPos.z);
    };
    const neighbors: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (
        obj.userData?.part === "saucer" ||
        obj.userData?.part === "stamp" ||
        obj.userData?.part === "blotter" ||
        obj.userData?.part === "coaster" ||
        obj.userData?.part === "napkin" ||
        obj.userData?.part === "spoon" ||
        obj.userData?.part === "knife"
      ) {
        neighbors.push(obj);
      }
    });
    expect(neighbors.length).toBe(7);
    for (const other of neighbors) {
      expect(xzOffset(other)).toBeGreaterThan(0.2);
    }

    const colors = hexes(pot);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === TIN || c === CREAM)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === TIN)).toBe(true);
    expect(colors.some((c) => c === CREAM)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    pot.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-pot");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
  });
});

describe("house-shop PAPER cup saucer", () => {
  it("sits a small kraft PAPER saucer under the house-shop cup", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const cup = dress!.getObjectByName("house-shop-cup");
    const kettle = dress!.getObjectByName("house-shop-kettle");
    const bell = dress!.getObjectByName("house-shop-bell");
    const pad = dress!.getObjectByName("house-shop-pad");
    expect(cup).toBeTruthy();
    expect(kettle).toBeTruthy();
    expect(bell).toBeTruthy();
    expect(pad).toBeTruthy();

    const saucers: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.part === "saucer") saucers.push(obj);
    });
    expect(saucers.length).toBe(1);

    const saucer = saucers[0] as THREE.Mesh;
    expect(saucer.userData.part).toBe("saucer");
    expect(saucer.userData.mode).toBe("PAPER");
    expect(saucer.isMesh).toBe(true);
    expect(saucer.geometry.type).toBe("BoxGeometry");

    const geo = saucer.geometry as THREE.BoxGeometry;
    expect(geo.parameters.height).toBeLessThan(0.04);
    expect(geo.parameters.width).toBeGreaterThan(geo.parameters.height);
    expect(geo.parameters.depth).toBeGreaterThan(geo.parameters.height);
    expect(geo.parameters.width).toBeLessThan(0.3);
    expect(geo.parameters.depth).toBeLessThan(0.3);

    const cupWorld = new THREE.Vector3();
    const saucerWorld = new THREE.Vector3();
    cup!.getWorldPosition(cupWorld);
    saucer.getWorldPosition(saucerWorld);
    expect(Math.hypot(saucerWorld.x - cupWorld.x, saucerWorld.z - cupWorld.z)).toBeLessThan(0.05);

    const bodies: THREE.Mesh[] = [];
    cup!.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.userData?.part !== "saucer") bodies.push(mesh);
    });
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      const bodyWorld = new THREE.Vector3();
      body.getWorldPosition(bodyWorld);
      expect(saucerWorld.y).toBeLessThan(bodyWorld.y);
    }

    const colors = hexes(saucer);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === CREAM || c === LINEN)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);
  });
});

describe("house-shop PAPER table napkin", () => {
  it("sits a small kraft PAPER napkin on the living-room table", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const cup = dress!.getObjectByName("house-shop-cup");
    const kettle = dress!.getObjectByName("house-shop-kettle");
    const bell = dress!.getObjectByName("house-shop-bell");
    const pad = dress!.getObjectByName("house-shop-pad");
    expect(cup).toBeTruthy();
    expect(kettle).toBeTruthy();
    expect(bell).toBeTruthy();
    expect(pad).toBeTruthy();

    const saucers: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.part === "saucer") saucers.push(obj);
    });
    expect(saucers.length).toBe(1);

    const napkins: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.part === "napkin" || obj.name === "house-shop-napkin") {
        napkins.push(obj);
      }
    });
    expect(napkins.length).toBe(1);

    const napkin = napkins[0];
    expect(napkin.userData.part).toBe("napkin");
    expect(napkin.userData.kind).toBe("house-shop-napkin");
    expect(napkin.userData.mode).toBe("PAPER");

    const table = dress!.getObjectByName("house-shop-table");
    expect(table).toBeTruthy();
    expect(napkin.parent?.name).toBe("house-shop-table");
    const top = table!.children.find((obj) => {
      const mesh = obj as THREE.Mesh;
      return mesh.isMesh && mesh.geometry.type === "BoxGeometry";
    }) as THREE.Mesh;
    expect(top).toBeTruthy();
    const tablePos = new THREE.Vector3();
    const napkinPos = new THREE.Vector3();
    top.getWorldPosition(tablePos);
    napkin.getWorldPosition(napkinPos);
    expect(Math.hypot(napkinPos.x - tablePos.x, napkinPos.z - tablePos.z)).toBeLessThan(0.6);
    // Coffee-table top sits near y 0.58; napkin rests on it, not the counter.
    expect(napkinPos.y).toBeGreaterThan(0.5);
    expect(napkinPos.y).toBeLessThan(0.75);

    const xzOffset = (other: THREE.Object3D) => {
      const otherPos = new THREE.Vector3();
      other.getWorldPosition(otherPos);
      return Math.hypot(napkinPos.x - otherPos.x, napkinPos.z - otherPos.z);
    };
    expect(xzOffset(cup!)).toBeGreaterThan(0.25);
    expect(xzOffset(saucers[0])).toBeGreaterThan(0.25);
    expect(xzOffset(kettle!)).toBeGreaterThan(0.25);
    expect(xzOffset(bell!)).toBeGreaterThan(0.25);
    expect(xzOffset(pad!)).toBeGreaterThan(0.25);

    const colors = hexes(napkin);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === CREAM || c === LINEN)).toBe(true);
    expect(colors.some((c) => c === LINEN || c === CREAM)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    const size = new THREE.Box3().setFromObject(napkin).getSize(new THREE.Vector3());
    expect(size.x).toBeLessThan(0.28);
    expect(size.y).toBeLessThan(0.08);
    expect(size.z).toBeLessThan(0.22);

    let boxes = 0;
    napkin.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-napkin");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });
});

describe("house-shop PAPER table spoon", () => {
  it("sits a small kraft PAPER spoon on the living-room table", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const napkins: THREE.Object3D[] = [];
    const saucers: THREE.Object3D[] = [];
    const spoons: THREE.Object3D[] = [];
    const jars: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.part === "napkin" || obj.name === "house-shop-napkin") {
        napkins.push(obj);
      }
      if (obj.userData?.part === "saucer") saucers.push(obj);
      if (obj.userData?.part === "spoon" || obj.name === "house-shop-spoon") {
        spoons.push(obj);
      }
      if (obj.userData?.part === "shelf-jar") jars.push(obj);
    });
    expect(napkins.length).toBe(1);
    expect(saucers.length).toBe(1);
    expect(spoons.length).toBe(1);
    expect(jars.length).toBeGreaterThan(0);

    const spoon = spoons[0];
    expect(spoon.userData.part).toBe("spoon");
    expect(spoon.userData.kind).toBe("house-shop-spoon");
    expect(spoon.userData.mode).toBe("PAPER");

    const table = dress!.getObjectByName("house-shop-table");
    expect(table).toBeTruthy();
    expect(spoon.parent?.name).toBe("house-shop-table");
    const top = table!.children.find((obj) => {
      const mesh = obj as THREE.Mesh;
      return mesh.isMesh && mesh.geometry.type === "BoxGeometry";
    }) as THREE.Mesh;
    expect(top).toBeTruthy();
    const tablePos = new THREE.Vector3();
    const spoonPos = new THREE.Vector3();
    top.getWorldPosition(tablePos);
    spoon.getWorldPosition(spoonPos);
    expect(Math.hypot(spoonPos.x - tablePos.x, spoonPos.z - tablePos.z)).toBeLessThan(0.6);
    // Coffee-table top sits near y 0.58; spoon rests on it, not the counter.
    expect(spoonPos.y).toBeGreaterThan(0.5);
    expect(spoonPos.y).toBeLessThan(0.75);

    const xzOffset = (other: THREE.Object3D) => {
      const otherPos = new THREE.Vector3();
      other.getWorldPosition(otherPos);
      return Math.hypot(spoonPos.x - otherPos.x, spoonPos.z - otherPos.z);
    };
    expect(xzOffset(napkins[0])).toBeGreaterThan(0.25);
    expect(xzOffset(saucers[0])).toBeGreaterThan(0.25);
    for (const jar of jars) {
      expect(xzOffset(jar)).toBeGreaterThan(0.25);
    }

    const colors = hexes(spoon);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === CREAM || c === LINEN)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === LINEN || c === CREAM)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    const size = new THREE.Box3().setFromObject(spoon).getSize(new THREE.Vector3());
    expect(size.x).toBeLessThan(0.12);
    expect(size.y).toBeLessThan(0.06);
    expect(size.z).toBeLessThan(0.16);

    let boxes = 0;
    spoon.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-spoon");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });
});

describe("house-shop PAPER table knife", () => {
  it("sits a tiny kraft PAPER knife on the living-room table, spoon and saucer remain", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const knives: THREE.Object3D[] = [];
    const spoons: THREE.Object3D[] = [];
    const saucers: THREE.Object3D[] = [];
    const napkins: THREE.Object3D[] = [];
    const jars: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.part === "knife" || obj.name === "house-shop-knife") {
        knives.push(obj);
      }
      if (obj.userData?.part === "spoon" || obj.name === "house-shop-spoon") {
        spoons.push(obj);
      }
      if (obj.userData?.part === "saucer") saucers.push(obj);
      if (obj.userData?.part === "napkin" || obj.name === "house-shop-napkin") {
        napkins.push(obj);
      }
      if (obj.userData?.part === "shelf-jar") jars.push(obj);
    });
    expect(knives.length).toBe(1);
    expect(spoons.length).toBe(1);
    expect(saucers.length).toBe(1);
    expect(napkins.length).toBe(1);
    expect(jars.length).toBeGreaterThan(0);

    const knife = knives[0];
    expect(knife.userData.part).toBe("knife");
    expect(knife.userData.kind).toBe("house-shop-knife");
    expect(knife.userData.mode).toBe("PAPER");
    expect(spoons[0].userData.part).toBe("spoon");
    expect(saucers[0].userData.part).toBe("saucer");

    const table = dress!.getObjectByName("house-shop-table");
    expect(table).toBeTruthy();
    expect(knife.parent?.name).toBe("house-shop-table");
    const top = table!.children.find((obj) => {
      const mesh = obj as THREE.Mesh;
      return mesh.isMesh && mesh.geometry.type === "BoxGeometry";
    }) as THREE.Mesh;
    expect(top).toBeTruthy();
    const tablePos = new THREE.Vector3();
    const knifePos = new THREE.Vector3();
    top.getWorldPosition(tablePos);
    knife.getWorldPosition(knifePos);
    expect(Math.hypot(knifePos.x - tablePos.x, knifePos.z - tablePos.z)).toBeLessThan(0.6);
    // Coffee-table top sits near y 0.58; knife rests on it, not the counter.
    expect(knifePos.y).toBeGreaterThan(0.5);
    expect(knifePos.y).toBeLessThan(0.75);

    const xzOffset = (other: THREE.Object3D) => {
      const otherPos = new THREE.Vector3();
      other.getWorldPosition(otherPos);
      return Math.hypot(knifePos.x - otherPos.x, knifePos.z - otherPos.z);
    };
    expect(xzOffset(spoons[0])).toBeGreaterThan(0.25);
    expect(xzOffset(napkins[0])).toBeGreaterThan(0.25);
    expect(xzOffset(saucers[0])).toBeGreaterThan(0.25);
    for (const jar of jars) {
      expect(xzOffset(jar)).toBeGreaterThan(0.25);
    }

    const colors = hexes(knife);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === CREAM || c === LINEN)).toBe(true);
    expect(colors.some((c) => c === WOOD)).toBe(true);
    expect(colors.some((c) => c === LINEN || c === CREAM)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    const size = new THREE.Box3().setFromObject(knife).getSize(new THREE.Vector3());
    expect(size.x).toBeLessThan(0.12);
    expect(size.y).toBeLessThan(0.06);
    expect(size.z).toBeLessThan(0.16);

    let boxes = 0;
    knife.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-knife");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(2);
  });
});

describe("house-shop PAPER table cup", () => {
  it("sits a tiny kraft PAPER cup on the living-room table; knife and spoon remain", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const cups: THREE.Object3D[] = [];
    const knives: THREE.Object3D[] = [];
    const spoons: THREE.Object3D[] = [];
    const napkins: THREE.Object3D[] = [];
    const saucers: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.part === "cup") cups.push(obj);
      if (obj.userData?.part === "knife" || obj.name === "house-shop-knife") {
        knives.push(obj);
      }
      if (obj.userData?.part === "spoon" || obj.name === "house-shop-spoon") {
        spoons.push(obj);
      }
      if (obj.userData?.part === "napkin" || obj.name === "house-shop-napkin") {
        napkins.push(obj);
      }
      if (obj.userData?.part === "saucer") saucers.push(obj);
    });
    expect(cups.length).toBe(1);
    expect(knives.length).toBe(1);
    expect(spoons.length).toBe(1);

    const cup = cups[0];
    expect(cup.userData.part).toBe("cup");
    expect(cup.userData.mode).toBe("PAPER");
    expect(knives[0].userData.part).toBe("knife");
    expect(spoons[0].userData.part).toBe("spoon");

    const table = dress!.getObjectByName("house-shop-table");
    expect(table).toBeTruthy();
    expect(cup.parent?.name).toBe("house-shop-table");
    const top = table!.children.find((obj) => {
      const mesh = obj as THREE.Mesh;
      return mesh.isMesh && mesh.geometry.type === "BoxGeometry";
    }) as THREE.Mesh;
    expect(top).toBeTruthy();
    const tablePos = new THREE.Vector3();
    const cupPos = new THREE.Vector3();
    top.getWorldPosition(tablePos);
    cup.getWorldPosition(cupPos);
    expect(Math.hypot(cupPos.x - tablePos.x, cupPos.z - tablePos.z)).toBeLessThan(0.6);
    expect(cupPos.y).toBeGreaterThan(0.5);
    expect(cupPos.y).toBeLessThan(0.85);

    const xzOffset = (other: THREE.Object3D) => {
      const otherPos = new THREE.Vector3();
      other.getWorldPosition(otherPos);
      return Math.hypot(cupPos.x - otherPos.x, cupPos.z - otherPos.z);
    };
    expect(xzOffset(knives[0])).toBeGreaterThan(0.25);
    expect(xzOffset(spoons[0])).toBeGreaterThan(0.25);
    expect(xzOffset(napkins[0])).toBeGreaterThan(0.25);
    expect(xzOffset(saucers[0])).toBeGreaterThan(0.25);

    const colors = hexes(cup);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === CREAM || c === LINEN)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    let boxes = 0;
    cup.traverse((obj) => {
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

describe("house-shop PAPER table coaster", () => {
  it("sits a tiny kraft PAPER coaster on the living-room table; cup, napkin, spoon, knife, saucer remain", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const coasters: THREE.Object3D[] = [];
    const cups: THREE.Object3D[] = [];
    const napkins: THREE.Object3D[] = [];
    const spoons: THREE.Object3D[] = [];
    const knives: THREE.Object3D[] = [];
    const saucers: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.part === "coaster" || obj.name === "house-shop-coaster") {
        coasters.push(obj);
      }
      if (obj.userData?.part === "cup") cups.push(obj);
      if (obj.userData?.part === "napkin" || obj.name === "house-shop-napkin") {
        napkins.push(obj);
      }
      if (obj.userData?.part === "spoon" || obj.name === "house-shop-spoon") {
        spoons.push(obj);
      }
      if (obj.userData?.part === "knife" || obj.name === "house-shop-knife") {
        knives.push(obj);
      }
      if (obj.userData?.part === "saucer") saucers.push(obj);
    });
    expect(coasters.length).toBe(1);
    expect(cups.length).toBe(1);
    expect(napkins.length).toBe(1);
    expect(spoons.length).toBe(1);
    expect(knives.length).toBe(1);
    expect(saucers.length).toBe(1);

    const coaster = coasters[0];
    expect(coaster.userData.part).toBe("coaster");
    expect(coaster.userData.kind).toBe("house-shop-coaster");
    expect(coaster.userData.mode).toBe("PAPER");
    expect(cups[0].userData.part).toBe("cup");
    expect(napkins[0].userData.part).toBe("napkin");
    expect(spoons[0].userData.part).toBe("spoon");
    expect(knives[0].userData.part).toBe("knife");
    expect(saucers[0].userData.part).toBe("saucer");

    const table = dress!.getObjectByName("house-shop-table");
    expect(table).toBeTruthy();
    expect(coaster.parent?.name).toBe("house-shop-table");
    const top = table!.children.find((obj) => {
      const mesh = obj as THREE.Mesh;
      return mesh.isMesh && mesh.geometry.type === "BoxGeometry";
    }) as THREE.Mesh;
    expect(top).toBeTruthy();
    const tablePos = new THREE.Vector3();
    const coasterPos = new THREE.Vector3();
    top.getWorldPosition(tablePos);
    coaster.getWorldPosition(coasterPos);
    expect(Math.hypot(coasterPos.x - tablePos.x, coasterPos.z - tablePos.z)).toBeLessThan(0.6);
    expect(coasterPos.y).toBeGreaterThan(0.5);
    expect(coasterPos.y).toBeLessThan(0.75);

    const xzOffset = (other: THREE.Object3D) => {
      const otherPos = new THREE.Vector3();
      other.getWorldPosition(otherPos);
      return Math.hypot(coasterPos.x - otherPos.x, coasterPos.z - otherPos.z);
    };
    expect(xzOffset(cups[0])).toBeGreaterThan(0.25);
    expect(xzOffset(napkins[0])).toBeGreaterThan(0.25);
    expect(xzOffset(spoons[0])).toBeGreaterThan(0.25);
    expect(xzOffset(knives[0])).toBeGreaterThan(0.25);
    expect(xzOffset(saucers[0])).toBeGreaterThan(0.25);

    const colors = hexes(coaster);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === CREAM || c === LINEN)).toBe(true);
    expect(colors.some((c) => c === WOOD || c === CREAM || c === LINEN)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    const size = new THREE.Box3().setFromObject(coaster).getSize(new THREE.Vector3());
    expect(size.x).toBeLessThan(0.16);
    expect(size.y).toBeLessThan(0.06);
    expect(size.z).toBeLessThan(0.16);

    let boxes = 0;
    coaster.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-coaster");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
  });
});

describe("house-shop PAPER table blotter", () => {
  it("sits a tiny kraft PAPER blotter on the living-room table; coaster, cup, napkin, spoon, knife, saucer remain", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const blotters: THREE.Object3D[] = [];
    const coasters: THREE.Object3D[] = [];
    const cups: THREE.Object3D[] = [];
    const napkins: THREE.Object3D[] = [];
    const spoons: THREE.Object3D[] = [];
    const knives: THREE.Object3D[] = [];
    const saucers: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.part === "blotter" || obj.name === "house-shop-blotter") {
        blotters.push(obj);
      }
      if (obj.userData?.part === "coaster" || obj.name === "house-shop-coaster") {
        coasters.push(obj);
      }
      if (obj.userData?.part === "cup") cups.push(obj);
      if (obj.userData?.part === "napkin" || obj.name === "house-shop-napkin") {
        napkins.push(obj);
      }
      if (obj.userData?.part === "spoon" || obj.name === "house-shop-spoon") {
        spoons.push(obj);
      }
      if (obj.userData?.part === "knife" || obj.name === "house-shop-knife") {
        knives.push(obj);
      }
      if (obj.userData?.part === "saucer") saucers.push(obj);
    });
    expect(blotters.length).toBe(1);
    expect(coasters.length).toBe(1);
    expect(cups.length).toBe(1);
    expect(napkins.length).toBe(1);
    expect(spoons.length).toBe(1);
    expect(knives.length).toBe(1);
    expect(saucers.length).toBe(1);

    const blotter = blotters[0];
    expect(blotter.userData.part).toBe("blotter");
    expect(blotter.userData.kind).toBe("house-shop-blotter");
    expect(blotter.userData.mode).toBe("PAPER");
    expect(coasters[0].userData.part).toBe("coaster");
    expect(cups[0].userData.part).toBe("cup");
    expect(napkins[0].userData.part).toBe("napkin");
    expect(spoons[0].userData.part).toBe("spoon");
    expect(knives[0].userData.part).toBe("knife");
    expect(saucers[0].userData.part).toBe("saucer");

    const table = dress!.getObjectByName("house-shop-table");
    expect(table).toBeTruthy();
    expect(blotter.parent?.name).toBe("house-shop-table");
    const top = table!.children.find((obj) => {
      const mesh = obj as THREE.Mesh;
      return mesh.isMesh && mesh.geometry.type === "BoxGeometry";
    }) as THREE.Mesh;
    expect(top).toBeTruthy();
    const tablePos = new THREE.Vector3();
    const blotterPos = new THREE.Vector3();
    top.getWorldPosition(tablePos);
    blotter.getWorldPosition(blotterPos);
    expect(Math.hypot(blotterPos.x - tablePos.x, blotterPos.z - tablePos.z)).toBeLessThan(0.6);
    expect(blotterPos.y).toBeGreaterThan(0.5);
    expect(blotterPos.y).toBeLessThan(0.75);

    const xzOffset = (other: THREE.Object3D) => {
      const otherPos = new THREE.Vector3();
      other.getWorldPosition(otherPos);
      return Math.hypot(blotterPos.x - otherPos.x, blotterPos.z - otherPos.z);
    };
    expect(xzOffset(coasters[0])).toBeGreaterThan(0.25);
    expect(xzOffset(cups[0])).toBeGreaterThan(0.25);
    expect(xzOffset(napkins[0])).toBeGreaterThan(0.25);
    expect(xzOffset(spoons[0])).toBeGreaterThan(0.25);
    expect(xzOffset(knives[0])).toBeGreaterThan(0.25);
    expect(xzOffset(saucers[0])).toBeGreaterThan(0.25);

    const colors = hexes(blotter);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === CREAM || c === LINEN)).toBe(true);
    expect(colors.some((c) => c === WOOD || c === CREAM || c === LINEN)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    const size = new THREE.Box3().setFromObject(blotter).getSize(new THREE.Vector3());
    expect(size.x).toBeLessThan(0.16);
    expect(size.y).toBeLessThan(0.06);
    expect(size.z).toBeLessThan(0.16);

    let boxes = 0;
    blotter.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-blotter");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
  });
});

describe("house-shop PAPER table stamp", () => {
  it("sits a tiny kraft PAPER stamp on the living-room table; blotter, coaster, cup, napkin, spoon, knife, saucer remain", () => {
    const scene = new THREE.Scene();
    const interior = makeInteriorScene();
    scene.add(interior);
    dressHouseShop(scene);

    const dress = interior.getObjectByName("house-shop-dress");
    expect(dress).toBeTruthy();
    expect(dress!.userData.mode).toBe("PAPER");

    const stamps: THREE.Object3D[] = [];
    const blotters: THREE.Object3D[] = [];
    const coasters: THREE.Object3D[] = [];
    const cups: THREE.Object3D[] = [];
    const napkins: THREE.Object3D[] = [];
    const spoons: THREE.Object3D[] = [];
    const knives: THREE.Object3D[] = [];
    const saucers: THREE.Object3D[] = [];
    dress!.traverse((obj) => {
      if (obj.userData?.part === "stamp" || obj.name === "house-shop-stamp") {
        stamps.push(obj);
      }
      if (obj.userData?.part === "blotter" || obj.name === "house-shop-blotter") {
        blotters.push(obj);
      }
      if (obj.userData?.part === "coaster" || obj.name === "house-shop-coaster") {
        coasters.push(obj);
      }
      if (obj.userData?.part === "cup") cups.push(obj);
      if (obj.userData?.part === "napkin" || obj.name === "house-shop-napkin") {
        napkins.push(obj);
      }
      if (obj.userData?.part === "spoon" || obj.name === "house-shop-spoon") {
        spoons.push(obj);
      }
      if (obj.userData?.part === "knife" || obj.name === "house-shop-knife") {
        knives.push(obj);
      }
      if (obj.userData?.part === "saucer") saucers.push(obj);
    });
    expect(stamps.length).toBe(1);
    expect(blotters.length).toBe(1);
    expect(coasters.length).toBe(1);
    expect(cups.length).toBe(1);
    expect(napkins.length).toBe(1);
    expect(spoons.length).toBe(1);
    expect(knives.length).toBe(1);
    expect(saucers.length).toBe(1);

    const stamp = stamps[0];
    expect(stamp.userData.part).toBe("stamp");
    expect(stamp.userData.kind).toBe("house-shop-stamp");
    expect(stamp.userData.mode).toBe("PAPER");
    expect(blotters[0].userData.part).toBe("blotter");
    expect(coasters[0].userData.part).toBe("coaster");
    expect(cups[0].userData.part).toBe("cup");
    expect(napkins[0].userData.part).toBe("napkin");
    expect(spoons[0].userData.part).toBe("spoon");
    expect(knives[0].userData.part).toBe("knife");
    expect(saucers[0].userData.part).toBe("saucer");

    const table = dress!.getObjectByName("house-shop-table");
    expect(table).toBeTruthy();
    expect(stamp.parent?.name).toBe("house-shop-table");
    const top = table!.children.find((obj) => {
      const mesh = obj as THREE.Mesh;
      return mesh.isMesh && mesh.geometry.type === "BoxGeometry";
    }) as THREE.Mesh;
    expect(top).toBeTruthy();
    const tablePos = new THREE.Vector3();
    const stampPos = new THREE.Vector3();
    top.getWorldPosition(tablePos);
    stamp.getWorldPosition(stampPos);
    expect(Math.hypot(stampPos.x - tablePos.x, stampPos.z - tablePos.z)).toBeLessThan(0.6);
    expect(stampPos.y).toBeGreaterThan(0.5);
    expect(stampPos.y).toBeLessThan(0.75);

    const xzOffset = (other: THREE.Object3D) => {
      const otherPos = new THREE.Vector3();
      other.getWorldPosition(otherPos);
      return Math.hypot(stampPos.x - otherPos.x, stampPos.z - otherPos.z);
    };
    expect(xzOffset(blotters[0])).toBeGreaterThan(0.25);
    expect(xzOffset(coasters[0])).toBeGreaterThan(0.25);
    expect(xzOffset(cups[0])).toBeGreaterThan(0.25);
    expect(xzOffset(napkins[0])).toBeGreaterThan(0.25);
    expect(xzOffset(spoons[0])).toBeGreaterThan(0.25);
    expect(xzOffset(knives[0])).toBeGreaterThan(0.25);
    expect(xzOffset(saucers[0])).toBeGreaterThan(0.25);

    const colors = hexes(stamp);
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((c) => c === WOOD || c === CREAM || c === LINEN)).toBe(true);
    expect(colors.some((c) => c === WOOD || c === CREAM || c === LINEN)).toBe(true);
    expect(colors.every((c) => !isGrey(c))).toBe(true);

    const size = new THREE.Box3().setFromObject(stamp).getSize(new THREE.Vector3());
    expect(size.x).toBeLessThan(0.16);
    expect(size.y).toBeLessThan(0.06);
    expect(size.z).toBeLessThan(0.16);

    let boxes = 0;
    stamp.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        boxes += 1;
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("house-shop-stamp");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(boxes).toBeGreaterThanOrEqual(1);
  });
});
