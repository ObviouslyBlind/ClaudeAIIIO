import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  canEnter,
  createInterior,
  makeInteriorScene,
  wrapHarbourWorld,
  DOWNSTAIRS_Y,
  UPSTAIRS_Y,
} from "../public/harbour/interior.js";

function plot(partial: Record<string, unknown> = {}) {
  return {
    id: "n-street-0",
    island: "north",
    x: 40,
    z: -7000,
    owner: "visitor",
    use: "stall",
    ...partial,
  };
}

describe("owned building interiors", () => {
  it("canEnter is true only if owner is visitor and use is set", () => {
    expect(canEnter(plot({ owner: "visitor", use: "stall" }))).toBe(true);
    expect(canEnter(plot({ owner: "visitor", use: "farm" }))).toBe(true);
    expect(canEnter(plot({ owner: "visitor", use: null }))).toBe(false);
    expect(canEnter(plot({ owner: "visitor", use: "" }))).toBe(false);
    expect(canEnter({ owner: "visitor", use: undefined })).toBe(false);
    expect(canEnter(plot({ owner: "npc", use: "stall" }))).toBe(false);
    expect(canEnter(plot({ owner: null, use: "stall" }))).toBe(false);
    expect(canEnter(plot({ owner: "alice", use: "farm" }))).toBe(false);
    expect(canEnter(undefined)).toBe(false);
    expect(canEnter(null)).toBe(false);
  });

  it("builds downstairs, stairs, and upstairs placeholder boxes labelled PAPER", () => {
    const g = makeInteriorScene();
    const names = g.children.map((c) => c.name);
    expect(names).toContain("downstairs");
    expect(names).toContain("stairs");
    expect(names).toContain("upstairs");
    expect(g.userData.mode).toBe("PAPER");
    const paper = [];
    g.traverse((o) => {
      if (o.userData?.kind === "interior-paper" || o.userData?.mode === "PAPER") paper.push(o);
    });
    expect(paper.length).toBeGreaterThan(1);
    let boxes = 0;
    g.traverse((o) => {
      if (o.isMesh) boxes += 1;
    });
    expect(boxes).toBeGreaterThan(12);
  });

  it("dresses PAPER rooms as a Caribbean house: windows, table, chairs, stool, lamp, clock, picture, vase, mug, saucer, book, napkin, spoon, fork, knife, plate, cup, bed", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs");
    const up = g.getObjectByName("upstairs");
    expect(down).toBeTruthy();
    expect(up).toBeTruthy();

    const kindsIn = (root: THREE.Object3D) => {
      const kinds: string[] = [];
      root.traverse((o) => {
        if (o.userData?.kind) kinds.push(o.userData.kind);
      });
      return kinds;
    };

    const downKinds = kindsIn(down!);
    expect(downKinds).toContain("interior-table");
    expect(downKinds.filter((k) => k === "interior-chair").length).toBeGreaterThanOrEqual(2);
    expect(downKinds).toContain("interior-lamp");
    expect(downKinds).toContain("interior-clock");
    expect(downKinds).toContain("interior-picture");
    expect(downKinds).toContain("interior-vase");
    expect(downKinds).toContain("interior-mug");
    expect(downKinds).toContain("interior-saucer");
    expect(downKinds).toContain("interior-book");
    expect(downKinds).toContain("interior-napkin");
    expect(downKinds).toContain("interior-spoon");
    expect(downKinds).toContain("interior-fork");
    expect(downKinds).toContain("interior-knife");
    expect(downKinds).toContain("interior-plate");
    expect(downKinds).toContain("interior-cup");
    expect(downKinds).toContain("interior-stool");
    expect(downKinds).toContain("interior-window");
    expect(downKinds).toContain("exit");
    expect(downKinds).toContain("interior-floor");
    expect(downKinds).toContain("interior-paper");

    const upKinds = kindsIn(up!);
    expect(upKinds).toContain("interior-bed");
    expect(upKinds).toContain("interior-lamp");
    expect(upKinds).toContain("interior-window");
    expect(upKinds).toContain("interior-floor");
    expect(upKinds).toContain("interior-paper");
    expect(upKinds).not.toContain("interior-clock");
    expect(upKinds).not.toContain("interior-picture");
    expect(upKinds).not.toContain("interior-vase");
    expect(upKinds).not.toContain("interior-mug");
    expect(upKinds).not.toContain("interior-saucer");
    expect(upKinds).not.toContain("interior-book");
    expect(upKinds).not.toContain("interior-napkin");
    expect(upKinds).not.toContain("interior-spoon");
    expect(upKinds).not.toContain("interior-fork");
    expect(upKinds).not.toContain("interior-knife");
    expect(upKinds).not.toContain("interior-plate");
    expect(upKinds).not.toContain("interior-cup");
    expect(upKinds).not.toContain("interior-stool");

    const table = down!.getObjectByName("table");
    expect(table).toBeTruthy();
    expect(table!.userData.mode).toBe("PAPER");
    expect(table!.userData.kind).toBe("interior-table");
    const tablePos = new THREE.Vector3();
    table!.getWorldPosition(tablePos);
    expect(Math.abs(tablePos.x)).toBeLessThan(1);
    expect(tablePos.z).toBeLessThan(1.2);
    expect(tablePos.z).toBeGreaterThan(-2);
    let kraftTop = false;
    table!.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).material && "color" in (o as THREE.Mesh).material) {
        const hex = ((o as THREE.Mesh).material as THREE.MeshLambertMaterial).color.getHex();
        if (hex === 0xf3efe4) kraftTop = true;
      }
    });
    expect(kraftTop).toBe(true);
    const chair = down!.getObjectByName("chair");
    expect(chair).toBeTruthy();
    expect(chair!.userData.mode).toBe("PAPER");

    const lamp = down!.getObjectByName("lamp");
    expect(lamp).toBeTruthy();
    expect(lamp!.userData.mode).toBe("PAPER");
    expect(lamp!.userData.kind).toBe("interior-lamp");
    const lampPos = new THREE.Vector3();
    lamp!.getWorldPosition(lampPos);
    expect(Math.abs(lampPos.x)).toBeLessThan(1);
    expect(lampPos.z).toBeLessThan(1.2);
    expect(lampPos.z).toBeGreaterThan(-2);
    expect(lampPos.y).toBeGreaterThan(1.6);
    let kraftShade = false;
    let glowing = false;
    let shadeW = 0;
    lamp!.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).material && "color" in (o as THREE.Mesh).material) {
        const mat = (o as THREE.Mesh).material as THREE.MeshLambertMaterial;
        const hex = mat.color.getHex();
        if (hex === 0xf3efe4) {
          kraftShade = true;
          o.geometry.computeBoundingBox();
          const bb = o.geometry.boundingBox!;
          shadeW = bb.max.x - bb.min.x;
        }
        if (mat.emissive && mat.emissive.getHex() !== 0) glowing = true;
      }
    });
    expect(kraftShade).toBe(true);
    expect(glowing).toBe(true);
    expect(shadeW).toBeGreaterThan(0.2);
    expect(shadeW).toBeLessThan(0.5);

    const clock = down!.getObjectByName("clock");
    expect(clock).toBeTruthy();
    expect(clock!.userData.mode).toBe("PAPER");
    expect(clock!.userData.kind).toBe("interior-clock");
    const clockPos = new THREE.Vector3();
    clock!.getWorldPosition(clockPos);
    expect(clockPos.y).toBeGreaterThan(1.4);
    expect(clockPos.y).toBeLessThan(2.4);
    expect(clockPos.z).toBeLessThan(-3);
    let kraftFace = false;
    let woodRim = false;
    clock!.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).material && "color" in (o as THREE.Mesh).material) {
        const hex = ((o as THREE.Mesh).material as THREE.MeshLambertMaterial).color.getHex();
        if (hex === 0xf3efe4) kraftFace = true;
        if (hex === 0x5a3a22) woodRim = true;
      }
    });
    expect(kraftFace).toBe(true);
    expect(woodRim).toBe(true);

    let exitDoors = 0;
    g.traverse((o) => {
      if (o.userData?.kind === "exit" && (o as THREE.Mesh).isMesh) exitDoors += 1;
    });
    expect(exitDoors).toBeGreaterThanOrEqual(1);
  });

  it("hides the harbour group without removing it, then exit restores the plot", () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec8d4);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(hemi);
    const worldBox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    worldBox.name = "island";
    scene.add(worldBox);
    const player = new THREE.Object3D();
    player.position.set(12, 2, -30);
    scene.add(player);

    const harbour = wrapHarbourWorld(scene, { keep: [player] });
    expect(harbour.parent).toBe(scene);
    expect(worldBox.parent).toBe(harbour);
    expect(scene.children).toContain(harbour);
    expect(scene.children).toContain(hemi);

    const statuses: string[] = [];
    const interior = createInterior({
      scene,
      player,
      setStatus: (t: string) => statuses.push(t),
      heightAt: () => 1.12,
      specOf: () => ({ id: "north" }),
    });
    interior.setHarbour(harbour);

    expect(interior.enter(plot({ owner: "npc", use: "stall" }))).toBe(false);
    expect(harbour.visible).toBe(true);
    expect(interior.isInside()).toBe(false);

    const p = plot({ owner: "visitor", use: "farm", x: 88, z: -6910 });
    expect(interior.enter(p)).toBe(true);
    expect(interior.isInside()).toBe(true);
    expect(interior.currentFloor()).toBe("downstairs");
    expect(player.position.y).toBeCloseTo(DOWNSTAIRS_Y, 5);
    expect(harbour.visible).toBe(false);
    expect(scene.children).toContain(harbour);
    expect(harbour.parent).toBe(scene);
    expect(statuses.some((s) => s.includes("PAPER"))).toBe(true);

    interior.goStairs();
    expect(interior.currentFloor()).toBe("upstairs");
    expect(player.position.y).toBeCloseTo(UPSTAIRS_Y, 5);

    const left = interior.exit();
    expect(left).toBe(p);
    expect(interior.isInside()).toBe(false);
    expect(harbour.visible).toBe(true);
    expect(scene.children).toContain(harbour);
    expect(player.position.x).toBeCloseTo(88);
    expect(player.position.z).toBeCloseTo(-6910);
    expect(player.position.y).toBeCloseTo(1.12 + 1.15);
  });
});

const VASE_HEX = new Set([0x5a3a22, 0x6e4428, 0xf4ead8, 0xefe0c8]);

function isGrey(hex: number) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

function collectKind(root: THREE.Object3D, kind: string) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.kind === kind && obj.name === kind.replace("interior-", "")) {
      out.push(obj);
    }
  });
  return out;
}

describe("house PAPER vase", () => {
  it("puts one kraft PAPER vase on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const vases = collectKind(down, "interior-vase");
    expect(vases.length).toBe(1);
    expect(collectKind(up, "interior-vase").length).toBe(0);

    const vase = vases[0];
    expect(vase.userData.kind).toBe("interior-vase");
    expect(vase.userData.mode).toBe("PAPER");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const vasePos = new THREE.Vector3();
    vase.getWorldPosition(vasePos);
    expect(Math.hypot(vasePos.x - tablePos.x, vasePos.z - tablePos.z)).toBeLessThan(0.85);
    expect(vasePos.y).toBeGreaterThan(0.9);
    expect(vasePos.y).toBeLessThan(1.2);

    const colors: number[] = [];
    vase.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(VASE_HEX.has(hex)).toBe(true);
        expect(isGrey(hex)).toBe(false);
        expect(["BoxGeometry", "CylinderGeometry"]).toContain(mesh.geometry.type);
        expect(mesh.userData.kind).toBe("interior-vase");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0xf4ead8 || c === 0xefe0c8)).toBe(true);
    expect(colors.some((c) => c === 0x5a3a22 || c === 0x6e4428)).toBe(true);

    const picture = down.getObjectByName("picture");
    expect(picture).toBeTruthy();
    expect(picture!.userData.kind).toBe("interior-picture");
    expect(picture!.userData.mode).toBe("PAPER");
    const picPos = new THREE.Vector3();
    picture!.getWorldPosition(picPos);
    expect(picPos.x).toBeCloseTo(-3.25, 5);
    expect(picPos.y).toBeCloseTo(1.72, 5);
    expect(picPos.z).toBeCloseTo(-3.38, 5);

    const clock = down.getObjectByName("clock");
    expect(clock).toBeTruthy();
    expect(clock!.userData.kind).toBe("interior-clock");
    expect(clock!.userData.mode).toBe("PAPER");
    const clockPos = new THREE.Vector3();
    clock!.getWorldPosition(clockPos);
    expect(clockPos.x).toBeCloseTo(2.72, 5);
    expect(clockPos.y).toBeCloseTo(1.78, 5);
    expect(clockPos.z).toBeCloseTo(-3.38, 5);
    expect(up.getObjectByName("picture")).toBeFalsy();
    expect(up.getObjectByName("clock")).toBeFalsy();
  });
});

const STOOL_HEX = new Set([0x5a3a22, 0x6e4428]);

describe("house PAPER stool", () => {
  it("puts one kraft PAPER stool beside the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const stools = collectKind(down, "interior-stool");
    expect(stools.length).toBe(1);
    expect(collectKind(up, "interior-stool").length).toBe(0);

    const stool = stools[0];
    expect(stool.userData.kind).toBe("interior-stool");
    expect(stool.userData.mode).toBe("PAPER");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const stoolPos = new THREE.Vector3();
    stool.getWorldPosition(stoolPos);
    const beside = Math.hypot(stoolPos.x - tablePos.x, stoolPos.z - tablePos.z);
    expect(beside).toBeGreaterThan(0.7);
    expect(beside).toBeLessThan(1.6);
    expect(stoolPos.y).toBeLessThan(0.3);

    const colors: number[] = [];
    let legs = 0;
    let seats = 0;
    stool.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(STOOL_HEX.has(hex)).toBe(true);
        expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-stool");
        expect(mesh.userData.mode).toBe("PAPER");
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox!;
        const h = bb.max.y - bb.min.y;
        const w = bb.max.x - bb.min.x;
        if (h > w * 2) legs += 1;
        else seats += 1;
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x6e4428)).toBe(true);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(legs).toBe(3);
    expect(seats).toBeGreaterThanOrEqual(1);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    expect(vase!.userData.kind).toBe("interior-vase");
    const picture = down.getObjectByName("picture");
    expect(picture).toBeTruthy();
    expect(picture!.userData.kind).toBe("interior-picture");
    const clock = down.getObjectByName("clock");
    expect(clock).toBeTruthy();
    expect(clock!.userData.kind).toBe("interior-clock");
    const lamp = down.getObjectByName("lamp");
    expect(lamp).toBeTruthy();
    expect(lamp!.userData.kind).toBe("interior-lamp");
    expect(up.getObjectByName("stool")).toBeFalsy();
  });
});

const MUG_HEX = new Set([0x5a3a22, 0x6e4428, 0xf4ead8]);

describe("house PAPER mug", () => {
  it("puts one kraft PAPER mug on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const mugs = collectKind(down, "interior-mug");
    expect(mugs.length).toBe(1);
    expect(collectKind(up, "interior-mug").length).toBe(0);

    const mug = mugs[0];
    expect(mug.userData.kind).toBe("interior-mug");
    expect(mug.userData.mode).toBe("PAPER");
    expect(mug.userData.part).toBe("mug");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const mugPos = new THREE.Vector3();
    mug.getWorldPosition(mugPos);
    expect(Math.hypot(mugPos.x - tablePos.x, mugPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(mugPos.y).toBeGreaterThan(0.9);
    expect(mugPos.y).toBeLessThan(1.2);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(mugPos.x - vasePos.x, mugPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const cup = down.getObjectByName("cup");
    expect(cup).toBeTruthy();
    expect(cup!.userData.part).toBe("cup");
    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    expect(napkin!.userData.part).toBe("napkin");
    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    expect(spoon!.userData.part).toBe("spoon");
    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const knife = down.getObjectByName("knife");
    expect(knife).toBeTruthy();
    expect(knife!.userData.part).toBe("knife");
    const plate = down.getObjectByName("plate");
    expect(plate).toBeTruthy();
    expect(plate!.userData.part).toBe("plate");

    const colors: number[] = [];
    mug.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(MUG_HEX.has(hex)).toBe(true);
        expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-mug");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("mug");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0x5a3a22 || c === 0x6e4428)).toBe(true);

    const stool = down.getObjectByName("stool");
    expect(stool).toBeTruthy();
    expect(stool!.userData.kind).toBe("interior-stool");
    expect(stool!.userData.mode).toBe("PAPER");
    const picture = down.getObjectByName("picture");
    expect(picture).toBeTruthy();
    expect(picture!.userData.kind).toBe("interior-picture");
    const clock = down.getObjectByName("clock");
    expect(clock).toBeTruthy();
    expect(clock!.userData.kind).toBe("interior-clock");
    expect(up.getObjectByName("mug")).toBeFalsy();
    expect(up.getObjectByName("cup")).toBeFalsy();
  });
});

const BOOK_HEX = new Set([0x5a3a22, 0xf3efe4, 0xf4ead8]);

describe("house PAPER book", () => {
  it("puts one kraft PAPER book on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const books = collectKind(down, "interior-book");
    expect(books.length).toBe(1);
    expect(collectKind(up, "interior-book").length).toBe(0);

    const book = books[0];
    expect(book.userData.kind).toBe("interior-book");
    expect(book.userData.mode).toBe("PAPER");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const bookPos = new THREE.Vector3();
    book.getWorldPosition(bookPos);
    expect(Math.hypot(bookPos.x - tablePos.x, bookPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(bookPos.y).toBeGreaterThan(0.9);
    expect(bookPos.y).toBeLessThan(1.2);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(bookPos.x - mugPos.x, bookPos.z - mugPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(bookPos.x - vasePos.x, bookPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    book.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(BOOK_HEX.has(hex)).toBe(true);
        if (hex !== 0xf3efe4) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-book");
        expect(mesh.userData.mode).toBe("PAPER");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf3efe4 || c === 0xf4ead8)).toBe(true);

    const stool = down.getObjectByName("stool");
    expect(stool).toBeTruthy();
    expect(stool!.userData.kind).toBe("interior-stool");
    expect(stool!.userData.mode).toBe("PAPER");
    const picture = down.getObjectByName("picture");
    expect(picture).toBeTruthy();
    expect(picture!.userData.kind).toBe("interior-picture");
    const clock = down.getObjectByName("clock");
    expect(clock).toBeTruthy();
    expect(clock!.userData.kind).toBe("interior-clock");
    expect(up.getObjectByName("book")).toBeFalsy();
  });
});

const NAPKIN_HEX = new Set([0xf3efe4, 0xf7f1e6, 0xf4ead8]);

describe("house PAPER napkin", () => {
  it("puts one kraft PAPER napkin on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const napkins = collectKind(down, "interior-napkin");
    expect(napkins.length).toBe(1);
    expect(collectKind(up, "interior-napkin").length).toBe(0);

    const napkin = napkins[0];
    expect(napkin.userData.kind).toBe("interior-napkin");
    expect(napkin.userData.mode).toBe("PAPER");
    expect(napkin.userData.part).toBe("napkin");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const napkinPos = new THREE.Vector3();
    napkin.getWorldPosition(napkinPos);
    expect(Math.hypot(napkinPos.x - tablePos.x, napkinPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(napkinPos.y).toBeGreaterThan(0.9);
    expect(napkinPos.y).toBeLessThan(1.2);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(napkinPos.x - mugPos.x, napkinPos.z - mugPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(napkinPos.x - vasePos.x, napkinPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(napkinPos.x - bookPos.x, napkinPos.z - bookPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    napkin.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(NAPKIN_HEX.has(hex)).toBe(true);
        if (hex !== 0xf3efe4 && hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-napkin");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("napkin");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0xf3efe4)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);

    const stool = down.getObjectByName("stool");
    expect(stool).toBeTruthy();
    expect(stool!.userData.kind).toBe("interior-stool");
    expect(stool!.userData.mode).toBe("PAPER");
    const picture = down.getObjectByName("picture");
    expect(picture).toBeTruthy();
    expect(picture!.userData.kind).toBe("interior-picture");
    const clock = down.getObjectByName("clock");
    expect(clock).toBeTruthy();
    expect(clock!.userData.kind).toBe("interior-clock");
    expect(up.getObjectByName("napkin")).toBeFalsy();
  });
});

const SPOON_HEX = new Set([0x5a3a22, 0xf4ead8]);

describe("house PAPER spoon", () => {
  it("puts one kraft PAPER spoon on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const spoons = collectKind(down, "interior-spoon");
    expect(spoons.length).toBe(1);
    expect(collectKind(up, "interior-spoon").length).toBe(0);

    const spoon = spoons[0];
    expect(spoon.userData.kind).toBe("interior-spoon");
    expect(spoon.userData.mode).toBe("PAPER");
    expect(spoon.userData.part).toBe("spoon");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const spoonPos = new THREE.Vector3();
    spoon.getWorldPosition(spoonPos);
    expect(Math.hypot(spoonPos.x - tablePos.x, spoonPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(spoonPos.y).toBeGreaterThan(0.9);
    expect(spoonPos.y).toBeLessThan(1.2);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(spoonPos.x - mugPos.x, spoonPos.z - mugPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(spoonPos.x - vasePos.x, spoonPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(spoonPos.x - bookPos.x, spoonPos.z - bookPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(spoonPos.x - napkinPos.x, spoonPos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    spoon.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(SPOON_HEX.has(hex)).toBe(true);
        expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-spoon");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("spoon");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);

    const stool = down.getObjectByName("stool");
    expect(stool).toBeTruthy();
    expect(stool!.userData.kind).toBe("interior-stool");
    expect(stool!.userData.mode).toBe("PAPER");
    const picture = down.getObjectByName("picture");
    expect(picture).toBeTruthy();
    expect(picture!.userData.kind).toBe("interior-picture");
    const clock = down.getObjectByName("clock");
    expect(clock).toBeTruthy();
    expect(clock!.userData.kind).toBe("interior-clock");
    expect(up.getObjectByName("spoon")).toBeFalsy();
  });
});

const FORK_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER fork", () => {
  it("puts one kraft PAPER fork on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const forks = collectKind(down, "interior-fork");
    expect(forks.length).toBe(1);
    expect(collectKind(up, "interior-fork").length).toBe(0);

    const fork = forks[0];
    expect(fork.userData.kind).toBe("interior-fork");
    expect(fork.userData.mode).toBe("PAPER");
    expect(fork.userData.part).toBe("fork");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const forkPos = new THREE.Vector3();
    fork.getWorldPosition(forkPos);
    expect(Math.hypot(forkPos.x - tablePos.x, forkPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(forkPos.y).toBeGreaterThan(0.9);
    expect(forkPos.y).toBeLessThan(1.2);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(forkPos.x - mugPos.x, forkPos.z - mugPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(forkPos.x - vasePos.x, forkPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(forkPos.x - bookPos.x, forkPos.z - bookPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(forkPos.x - napkinPos.x, forkPos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(forkPos.x - spoonPos.x, forkPos.z - spoonPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    fork.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(FORK_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-fork");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("fork");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    const stool = down.getObjectByName("stool");
    expect(stool).toBeTruthy();
    expect(stool!.userData.kind).toBe("interior-stool");
    expect(stool!.userData.mode).toBe("PAPER");
    const picture = down.getObjectByName("picture");
    expect(picture).toBeTruthy();
    expect(picture!.userData.kind).toBe("interior-picture");
    const clock = down.getObjectByName("clock");
    expect(clock).toBeTruthy();
    expect(clock!.userData.kind).toBe("interior-clock");
    expect(up.getObjectByName("fork")).toBeFalsy();
  });
});

const KNIFE_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER knife", () => {
  it("puts one kraft PAPER knife on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const knives = collectKind(down, "interior-knife");
    expect(knives.length).toBe(1);
    expect(collectKind(up, "interior-knife").length).toBe(0);

    const knife = knives[0];
    expect(knife.userData.kind).toBe("interior-knife");
    expect(knife.userData.mode).toBe("PAPER");
    expect(knife.userData.part).toBe("knife");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const knifePos = new THREE.Vector3();
    knife.getWorldPosition(knifePos);
    expect(Math.hypot(knifePos.x - tablePos.x, knifePos.z - tablePos.z)).toBeLessThan(0.85);
    expect(knifePos.y).toBeGreaterThan(0.9);
    expect(knifePos.y).toBeLessThan(1.2);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(knifePos.x - mugPos.x, knifePos.z - mugPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(knifePos.x - vasePos.x, knifePos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(knifePos.x - bookPos.x, knifePos.z - bookPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(knifePos.x - napkinPos.x, knifePos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    expect(spoon!.userData.part).toBe("spoon");
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(knifePos.x - spoonPos.x, knifePos.z - spoonPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-spoon").length).toBe(1);

    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const forkPos = new THREE.Vector3();
    fork!.getWorldPosition(forkPos);
    expect(Math.hypot(knifePos.x - forkPos.x, knifePos.z - forkPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-fork").length).toBe(1);

    const colors: number[] = [];
    knife.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(KNIFE_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-knife");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("knife");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    const stool = down.getObjectByName("stool");
    expect(stool).toBeTruthy();
    expect(stool!.userData.kind).toBe("interior-stool");
    expect(stool!.userData.mode).toBe("PAPER");
    const picture = down.getObjectByName("picture");
    expect(picture).toBeTruthy();
    expect(picture!.userData.kind).toBe("interior-picture");
    const clock = down.getObjectByName("clock");
    expect(clock).toBeTruthy();
    expect(clock!.userData.kind).toBe("interior-clock");
    expect(up.getObjectByName("knife")).toBeFalsy();
    expect(up.getObjectByName("fork")).toBeFalsy();
    expect(up.getObjectByName("spoon")).toBeFalsy();
  });
});

const PLATE_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER plate", () => {
  it("puts one kraft PAPER plate on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const plates = collectKind(down, "interior-plate");
    expect(plates.length).toBe(1);
    expect(collectKind(up, "interior-plate").length).toBe(0);

    const plate = plates[0];
    expect(plate.userData.kind).toBe("interior-plate");
    expect(plate.userData.mode).toBe("PAPER");
    expect(plate.userData.part).toBe("plate");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const platePos = new THREE.Vector3();
    plate.getWorldPosition(platePos);
    expect(Math.hypot(platePos.x - tablePos.x, platePos.z - tablePos.z)).toBeLessThan(0.85);
    expect(platePos.y).toBeGreaterThan(0.9);
    expect(platePos.y).toBeLessThan(1.2);

    const knife = down.getObjectByName("knife");
    expect(knife).toBeTruthy();
    expect(knife!.userData.part).toBe("knife");
    const knifePos = new THREE.Vector3();
    knife!.getWorldPosition(knifePos);
    expect(Math.hypot(platePos.x - knifePos.x, platePos.z - knifePos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-knife").length).toBe(1);

    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const forkPos = new THREE.Vector3();
    fork!.getWorldPosition(forkPos);
    expect(Math.hypot(platePos.x - forkPos.x, platePos.z - forkPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-fork").length).toBe(1);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(platePos.x - spoonPos.x, platePos.z - spoonPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(platePos.x - napkinPos.x, platePos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    plate.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(PLATE_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-plate");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("plate");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    expect(up.getObjectByName("plate")).toBeFalsy();
    expect(up.getObjectByName("knife")).toBeFalsy();
    expect(up.getObjectByName("fork")).toBeFalsy();
  });
});

const CUP_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER cup", () => {
  it("puts one kraft PAPER cup on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const cups = collectKind(down, "interior-cup");
    expect(cups.length).toBe(1);
    expect(collectKind(up, "interior-cup").length).toBe(0);

    const cup = cups[0];
    expect(cup.userData.kind).toBe("interior-cup");
    expect(cup.userData.mode).toBe("PAPER");
    expect(cup.userData.part).toBe("cup");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const cupPos = new THREE.Vector3();
    cup.getWorldPosition(cupPos);
    expect(Math.hypot(cupPos.x - tablePos.x, cupPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(cupPos.y).toBeGreaterThan(0.9);
    expect(cupPos.y).toBeLessThan(1.2);

    const plate = down.getObjectByName("plate");
    expect(plate).toBeTruthy();
    expect(plate!.userData.part).toBe("plate");
    const platePos = new THREE.Vector3();
    plate!.getWorldPosition(platePos);
    expect(Math.hypot(cupPos.x - platePos.x, cupPos.z - platePos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-plate").length).toBe(1);

    const knife = down.getObjectByName("knife");
    expect(knife).toBeTruthy();
    expect(knife!.userData.part).toBe("knife");
    const knifePos = new THREE.Vector3();
    knife!.getWorldPosition(knifePos);
    expect(Math.hypot(cupPos.x - knifePos.x, cupPos.z - knifePos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-knife").length).toBe(1);

    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const forkPos = new THREE.Vector3();
    fork!.getWorldPosition(forkPos);
    expect(Math.hypot(cupPos.x - forkPos.x, cupPos.z - forkPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-fork").length).toBe(1);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    expect(spoon!.userData.part).toBe("spoon");
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(cupPos.x - spoonPos.x, cupPos.z - spoonPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    expect(napkin!.userData.part).toBe("napkin");
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(cupPos.x - napkinPos.x, cupPos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    cup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(CUP_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-cup");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("cup");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    expect(up.getObjectByName("cup")).toBeFalsy();
    expect(up.getObjectByName("plate")).toBeFalsy();
    expect(up.getObjectByName("knife")).toBeFalsy();
    expect(up.getObjectByName("fork")).toBeFalsy();
  });
});

const SAUCER_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER saucer", () => {
  it("puts one kraft PAPER saucer on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const saucers = collectKind(down, "interior-saucer");
    expect(saucers.length).toBe(1);
    expect(collectKind(up, "interior-saucer").length).toBe(0);

    const saucer = saucers[0];
    expect(saucer.userData.kind).toBe("interior-saucer");
    expect(saucer.userData.mode).toBe("PAPER");
    expect(saucer.userData.part).toBe("saucer");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const saucerPos = new THREE.Vector3();
    saucer.getWorldPosition(saucerPos);
    expect(Math.hypot(saucerPos.x - tablePos.x, saucerPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(saucerPos.y).toBeGreaterThan(0.9);
    expect(saucerPos.y).toBeLessThan(1.2);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    expect(mug!.userData.part).toBe("mug");
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(saucerPos.x - mugPos.x, saucerPos.z - mugPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-mug").length).toBe(1);

    const cup = down.getObjectByName("cup");
    expect(cup).toBeTruthy();
    expect(cup!.userData.part).toBe("cup");
    const cupPos = new THREE.Vector3();
    cup!.getWorldPosition(cupPos);
    expect(Math.hypot(saucerPos.x - cupPos.x, saucerPos.z - cupPos.z)).toBeGreaterThan(0.25);

    const plate = down.getObjectByName("plate");
    expect(plate).toBeTruthy();
    expect(plate!.userData.part).toBe("plate");
    const platePos = new THREE.Vector3();
    plate!.getWorldPosition(platePos);
    expect(Math.hypot(saucerPos.x - platePos.x, saucerPos.z - platePos.z)).toBeGreaterThan(0.25);

    const knife = down.getObjectByName("knife");
    expect(knife).toBeTruthy();
    expect(knife!.userData.part).toBe("knife");
    const knifePos = new THREE.Vector3();
    knife!.getWorldPosition(knifePos);
    expect(Math.hypot(saucerPos.x - knifePos.x, saucerPos.z - knifePos.z)).toBeGreaterThan(0.25);

    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const forkPos = new THREE.Vector3();
    fork!.getWorldPosition(forkPos);
    expect(Math.hypot(saucerPos.x - forkPos.x, saucerPos.z - forkPos.z)).toBeGreaterThan(0.25);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    expect(spoon!.userData.part).toBe("spoon");
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(saucerPos.x - spoonPos.x, saucerPos.z - spoonPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    expect(napkin!.userData.part).toBe("napkin");
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(saucerPos.x - napkinPos.x, saucerPos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(saucerPos.x - vasePos.x, saucerPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(saucerPos.x - bookPos.x, saucerPos.z - bookPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    saucer.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(SAUCER_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-saucer");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("saucer");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    expect(up.getObjectByName("saucer")).toBeFalsy();
    expect(up.getObjectByName("mug")).toBeFalsy();
    expect(up.getObjectByName("cup")).toBeFalsy();
  });
});

const BOWL_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER bowl", () => {
  it("puts one kraft PAPER bowl on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const bowls = collectKind(down, "interior-bowl");
    expect(bowls.length).toBe(1);
    expect(collectKind(up, "interior-bowl").length).toBe(0);

    const bowl = bowls[0];
    expect(bowl.userData.kind).toBe("interior-bowl");
    expect(bowl.userData.mode).toBe("PAPER");
    expect(bowl.userData.part).toBe("bowl");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const bowlPos = new THREE.Vector3();
    bowl.getWorldPosition(bowlPos);
    expect(Math.hypot(bowlPos.x - tablePos.x, bowlPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(bowlPos.y).toBeGreaterThan(0.9);
    expect(bowlPos.y).toBeLessThan(1.2);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    expect(mug!.userData.part).toBe("mug");
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(bowlPos.x - mugPos.x, bowlPos.z - mugPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-mug").length).toBe(1);

    const saucer = down.getObjectByName("saucer");
    expect(saucer).toBeTruthy();
    expect(saucer!.userData.part).toBe("saucer");
    const saucerPos = new THREE.Vector3();
    saucer!.getWorldPosition(saucerPos);
    expect(Math.hypot(bowlPos.x - saucerPos.x, bowlPos.z - saucerPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-saucer").length).toBe(1);

    const colors: number[] = [];
    bowl.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(BOWL_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-bowl");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("bowl");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    expect(up.getObjectByName("bowl")).toBeFalsy();
    expect(up.getObjectByName("mug")).toBeFalsy();
    expect(up.getObjectByName("saucer")).toBeFalsy();
  });
});

const PITCHER_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER pitcher", () => {
  it("puts one kraft PAPER pitcher on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const pitchers = collectKind(down, "interior-pitcher");
    expect(pitchers.length).toBe(1);
    expect(collectKind(up, "interior-pitcher").length).toBe(0);

    const pitcher = pitchers[0];
    expect(pitcher.userData.kind).toBe("interior-pitcher");
    expect(pitcher.userData.mode).toBe("PAPER");
    expect(pitcher.userData.part).toBe("pitcher");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const pitcherPos = new THREE.Vector3();
    pitcher.getWorldPosition(pitcherPos);
    expect(Math.hypot(pitcherPos.x - tablePos.x, pitcherPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(pitcherPos.y).toBeGreaterThan(0.9);
    expect(pitcherPos.y).toBeLessThan(1.2);

    const bowl = down.getObjectByName("bowl");
    expect(bowl).toBeTruthy();
    expect(bowl!.userData.part).toBe("bowl");
    const bowlPos = new THREE.Vector3();
    bowl!.getWorldPosition(bowlPos);
    expect(Math.hypot(pitcherPos.x - bowlPos.x, pitcherPos.z - bowlPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-bowl").length).toBe(1);

    const saucer = down.getObjectByName("saucer");
    expect(saucer).toBeTruthy();
    expect(saucer!.userData.part).toBe("saucer");
    const saucerPos = new THREE.Vector3();
    saucer!.getWorldPosition(saucerPos);
    expect(Math.hypot(pitcherPos.x - saucerPos.x, pitcherPos.z - saucerPos.z)).toBeGreaterThan(0.25);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    expect(mug!.userData.part).toBe("mug");
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(pitcherPos.x - mugPos.x, pitcherPos.z - mugPos.z)).toBeGreaterThan(0.25);

    const cup = down.getObjectByName("cup");
    expect(cup).toBeTruthy();
    expect(cup!.userData.part).toBe("cup");
    const cupPos = new THREE.Vector3();
    cup!.getWorldPosition(cupPos);
    expect(Math.hypot(pitcherPos.x - cupPos.x, pitcherPos.z - cupPos.z)).toBeGreaterThan(0.25);

    const plate = down.getObjectByName("plate");
    expect(plate).toBeTruthy();
    expect(plate!.userData.part).toBe("plate");
    const platePos = new THREE.Vector3();
    plate!.getWorldPosition(platePos);
    expect(Math.hypot(pitcherPos.x - platePos.x, pitcherPos.z - platePos.z)).toBeGreaterThan(0.25);

    const knife = down.getObjectByName("knife");
    expect(knife).toBeTruthy();
    expect(knife!.userData.part).toBe("knife");
    const knifePos = new THREE.Vector3();
    knife!.getWorldPosition(knifePos);
    expect(Math.hypot(pitcherPos.x - knifePos.x, pitcherPos.z - knifePos.z)).toBeGreaterThan(0.25);

    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const forkPos = new THREE.Vector3();
    fork!.getWorldPosition(forkPos);
    expect(Math.hypot(pitcherPos.x - forkPos.x, pitcherPos.z - forkPos.z)).toBeGreaterThan(0.25);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    expect(spoon!.userData.part).toBe("spoon");
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(pitcherPos.x - spoonPos.x, pitcherPos.z - spoonPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    expect(napkin!.userData.part).toBe("napkin");
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(pitcherPos.x - napkinPos.x, pitcherPos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(pitcherPos.x - vasePos.x, pitcherPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(pitcherPos.x - bookPos.x, pitcherPos.z - bookPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    pitcher.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(PITCHER_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-pitcher");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("pitcher");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    expect(up.getObjectByName("pitcher")).toBeFalsy();
    expect(up.getObjectByName("bowl")).toBeFalsy();
    expect(up.getObjectByName("mug")).toBeFalsy();
    expect(up.getObjectByName("saucer")).toBeFalsy();
  });
});

const TRAY_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER tray", () => {
  it("puts one kraft PAPER tray on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const trays = collectKind(down, "interior-tray");
    expect(trays.length).toBe(1);
    expect(collectKind(up, "interior-tray").length).toBe(0);

    const tray = trays[0];
    expect(tray.userData.kind).toBe("interior-tray");
    expect(tray.userData.mode).toBe("PAPER");
    expect(tray.userData.part).toBe("tray");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const trayPos = new THREE.Vector3();
    tray.getWorldPosition(trayPos);
    expect(Math.hypot(trayPos.x - tablePos.x, trayPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(trayPos.y).toBeGreaterThan(0.9);
    expect(trayPos.y).toBeLessThan(1.2);

    const pitcher = down.getObjectByName("pitcher");
    expect(pitcher).toBeTruthy();
    expect(pitcher!.userData.part).toBe("pitcher");
    const pitcherPos = new THREE.Vector3();
    pitcher!.getWorldPosition(pitcherPos);
    expect(Math.hypot(trayPos.x - pitcherPos.x, trayPos.z - pitcherPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-pitcher").length).toBe(1);

    const bowl = down.getObjectByName("bowl");
    expect(bowl).toBeTruthy();
    expect(bowl!.userData.part).toBe("bowl");
    const bowlPos = new THREE.Vector3();
    bowl!.getWorldPosition(bowlPos);
    expect(Math.hypot(trayPos.x - bowlPos.x, trayPos.z - bowlPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-bowl").length).toBe(1);

    const saucer = down.getObjectByName("saucer");
    expect(saucer).toBeTruthy();
    expect(saucer!.userData.part).toBe("saucer");
    const saucerPos = new THREE.Vector3();
    saucer!.getWorldPosition(saucerPos);
    expect(Math.hypot(trayPos.x - saucerPos.x, trayPos.z - saucerPos.z)).toBeGreaterThan(0.25);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    expect(mug!.userData.part).toBe("mug");
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(trayPos.x - mugPos.x, trayPos.z - mugPos.z)).toBeGreaterThan(0.25);

    const cup = down.getObjectByName("cup");
    expect(cup).toBeTruthy();
    expect(cup!.userData.part).toBe("cup");
    const cupPos = new THREE.Vector3();
    cup!.getWorldPosition(cupPos);
    expect(Math.hypot(trayPos.x - cupPos.x, trayPos.z - cupPos.z)).toBeGreaterThan(0.25);

    const plate = down.getObjectByName("plate");
    expect(plate).toBeTruthy();
    expect(plate!.userData.part).toBe("plate");
    const platePos = new THREE.Vector3();
    plate!.getWorldPosition(platePos);
    expect(Math.hypot(trayPos.x - platePos.x, trayPos.z - platePos.z)).toBeGreaterThan(0.25);

    const knife = down.getObjectByName("knife");
    expect(knife).toBeTruthy();
    expect(knife!.userData.part).toBe("knife");
    const knifePos = new THREE.Vector3();
    knife!.getWorldPosition(knifePos);
    expect(Math.hypot(trayPos.x - knifePos.x, trayPos.z - knifePos.z)).toBeGreaterThan(0.25);

    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const forkPos = new THREE.Vector3();
    fork!.getWorldPosition(forkPos);
    expect(Math.hypot(trayPos.x - forkPos.x, trayPos.z - forkPos.z)).toBeGreaterThan(0.25);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    expect(spoon!.userData.part).toBe("spoon");
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(trayPos.x - spoonPos.x, trayPos.z - spoonPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    expect(napkin!.userData.part).toBe("napkin");
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(trayPos.x - napkinPos.x, trayPos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(trayPos.x - vasePos.x, trayPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(trayPos.x - bookPos.x, trayPos.z - bookPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    tray.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(TRAY_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-tray");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("tray");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    expect(up.getObjectByName("tray")).toBeFalsy();
    expect(up.getObjectByName("pitcher")).toBeFalsy();
    expect(up.getObjectByName("bowl")).toBeFalsy();
    expect(up.getObjectByName("mug")).toBeFalsy();
    expect(up.getObjectByName("saucer")).toBeFalsy();
  });
});

const CROCK_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER crock", () => {
  it("puts one kraft PAPER crock on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const crocks = collectKind(down, "interior-crock");
    expect(crocks.length).toBe(1);
    expect(collectKind(up, "interior-crock").length).toBe(0);

    const crock = crocks[0];
    expect(crock.userData.kind).toBe("interior-crock");
    expect(crock.userData.mode).toBe("PAPER");
    expect(crock.userData.part).toBe("crock");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const crockPos = new THREE.Vector3();
    crock.getWorldPosition(crockPos);
    expect(Math.hypot(crockPos.x - tablePos.x, crockPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(crockPos.y).toBeGreaterThan(0.9);
    expect(crockPos.y).toBeLessThan(1.2);

    const tray = down.getObjectByName("tray");
    expect(tray).toBeTruthy();
    expect(tray!.userData.part).toBe("tray");
    const trayPos = new THREE.Vector3();
    tray!.getWorldPosition(trayPos);
    expect(Math.hypot(crockPos.x - trayPos.x, crockPos.z - trayPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-tray").length).toBe(1);

    const pitcher = down.getObjectByName("pitcher");
    expect(pitcher).toBeTruthy();
    expect(pitcher!.userData.part).toBe("pitcher");
    const pitcherPos = new THREE.Vector3();
    pitcher!.getWorldPosition(pitcherPos);
    expect(Math.hypot(crockPos.x - pitcherPos.x, crockPos.z - pitcherPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-pitcher").length).toBe(1);

    const bowl = down.getObjectByName("bowl");
    expect(bowl).toBeTruthy();
    expect(bowl!.userData.part).toBe("bowl");
    const bowlPos = new THREE.Vector3();
    bowl!.getWorldPosition(bowlPos);
    expect(Math.hypot(crockPos.x - bowlPos.x, crockPos.z - bowlPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-bowl").length).toBe(1);

    const saucer = down.getObjectByName("saucer");
    expect(saucer).toBeTruthy();
    expect(saucer!.userData.part).toBe("saucer");
    const saucerPos = new THREE.Vector3();
    saucer!.getWorldPosition(saucerPos);
    expect(Math.hypot(crockPos.x - saucerPos.x, crockPos.z - saucerPos.z)).toBeGreaterThan(0.25);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    expect(mug!.userData.part).toBe("mug");
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(crockPos.x - mugPos.x, crockPos.z - mugPos.z)).toBeGreaterThan(0.25);

    const cup = down.getObjectByName("cup");
    expect(cup).toBeTruthy();
    expect(cup!.userData.part).toBe("cup");
    const cupPos = new THREE.Vector3();
    cup!.getWorldPosition(cupPos);
    expect(Math.hypot(crockPos.x - cupPos.x, crockPos.z - cupPos.z)).toBeGreaterThan(0.25);

    const plate = down.getObjectByName("plate");
    expect(plate).toBeTruthy();
    expect(plate!.userData.part).toBe("plate");
    const platePos = new THREE.Vector3();
    plate!.getWorldPosition(platePos);
    expect(Math.hypot(crockPos.x - platePos.x, crockPos.z - platePos.z)).toBeGreaterThan(0.25);

    const knife = down.getObjectByName("knife");
    expect(knife).toBeTruthy();
    expect(knife!.userData.part).toBe("knife");
    const knifePos = new THREE.Vector3();
    knife!.getWorldPosition(knifePos);
    expect(Math.hypot(crockPos.x - knifePos.x, crockPos.z - knifePos.z)).toBeGreaterThan(0.25);

    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const forkPos = new THREE.Vector3();
    fork!.getWorldPosition(forkPos);
    expect(Math.hypot(crockPos.x - forkPos.x, crockPos.z - forkPos.z)).toBeGreaterThan(0.25);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    expect(spoon!.userData.part).toBe("spoon");
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(crockPos.x - spoonPos.x, crockPos.z - spoonPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    expect(napkin!.userData.part).toBe("napkin");
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(crockPos.x - napkinPos.x, crockPos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(crockPos.x - vasePos.x, crockPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(crockPos.x - bookPos.x, crockPos.z - bookPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    crock.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(CROCK_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-crock");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("crock");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    expect(up.getObjectByName("crock")).toBeFalsy();
    expect(up.getObjectByName("tray")).toBeFalsy();
    expect(up.getObjectByName("pitcher")).toBeFalsy();
    expect(up.getObjectByName("bowl")).toBeFalsy();
    expect(up.getObjectByName("mug")).toBeFalsy();
    expect(up.getObjectByName("saucer")).toBeFalsy();
  });
});

const TUREEN_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER tureen", () => {
  it("puts one kraft PAPER tureen on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const tureens = collectKind(down, "interior-tureen");
    expect(tureens.length).toBe(1);
    expect(collectKind(up, "interior-tureen").length).toBe(0);

    const tureen = tureens[0];
    expect(tureen.userData.kind).toBe("interior-tureen");
    expect(tureen.userData.mode).toBe("PAPER");
    expect(tureen.userData.part).toBe("tureen");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const tureenPos = new THREE.Vector3();
    tureen.getWorldPosition(tureenPos);
    expect(Math.hypot(tureenPos.x - tablePos.x, tureenPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(tureenPos.y).toBeGreaterThan(0.9);
    expect(tureenPos.y).toBeLessThan(1.2);

    const crock = down.getObjectByName("crock");
    expect(crock).toBeTruthy();
    expect(crock!.userData.part).toBe("crock");
    const crockPos = new THREE.Vector3();
    crock!.getWorldPosition(crockPos);
    expect(Math.hypot(tureenPos.x - crockPos.x, tureenPos.z - crockPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-crock").length).toBe(1);

    const tray = down.getObjectByName("tray");
    expect(tray).toBeTruthy();
    expect(tray!.userData.part).toBe("tray");
    const trayPos = new THREE.Vector3();
    tray!.getWorldPosition(trayPos);
    expect(Math.hypot(tureenPos.x - trayPos.x, tureenPos.z - trayPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-tray").length).toBe(1);

    const pitcher = down.getObjectByName("pitcher");
    expect(pitcher).toBeTruthy();
    expect(pitcher!.userData.part).toBe("pitcher");
    const pitcherPos = new THREE.Vector3();
    pitcher!.getWorldPosition(pitcherPos);
    expect(Math.hypot(tureenPos.x - pitcherPos.x, tureenPos.z - pitcherPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-pitcher").length).toBe(1);

    const bowl = down.getObjectByName("bowl");
    expect(bowl).toBeTruthy();
    expect(bowl!.userData.part).toBe("bowl");
    const bowlPos = new THREE.Vector3();
    bowl!.getWorldPosition(bowlPos);
    expect(Math.hypot(tureenPos.x - bowlPos.x, tureenPos.z - bowlPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-bowl").length).toBe(1);

    const saucer = down.getObjectByName("saucer");
    expect(saucer).toBeTruthy();
    expect(saucer!.userData.part).toBe("saucer");
    const saucerPos = new THREE.Vector3();
    saucer!.getWorldPosition(saucerPos);
    expect(Math.hypot(tureenPos.x - saucerPos.x, tureenPos.z - saucerPos.z)).toBeGreaterThan(0.25);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    expect(mug!.userData.part).toBe("mug");
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(tureenPos.x - mugPos.x, tureenPos.z - mugPos.z)).toBeGreaterThan(0.25);

    const cup = down.getObjectByName("cup");
    expect(cup).toBeTruthy();
    expect(cup!.userData.part).toBe("cup");
    const cupPos = new THREE.Vector3();
    cup!.getWorldPosition(cupPos);
    expect(Math.hypot(tureenPos.x - cupPos.x, tureenPos.z - cupPos.z)).toBeGreaterThan(0.25);

    const plate = down.getObjectByName("plate");
    expect(plate).toBeTruthy();
    expect(plate!.userData.part).toBe("plate");
    const platePos = new THREE.Vector3();
    plate!.getWorldPosition(platePos);
    expect(Math.hypot(tureenPos.x - platePos.x, tureenPos.z - platePos.z)).toBeGreaterThan(0.25);

    const knife = down.getObjectByName("knife");
    expect(knife).toBeTruthy();
    expect(knife!.userData.part).toBe("knife");
    const knifePos = new THREE.Vector3();
    knife!.getWorldPosition(knifePos);
    expect(Math.hypot(tureenPos.x - knifePos.x, tureenPos.z - knifePos.z)).toBeGreaterThan(0.25);

    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const forkPos = new THREE.Vector3();
    fork!.getWorldPosition(forkPos);
    expect(Math.hypot(tureenPos.x - forkPos.x, tureenPos.z - forkPos.z)).toBeGreaterThan(0.25);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    expect(spoon!.userData.part).toBe("spoon");
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(tureenPos.x - spoonPos.x, tureenPos.z - spoonPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    expect(napkin!.userData.part).toBe("napkin");
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(tureenPos.x - napkinPos.x, tureenPos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(tureenPos.x - vasePos.x, tureenPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(tureenPos.x - bookPos.x, tureenPos.z - bookPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    tureen.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(TUREEN_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-tureen");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("tureen");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    expect(up.getObjectByName("tureen")).toBeFalsy();
    expect(up.getObjectByName("crock")).toBeFalsy();
    expect(up.getObjectByName("tray")).toBeFalsy();
    expect(up.getObjectByName("pitcher")).toBeFalsy();
    expect(up.getObjectByName("bowl")).toBeFalsy();
    expect(up.getObjectByName("mug")).toBeFalsy();
    expect(up.getObjectByName("saucer")).toBeFalsy();
  });
});

const PLATTER_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER platter", () => {
  it("puts one kraft PAPER platter on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const platters = collectKind(down, "interior-platter");
    expect(platters.length).toBe(1);
    expect(collectKind(up, "interior-platter").length).toBe(0);

    const platter = platters[0];
    expect(platter.userData.kind).toBe("interior-platter");
    expect(platter.userData.mode).toBe("PAPER");
    expect(platter.userData.part).toBe("platter");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const platterPos = new THREE.Vector3();
    platter.getWorldPosition(platterPos);
    expect(Math.hypot(platterPos.x - tablePos.x, platterPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(platterPos.y).toBeGreaterThan(0.9);
    expect(platterPos.y).toBeLessThan(1.2);

    const tureen = down.getObjectByName("tureen");
    expect(tureen).toBeTruthy();
    expect(tureen!.userData.part).toBe("tureen");
    const tureenPos = new THREE.Vector3();
    tureen!.getWorldPosition(tureenPos);
    expect(Math.hypot(platterPos.x - tureenPos.x, platterPos.z - tureenPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-tureen").length).toBe(1);

    const crock = down.getObjectByName("crock");
    expect(crock).toBeTruthy();
    expect(crock!.userData.part).toBe("crock");
    const crockPos = new THREE.Vector3();
    crock!.getWorldPosition(crockPos);
    expect(Math.hypot(platterPos.x - crockPos.x, platterPos.z - crockPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-crock").length).toBe(1);

    const tray = down.getObjectByName("tray");
    expect(tray).toBeTruthy();
    expect(tray!.userData.part).toBe("tray");
    const trayPos = new THREE.Vector3();
    tray!.getWorldPosition(trayPos);
    expect(Math.hypot(platterPos.x - trayPos.x, platterPos.z - trayPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-tray").length).toBe(1);

    const pitcher = down.getObjectByName("pitcher");
    expect(pitcher).toBeTruthy();
    expect(pitcher!.userData.part).toBe("pitcher");
    const pitcherPos = new THREE.Vector3();
    pitcher!.getWorldPosition(pitcherPos);
    expect(Math.hypot(platterPos.x - pitcherPos.x, platterPos.z - pitcherPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-pitcher").length).toBe(1);

    const bowl = down.getObjectByName("bowl");
    expect(bowl).toBeTruthy();
    expect(bowl!.userData.part).toBe("bowl");
    const bowlPos = new THREE.Vector3();
    bowl!.getWorldPosition(bowlPos);
    expect(Math.hypot(platterPos.x - bowlPos.x, platterPos.z - bowlPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-bowl").length).toBe(1);

    const saucer = down.getObjectByName("saucer");
    expect(saucer).toBeTruthy();
    expect(saucer!.userData.part).toBe("saucer");
    const saucerPos = new THREE.Vector3();
    saucer!.getWorldPosition(saucerPos);
    expect(Math.hypot(platterPos.x - saucerPos.x, platterPos.z - saucerPos.z)).toBeGreaterThan(0.25);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    expect(mug!.userData.part).toBe("mug");
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(platterPos.x - mugPos.x, platterPos.z - mugPos.z)).toBeGreaterThan(0.25);

    const cup = down.getObjectByName("cup");
    expect(cup).toBeTruthy();
    expect(cup!.userData.part).toBe("cup");
    const cupPos = new THREE.Vector3();
    cup!.getWorldPosition(cupPos);
    expect(Math.hypot(platterPos.x - cupPos.x, platterPos.z - cupPos.z)).toBeGreaterThan(0.25);

    const plate = down.getObjectByName("plate");
    expect(plate).toBeTruthy();
    expect(plate!.userData.part).toBe("plate");
    const platePos = new THREE.Vector3();
    plate!.getWorldPosition(platePos);
    expect(Math.hypot(platterPos.x - platePos.x, platterPos.z - platePos.z)).toBeGreaterThan(0.25);

    const knife = down.getObjectByName("knife");
    expect(knife).toBeTruthy();
    expect(knife!.userData.part).toBe("knife");
    const knifePos = new THREE.Vector3();
    knife!.getWorldPosition(knifePos);
    expect(Math.hypot(platterPos.x - knifePos.x, platterPos.z - knifePos.z)).toBeGreaterThan(0.25);

    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const forkPos = new THREE.Vector3();
    fork!.getWorldPosition(forkPos);
    expect(Math.hypot(platterPos.x - forkPos.x, platterPos.z - forkPos.z)).toBeGreaterThan(0.25);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    expect(spoon!.userData.part).toBe("spoon");
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(platterPos.x - spoonPos.x, platterPos.z - spoonPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    expect(napkin!.userData.part).toBe("napkin");
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(platterPos.x - napkinPos.x, platterPos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(platterPos.x - vasePos.x, platterPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(platterPos.x - bookPos.x, platterPos.z - bookPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    platter.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(PLATTER_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-platter");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("platter");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    expect(up.getObjectByName("platter")).toBeFalsy();
    expect(up.getObjectByName("tureen")).toBeFalsy();
    expect(up.getObjectByName("crock")).toBeFalsy();
    expect(up.getObjectByName("tray")).toBeFalsy();
    expect(up.getObjectByName("pitcher")).toBeFalsy();
    expect(up.getObjectByName("bowl")).toBeFalsy();
    expect(up.getObjectByName("mug")).toBeFalsy();
    expect(up.getObjectByName("saucer")).toBeFalsy();
  });
});

const CRUET_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER cruet", () => {
  it("puts one kraft PAPER cruet on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const cruets = collectKind(down, "interior-cruet");
    expect(cruets.length).toBe(1);
    expect(collectKind(up, "interior-cruet").length).toBe(0);

    const cruet = cruets[0];
    expect(cruet.userData.kind).toBe("interior-cruet");
    expect(cruet.userData.mode).toBe("PAPER");
    expect(cruet.userData.part).toBe("cruet");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const cruetPos = new THREE.Vector3();
    cruet.getWorldPosition(cruetPos);
    expect(Math.hypot(cruetPos.x - tablePos.x, cruetPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(cruetPos.y).toBeGreaterThan(0.9);
    expect(cruetPos.y).toBeLessThan(1.2);

    const platter = down.getObjectByName("platter");
    expect(platter).toBeTruthy();
    expect(platter!.userData.part).toBe("platter");
    const platterPos = new THREE.Vector3();
    platter!.getWorldPosition(platterPos);
    expect(Math.hypot(cruetPos.x - platterPos.x, cruetPos.z - platterPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-platter").length).toBe(1);

    const tureen = down.getObjectByName("tureen");
    expect(tureen).toBeTruthy();
    expect(tureen!.userData.part).toBe("tureen");
    const tureenPos = new THREE.Vector3();
    tureen!.getWorldPosition(tureenPos);
    expect(Math.hypot(cruetPos.x - tureenPos.x, cruetPos.z - tureenPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-tureen").length).toBe(1);

    const crock = down.getObjectByName("crock");
    expect(crock).toBeTruthy();
    expect(crock!.userData.part).toBe("crock");
    const crockPos = new THREE.Vector3();
    crock!.getWorldPosition(crockPos);
    expect(Math.hypot(cruetPos.x - crockPos.x, cruetPos.z - crockPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-crock").length).toBe(1);

    const tray = down.getObjectByName("tray");
    expect(tray).toBeTruthy();
    expect(tray!.userData.part).toBe("tray");
    const trayPos = new THREE.Vector3();
    tray!.getWorldPosition(trayPos);
    expect(Math.hypot(cruetPos.x - trayPos.x, cruetPos.z - trayPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-tray").length).toBe(1);

    const pitcher = down.getObjectByName("pitcher");
    expect(pitcher).toBeTruthy();
    expect(pitcher!.userData.part).toBe("pitcher");
    const pitcherPos = new THREE.Vector3();
    pitcher!.getWorldPosition(pitcherPos);
    expect(Math.hypot(cruetPos.x - pitcherPos.x, cruetPos.z - pitcherPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-pitcher").length).toBe(1);

    const bowl = down.getObjectByName("bowl");
    expect(bowl).toBeTruthy();
    expect(bowl!.userData.part).toBe("bowl");
    const bowlPos = new THREE.Vector3();
    bowl!.getWorldPosition(bowlPos);
    expect(Math.hypot(cruetPos.x - bowlPos.x, cruetPos.z - bowlPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-bowl").length).toBe(1);

    const saucer = down.getObjectByName("saucer");
    expect(saucer).toBeTruthy();
    expect(saucer!.userData.part).toBe("saucer");
    const saucerPos = new THREE.Vector3();
    saucer!.getWorldPosition(saucerPos);
    expect(Math.hypot(cruetPos.x - saucerPos.x, cruetPos.z - saucerPos.z)).toBeGreaterThan(0.25);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    expect(mug!.userData.part).toBe("mug");
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(cruetPos.x - mugPos.x, cruetPos.z - mugPos.z)).toBeGreaterThan(0.25);

    const cup = down.getObjectByName("cup");
    expect(cup).toBeTruthy();
    expect(cup!.userData.part).toBe("cup");
    const cupPos = new THREE.Vector3();
    cup!.getWorldPosition(cupPos);
    expect(Math.hypot(cruetPos.x - cupPos.x, cruetPos.z - cupPos.z)).toBeGreaterThan(0.25);

    const plate = down.getObjectByName("plate");
    expect(plate).toBeTruthy();
    expect(plate!.userData.part).toBe("plate");
    const platePos = new THREE.Vector3();
    plate!.getWorldPosition(platePos);
    expect(Math.hypot(cruetPos.x - platePos.x, cruetPos.z - platePos.z)).toBeGreaterThan(0.25);

    const knife = down.getObjectByName("knife");
    expect(knife).toBeTruthy();
    expect(knife!.userData.part).toBe("knife");
    const knifePos = new THREE.Vector3();
    knife!.getWorldPosition(knifePos);
    expect(Math.hypot(cruetPos.x - knifePos.x, cruetPos.z - knifePos.z)).toBeGreaterThan(0.25);

    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const forkPos = new THREE.Vector3();
    fork!.getWorldPosition(forkPos);
    expect(Math.hypot(cruetPos.x - forkPos.x, cruetPos.z - forkPos.z)).toBeGreaterThan(0.25);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    expect(spoon!.userData.part).toBe("spoon");
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(cruetPos.x - spoonPos.x, cruetPos.z - spoonPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    expect(napkin!.userData.part).toBe("napkin");
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(cruetPos.x - napkinPos.x, cruetPos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(cruetPos.x - vasePos.x, cruetPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(cruetPos.x - bookPos.x, cruetPos.z - bookPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    cruet.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(CRUET_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-cruet");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("cruet");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    expect(up.getObjectByName("cruet")).toBeFalsy();
    expect(up.getObjectByName("platter")).toBeFalsy();
    expect(up.getObjectByName("tureen")).toBeFalsy();
    expect(up.getObjectByName("crock")).toBeFalsy();
    expect(up.getObjectByName("tray")).toBeFalsy();
    expect(up.getObjectByName("pitcher")).toBeFalsy();
    expect(up.getObjectByName("bowl")).toBeFalsy();
    expect(up.getObjectByName("mug")).toBeFalsy();
    expect(up.getObjectByName("saucer")).toBeFalsy();
  });
});

const GOBLET_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER goblet", () => {
  it("puts one kraft PAPER goblet on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const goblets = collectKind(down, "interior-goblet");
    expect(goblets.length).toBe(1);
    expect(collectKind(up, "interior-goblet").length).toBe(0);

    const goblet = goblets[0];
    expect(goblet.userData.kind).toBe("interior-goblet");
    expect(goblet.userData.mode).toBe("PAPER");
    expect(goblet.userData.part).toBe("goblet");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const gobletPos = new THREE.Vector3();
    goblet.getWorldPosition(gobletPos);
    expect(Math.hypot(gobletPos.x - tablePos.x, gobletPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(gobletPos.y).toBeGreaterThan(0.9);
    expect(gobletPos.y).toBeLessThan(1.2);

    const cruet = down.getObjectByName("cruet");
    expect(cruet).toBeTruthy();
    expect(cruet!.userData.part).toBe("cruet");
    const cruetPos = new THREE.Vector3();
    cruet!.getWorldPosition(cruetPos);
    expect(Math.hypot(gobletPos.x - cruetPos.x, gobletPos.z - cruetPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-cruet").length).toBe(1);

    const platter = down.getObjectByName("platter");
    expect(platter).toBeTruthy();
    expect(platter!.userData.part).toBe("platter");
    const platterPos = new THREE.Vector3();
    platter!.getWorldPosition(platterPos);
    expect(Math.hypot(gobletPos.x - platterPos.x, gobletPos.z - platterPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-platter").length).toBe(1);

    const tureen = down.getObjectByName("tureen");
    expect(tureen).toBeTruthy();
    expect(tureen!.userData.part).toBe("tureen");
    const tureenPos = new THREE.Vector3();
    tureen!.getWorldPosition(tureenPos);
    expect(Math.hypot(gobletPos.x - tureenPos.x, gobletPos.z - tureenPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-tureen").length).toBe(1);

    const crock = down.getObjectByName("crock");
    expect(crock).toBeTruthy();
    expect(crock!.userData.part).toBe("crock");
    const crockPos = new THREE.Vector3();
    crock!.getWorldPosition(crockPos);
    expect(Math.hypot(gobletPos.x - crockPos.x, gobletPos.z - crockPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-crock").length).toBe(1);

    const tray = down.getObjectByName("tray");
    expect(tray).toBeTruthy();
    expect(tray!.userData.part).toBe("tray");
    const trayPos = new THREE.Vector3();
    tray!.getWorldPosition(trayPos);
    expect(Math.hypot(gobletPos.x - trayPos.x, gobletPos.z - trayPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-tray").length).toBe(1);

    const pitcher = down.getObjectByName("pitcher");
    expect(pitcher).toBeTruthy();
    expect(pitcher!.userData.part).toBe("pitcher");
    const pitcherPos = new THREE.Vector3();
    pitcher!.getWorldPosition(pitcherPos);
    expect(Math.hypot(gobletPos.x - pitcherPos.x, gobletPos.z - pitcherPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-pitcher").length).toBe(1);

    const bowl = down.getObjectByName("bowl");
    expect(bowl).toBeTruthy();
    expect(bowl!.userData.part).toBe("bowl");
    const bowlPos = new THREE.Vector3();
    bowl!.getWorldPosition(bowlPos);
    expect(Math.hypot(gobletPos.x - bowlPos.x, gobletPos.z - bowlPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-bowl").length).toBe(1);

    const saucer = down.getObjectByName("saucer");
    expect(saucer).toBeTruthy();
    expect(saucer!.userData.part).toBe("saucer");
    const saucerPos = new THREE.Vector3();
    saucer!.getWorldPosition(saucerPos);
    expect(Math.hypot(gobletPos.x - saucerPos.x, gobletPos.z - saucerPos.z)).toBeGreaterThan(0.25);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    expect(mug!.userData.part).toBe("mug");
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(gobletPos.x - mugPos.x, gobletPos.z - mugPos.z)).toBeGreaterThan(0.25);

    const cup = down.getObjectByName("cup");
    expect(cup).toBeTruthy();
    expect(cup!.userData.part).toBe("cup");
    const cupPos = new THREE.Vector3();
    cup!.getWorldPosition(cupPos);
    expect(Math.hypot(gobletPos.x - cupPos.x, gobletPos.z - cupPos.z)).toBeGreaterThan(0.25);

    const plate = down.getObjectByName("plate");
    expect(plate).toBeTruthy();
    expect(plate!.userData.part).toBe("plate");
    const platePos = new THREE.Vector3();
    plate!.getWorldPosition(platePos);
    expect(Math.hypot(gobletPos.x - platePos.x, gobletPos.z - platePos.z)).toBeGreaterThan(0.25);

    const knife = down.getObjectByName("knife");
    expect(knife).toBeTruthy();
    expect(knife!.userData.part).toBe("knife");
    const knifePos = new THREE.Vector3();
    knife!.getWorldPosition(knifePos);
    expect(Math.hypot(gobletPos.x - knifePos.x, gobletPos.z - knifePos.z)).toBeGreaterThan(0.25);

    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const forkPos = new THREE.Vector3();
    fork!.getWorldPosition(forkPos);
    expect(Math.hypot(gobletPos.x - forkPos.x, gobletPos.z - forkPos.z)).toBeGreaterThan(0.25);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    expect(spoon!.userData.part).toBe("spoon");
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(gobletPos.x - spoonPos.x, gobletPos.z - spoonPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    expect(napkin!.userData.part).toBe("napkin");
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(gobletPos.x - napkinPos.x, gobletPos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(gobletPos.x - vasePos.x, gobletPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(gobletPos.x - bookPos.x, gobletPos.z - bookPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    goblet.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(GOBLET_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-goblet");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("goblet");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    expect(up.getObjectByName("goblet")).toBeFalsy();
    expect(up.getObjectByName("cruet")).toBeFalsy();
    expect(up.getObjectByName("platter")).toBeFalsy();
    expect(up.getObjectByName("tureen")).toBeFalsy();
    expect(up.getObjectByName("crock")).toBeFalsy();
    expect(up.getObjectByName("tray")).toBeFalsy();
    expect(up.getObjectByName("pitcher")).toBeFalsy();
    expect(up.getObjectByName("bowl")).toBeFalsy();
    expect(up.getObjectByName("mug")).toBeFalsy();
    expect(up.getObjectByName("saucer")).toBeFalsy();
  });
});

const DECANTER_HEX = new Set([0x5a3a22, 0xf4ead8, 0xf7f1e6]);

describe("house PAPER decanter", () => {
  it("puts one kraft PAPER decanter on the downstairs table, not upstairs", () => {
    const g = makeInteriorScene();
    const down = g.getObjectByName("downstairs")!;
    const up = g.getObjectByName("upstairs")!;
    const table = down.getObjectByName("table")!;
    expect(table).toBeTruthy();

    const decanters = collectKind(down, "interior-decanter");
    expect(decanters.length).toBe(1);
    expect(collectKind(up, "interior-decanter").length).toBe(0);

    const decanter = decanters[0];
    expect(decanter.userData.kind).toBe("interior-decanter");
    expect(decanter.userData.mode).toBe("PAPER");
    expect(decanter.userData.part).toBe("decanter");

    const tablePos = new THREE.Vector3();
    table.getWorldPosition(tablePos);
    const decanterPos = new THREE.Vector3();
    decanter.getWorldPosition(decanterPos);
    expect(Math.hypot(decanterPos.x - tablePos.x, decanterPos.z - tablePos.z)).toBeLessThan(0.85);
    expect(decanterPos.y).toBeGreaterThan(0.9);
    expect(decanterPos.y).toBeLessThan(1.2);

    const goblet = down.getObjectByName("goblet");
    expect(goblet).toBeTruthy();
    expect(goblet!.userData.part).toBe("goblet");
    const gobletPos = new THREE.Vector3();
    goblet!.getWorldPosition(gobletPos);
    expect(Math.hypot(decanterPos.x - gobletPos.x, decanterPos.z - gobletPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-goblet").length).toBe(1);

    const cruet = down.getObjectByName("cruet");
    expect(cruet).toBeTruthy();
    expect(cruet!.userData.part).toBe("cruet");
    const cruetPos = new THREE.Vector3();
    cruet!.getWorldPosition(cruetPos);
    expect(Math.hypot(decanterPos.x - cruetPos.x, decanterPos.z - cruetPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-cruet").length).toBe(1);

    const platter = down.getObjectByName("platter");
    expect(platter).toBeTruthy();
    expect(platter!.userData.part).toBe("platter");
    const platterPos = new THREE.Vector3();
    platter!.getWorldPosition(platterPos);
    expect(Math.hypot(decanterPos.x - platterPos.x, decanterPos.z - platterPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-platter").length).toBe(1);

    const tureen = down.getObjectByName("tureen");
    expect(tureen).toBeTruthy();
    expect(tureen!.userData.part).toBe("tureen");
    const tureenPos = new THREE.Vector3();
    tureen!.getWorldPosition(tureenPos);
    expect(Math.hypot(decanterPos.x - tureenPos.x, decanterPos.z - tureenPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-tureen").length).toBe(1);

    const crock = down.getObjectByName("crock");
    expect(crock).toBeTruthy();
    expect(crock!.userData.part).toBe("crock");
    const crockPos = new THREE.Vector3();
    crock!.getWorldPosition(crockPos);
    expect(Math.hypot(decanterPos.x - crockPos.x, decanterPos.z - crockPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-crock").length).toBe(1);

    const tray = down.getObjectByName("tray");
    expect(tray).toBeTruthy();
    expect(tray!.userData.part).toBe("tray");
    const trayPos = new THREE.Vector3();
    tray!.getWorldPosition(trayPos);
    expect(Math.hypot(decanterPos.x - trayPos.x, decanterPos.z - trayPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-tray").length).toBe(1);

    const pitcher = down.getObjectByName("pitcher");
    expect(pitcher).toBeTruthy();
    expect(pitcher!.userData.part).toBe("pitcher");
    const pitcherPos = new THREE.Vector3();
    pitcher!.getWorldPosition(pitcherPos);
    expect(Math.hypot(decanterPos.x - pitcherPos.x, decanterPos.z - pitcherPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-pitcher").length).toBe(1);

    const bowl = down.getObjectByName("bowl");
    expect(bowl).toBeTruthy();
    expect(bowl!.userData.part).toBe("bowl");
    const bowlPos = new THREE.Vector3();
    bowl!.getWorldPosition(bowlPos);
    expect(Math.hypot(decanterPos.x - bowlPos.x, decanterPos.z - bowlPos.z)).toBeGreaterThan(0.25);
    expect(collectKind(down, "interior-bowl").length).toBe(1);

    const saucer = down.getObjectByName("saucer");
    expect(saucer).toBeTruthy();
    expect(saucer!.userData.part).toBe("saucer");
    const saucerPos = new THREE.Vector3();
    saucer!.getWorldPosition(saucerPos);
    expect(Math.hypot(decanterPos.x - saucerPos.x, decanterPos.z - saucerPos.z)).toBeGreaterThan(0.25);

    const mug = down.getObjectByName("mug");
    expect(mug).toBeTruthy();
    expect(mug!.userData.part).toBe("mug");
    const mugPos = new THREE.Vector3();
    mug!.getWorldPosition(mugPos);
    expect(Math.hypot(decanterPos.x - mugPos.x, decanterPos.z - mugPos.z)).toBeGreaterThan(0.25);

    const cup = down.getObjectByName("cup");
    expect(cup).toBeTruthy();
    expect(cup!.userData.part).toBe("cup");
    const cupPos = new THREE.Vector3();
    cup!.getWorldPosition(cupPos);
    expect(Math.hypot(decanterPos.x - cupPos.x, decanterPos.z - cupPos.z)).toBeGreaterThan(0.25);

    const plate = down.getObjectByName("plate");
    expect(plate).toBeTruthy();
    expect(plate!.userData.part).toBe("plate");
    const platePos = new THREE.Vector3();
    plate!.getWorldPosition(platePos);
    expect(Math.hypot(decanterPos.x - platePos.x, decanterPos.z - platePos.z)).toBeGreaterThan(0.25);

    const knife = down.getObjectByName("knife");
    expect(knife).toBeTruthy();
    expect(knife!.userData.part).toBe("knife");
    const knifePos = new THREE.Vector3();
    knife!.getWorldPosition(knifePos);
    expect(Math.hypot(decanterPos.x - knifePos.x, decanterPos.z - knifePos.z)).toBeGreaterThan(0.25);

    const fork = down.getObjectByName("fork");
    expect(fork).toBeTruthy();
    expect(fork!.userData.part).toBe("fork");
    const forkPos = new THREE.Vector3();
    fork!.getWorldPosition(forkPos);
    expect(Math.hypot(decanterPos.x - forkPos.x, decanterPos.z - forkPos.z)).toBeGreaterThan(0.25);

    const spoon = down.getObjectByName("spoon");
    expect(spoon).toBeTruthy();
    expect(spoon!.userData.part).toBe("spoon");
    const spoonPos = new THREE.Vector3();
    spoon!.getWorldPosition(spoonPos);
    expect(Math.hypot(decanterPos.x - spoonPos.x, decanterPos.z - spoonPos.z)).toBeGreaterThan(0.25);

    const napkin = down.getObjectByName("napkin");
    expect(napkin).toBeTruthy();
    expect(napkin!.userData.part).toBe("napkin");
    const napkinPos = new THREE.Vector3();
    napkin!.getWorldPosition(napkinPos);
    expect(Math.hypot(decanterPos.x - napkinPos.x, decanterPos.z - napkinPos.z)).toBeGreaterThan(0.25);

    const vase = down.getObjectByName("vase");
    expect(vase).toBeTruthy();
    const vasePos = new THREE.Vector3();
    vase!.getWorldPosition(vasePos);
    expect(Math.hypot(decanterPos.x - vasePos.x, decanterPos.z - vasePos.z)).toBeGreaterThan(0.25);

    const book = down.getObjectByName("book");
    expect(book).toBeTruthy();
    const bookPos = new THREE.Vector3();
    book!.getWorldPosition(bookPos);
    expect(Math.hypot(decanterPos.x - bookPos.x, decanterPos.z - bookPos.z)).toBeGreaterThan(0.25);

    const colors: number[] = [];
    decanter.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mesh.isMesh && mat?.color) {
        const hex = mat.color.getHex();
        colors.push(hex);
        expect(DECANTER_HEX.has(hex)).toBe(true);
        if (hex !== 0xf7f1e6) expect(isGrey(hex)).toBe(false);
        expect(mesh.geometry.type).toBe("BoxGeometry");
        expect(mesh.userData.kind).toBe("interior-decanter");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.userData.part).toBe("decanter");
      }
    });
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.some((c) => c === 0x5a3a22)).toBe(true);
    expect(colors.some((c) => c === 0xf4ead8)).toBe(true);
    expect(colors.some((c) => c === 0xf7f1e6)).toBe(true);

    expect(up.getObjectByName("decanter")).toBeFalsy();
    expect(up.getObjectByName("goblet")).toBeFalsy();
    expect(up.getObjectByName("cruet")).toBeFalsy();
    expect(up.getObjectByName("platter")).toBeFalsy();
    expect(up.getObjectByName("tureen")).toBeFalsy();
    expect(up.getObjectByName("crock")).toBeFalsy();
    expect(up.getObjectByName("tray")).toBeFalsy();
    expect(up.getObjectByName("pitcher")).toBeFalsy();
    expect(up.getObjectByName("bowl")).toBeFalsy();
    expect(up.getObjectByName("mug")).toBeFalsy();
    expect(up.getObjectByName("saucer")).toBeFalsy();
  });
});

