import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { distToPaved, heightAt, ISLANDS, ROAD_CLEAR } from "./land.ts";
import {
  FENDER_SPOTS,
  makeQuay,
  PIER_PALM_OFFSETS,
  QUAY_DECK_SPOTS,
  QUAY_LAND_SPOTS,
  quayWorldPoint,
} from "../public/harbour/quay.js";

function collectDress(root: THREE.Object3D, kind: string) {
  const out: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.dress === kind) out.push(obj);
  });
  return out;
}

function hexes(root: THREE.Object3D) {
  const colors: number[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.MeshLambertMaterial | THREE.MeshLambertMaterial[] | undefined;
    if (!mat) return;
    if (Array.isArray(mat)) {
      for (const m of mat) if (m.color) colors.push(m.color.getHex());
    } else if (mat.color) colors.push(mat.color.getHex());
  });
  return colors;
}

function isGrey(hex: number) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

describe("quay harbour dressing", () => {
  it("clusters 8–12 extra palms near the pier and keeps land kit off the paved road", () => {
    expect(PIER_PALM_OFFSETS.length).toBeGreaterThanOrEqual(8);
    expect(PIER_PALM_OFFSETS.length).toBeLessThanOrEqual(12);
    expect(QUAY_LAND_SPOTS.some((s) => s.kind === "lean-to")).toBe(true);

    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      for (const spot of [...PIER_PALM_OFFSETS, ...QUAY_LAND_SPOTS]) {
        expect(Math.abs(spot.x)).toBeGreaterThanOrEqual(ROAD_CLEAR);
        expect(Math.abs(spot.x)).toBeLessThan(16);
        expect(Math.hypot(spot.x, spot.along)).toBeLessThan(45);
        const at = quayWorldPoint(spec, spot.x, spot.along);
        expect(distToPaved(spec, at.x, at.z)).toBeGreaterThanOrEqual(ROAD_CLEAR);
        expect(heightAt(spec, at.x, at.z)).toBeGreaterThanOrEqual(0.35);
      }
    }
  });

  it("plants the extra kit on the north quay in wood, canvas, rust, and plaster", () => {
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeQuay(ISLANDS.north, { scene, heightAt });
    expect(added).toEqual([root]);
    expect(collectDress(root, "palm").length).toBe(PIER_PALM_OFFSETS.length);
    expect(collectDress(root, "lean-to").length).toBe(1);
    expect(collectDress(root, "crate").length).toBeGreaterThanOrEqual(6);
    expect(collectDress(root, "bollard").length).toBeGreaterThanOrEqual(12);
    expect(collectDress(root, "rope-box").length).toBeGreaterThanOrEqual(2);
    expect(collectDress(root, "rope").length).toBeGreaterThanOrEqual(2);
    const colors = hexes(root);
    expect(colors.some(isGrey)).toBe(true);
    expect(colors.every(isGrey)).toBe(false);
    expect(colors).toContain(0xe4d2b0);
    expect(colors).toContain(0xc4b496);
    expect(colors).toContain(0x6e2e22);
    expect(colors).toContain(0x8a6238);
  });

  it("puts 1–2 extra kraft coils on each timber deck, off the walk and berth", () => {
    expect(QUAY_DECK_SPOTS.length).toBeGreaterThanOrEqual(1);
    expect(QUAY_DECK_SPOTS.length).toBeLessThanOrEqual(2);

    for (const spot of QUAY_DECK_SPOTS) {
      expect(Math.abs(spot.x)).toBeGreaterThanOrEqual(2.2);
      expect(Math.abs(spot.x)).toBeLessThan(5.5);
      expect(Math.abs(spot.along)).toBeLessThan(36);
    }

    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      const toward = id === "north" ? 1 : -1;
      const pierZ = spec.port.z + toward * 38;
      const added: THREE.Object3D[] = [];
      const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
      const root = makeQuay(spec, { scene, heightAt });
      const ropes = collectDress(root, "rope");
      expect(ropes.length).toBeGreaterThanOrEqual(2 + QUAY_DECK_SPOTS.length);
      for (const spot of QUAY_DECK_SPOTS) {
        const hit = ropes.some((r) => {
          const dx = Math.abs(r.position.x - (spec.port.x + spot.x));
          const dz = Math.abs(r.position.z - (pierZ + toward * spot.along));
          return dx < 0.05 && dz < 0.05;
        });
        expect(hit).toBe(true);
      }
      expect(hexes(root)).toContain(0xc4a06a);
    }
  });

  it("hangs rubber tyre fenders off the seaward timber face, original bollard greys", () => {
    expect(FENDER_SPOTS.length).toBeGreaterThanOrEqual(4);
    for (const spot of FENDER_SPOTS) {
      expect(Math.abs(spot.x)).toBeLessThan(5.5);
      expect(spot.along).toBeGreaterThan(42);
      expect(spot.along).toBeLessThan(44);
    }

    const knownGrey = new Set([0x2a2d32, 0x3a3d44]);
    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      const toward = id === "north" ? 1 : -1;
      const pierZ = spec.port.z + toward * 38;
      const added: THREE.Object3D[] = [];
      const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
      const root = makeQuay(spec, { scene, heightAt });
      const fenders = collectDress(root, "fender");
      expect(fenders.length).toBeGreaterThanOrEqual(4);
      expect(fenders.every((f) => f.userData.dress === "fender")).toBe(true);

      const colors = fenders.flatMap((f) => hexes(f));
      expect(colors).toContain(0x2a2d32);
      expect(colors).toContain(0x3a3d44);
      for (const hex of colors) {
        if (isGrey(hex)) expect(knownGrey.has(hex)).toBe(true);
      }

      for (const spot of FENDER_SPOTS) {
        const hit = fenders.some((f) => {
          const dx = Math.abs(f.position.x - (spec.port.x + spot.x));
          const dz = Math.abs(f.position.z - (pierZ + toward * spot.along));
          return dx < 0.05 && dz < 0.05;
        });
        expect(hit).toBe(true);
      }
    }
  });

  it("ties a kraft painter rope off each dinghy bow", () => {
    function collectPainter(root: THREE.Object3D) {
      const out: THREE.Object3D[] = [];
      root.traverse((obj) => {
        if (obj.userData?.dress === "painter" || obj.userData?.part === "painter") {
          out.push(obj);
        }
      });
      return out;
    }

    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      const toward = id === "north" ? 1 : -1;
      const added: THREE.Object3D[] = [];
      const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
      const root = makeQuay(spec, { scene, heightAt });

      const painters = collectPainter(root);
      expect(painters.length).toBeGreaterThanOrEqual(2);
      for (const p of painters) {
        expect(p.userData.dress === "painter" || p.userData.part === "painter").toBe(true);
        const mesh = p as THREE.Mesh;
        expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
        const mat = mesh.material as THREE.MeshLambertMaterial;
        expect(mat.color.getHex()).toBe(0xc4a06a);
      }

      const dinghySpots = [
        { x: spec.port.x + 3.2, y: 1.55, z: spec.port.z + toward * 102 },
        { x: spec.port.x - 3.8, y: 1.48, z: spec.port.z + toward * 97 },
      ];
      for (const spot of dinghySpots) {
        const boat = root.children.find((c) => {
          return (
            Math.abs(c.position.x - spot.x) < 0.01 &&
            Math.abs(c.position.y - spot.y) < 0.01 &&
            Math.abs(c.position.z - spot.z) < 0.01
          );
        });
        expect(boat).toBeTruthy();
        expect(collectPainter(boat!).length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("puts a tiny kraft PAPER cap on each quay bollard, crates and painter remain", () => {
    function collectPart(root: THREE.Object3D, name: string) {
      const out: THREE.Object3D[] = [];
      root.traverse((obj) => {
        if (obj.userData?.part === name) out.push(obj);
      });
      return out;
    }

    function collectPainter(root: THREE.Object3D) {
      const out: THREE.Object3D[] = [];
      root.traverse((obj) => {
        if (obj.userData?.dress === "painter" || obj.userData?.part === "painter") {
          out.push(obj);
        }
      });
      return out;
    }

    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      const added: THREE.Object3D[] = [];
      const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
      const root = makeQuay(spec, { scene, heightAt });

      const bollards = collectDress(root, "bollard");
      expect(bollards.length).toBeGreaterThanOrEqual(12);
      expect(collectDress(root, "crate").length).toBeGreaterThanOrEqual(6);
      expect(collectPainter(root).length).toBeGreaterThanOrEqual(2);

      const caps = [
        ...collectPart(root, "bollard-cap"),
        ...collectPart(root, "cap").filter((c) => {
          let p: THREE.Object3D | null = c.parent;
          while (p) {
            if (p.userData?.dress === "bollard") return true;
            p = p.parent;
          }
          return false;
        }),
      ];
      const unique = [...new Set(caps)];
      expect(unique.length).toBe(bollards.length);

      for (const bollard of bollards) {
        const onPost = unique.filter((c) => {
          let p: THREE.Object3D | null = c.parent;
          while (p) {
            if (p === bollard) return true;
            p = p.parent;
          }
          return false;
        });
        expect(onPost.length).toBe(1);
        const mesh = onPost[0] as THREE.Mesh;
        expect(mesh.userData.part === "bollard-cap" || mesh.userData.part === "cap").toBe(true);
        expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
        const mat = mesh.material as THREE.MeshLambertMaterial;
        const hex = mat.color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(hex).toBe(0x8a6238);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.4);
        expect(height).toBeLessThan(0.16);
        expect(depth).toBeLessThan(0.4);
        expect(mesh.position.y).toBeGreaterThan(1.0);
      }
    }
  });

  it("ties a tiny kraft PAPER knot on each dinghy painter, crates and bollard-cap remain", () => {
    function collectPart(root: THREE.Object3D, name: string) {
      const out: THREE.Object3D[] = [];
      root.traverse((obj) => {
        if (obj.userData?.part === name) out.push(obj);
      });
      return out;
    }

    function collectPainter(root: THREE.Object3D) {
      const out: THREE.Object3D[] = [];
      root.traverse((obj) => {
        if (obj.userData?.dress === "painter" || obj.userData?.part === "painter") {
          out.push(obj);
        }
      });
      return out;
    }

    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      const added: THREE.Object3D[] = [];
      const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
      const root = makeQuay(spec, { scene, heightAt });

      expect(collectDress(root, "crate").length).toBeGreaterThanOrEqual(6);
      expect(collectPart(root, "bollard-cap").length).toBeGreaterThanOrEqual(12);

      const painters = collectPainter(root);
      expect(painters.length).toBeGreaterThanOrEqual(2);

      const knots = collectPart(root, "knot");
      expect(knots.length).toBe(painters.length);

      for (const painter of painters) {
        const mesh = painter as THREE.Mesh;
        expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
        const painterMat = mesh.material as THREE.MeshLambertMaterial;
        expect(painterMat.color.getHex()).toBe(0xc4a06a);

        const onLine = knots.filter((k) => {
          let p: THREE.Object3D | null = k.parent;
          while (p) {
            if (p === painter) return true;
            p = p.parent;
          }
          return false;
        });
        expect(onLine.length).toBe(1);
        const knot = onLine[0] as THREE.Mesh;
        expect(knot.userData.part).toBe("knot");
        expect(knot.geometry).toBeInstanceOf(THREE.BoxGeometry);
        const mat = knot.material as THREE.MeshLambertMaterial;
        const hex = mat.color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(hex).toBe(0x8a6238);
        const { width, height, depth } = (knot.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.3);
        expect(height).toBeLessThan(0.3);
        expect(depth).toBeLessThan(0.3);
      }
    }
  });

  it("puts a tiny kraft PAPER splice on the dinghy painter, hook knot and bollard-cap remain", () => {
    function collectPart(root: THREE.Object3D, name: string) {
      const out: THREE.Object3D[] = [];
      root.traverse((obj) => {
        if (obj.userData?.part === name) out.push(obj);
      });
      return out;
    }

    function collectPainter(root: THREE.Object3D) {
      const out: THREE.Object3D[] = [];
      root.traverse((obj) => {
        if (obj.userData?.dress === "painter" || obj.userData?.part === "painter") {
          out.push(obj);
        }
      });
      return out;
    }

    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      const added: THREE.Object3D[] = [];
      const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
      const root = makeQuay(spec, { scene, heightAt });

      const painters = collectPainter(root);
      expect(painters.length).toBeGreaterThanOrEqual(2);
      expect(collectPart(root, "hook").length).toBeGreaterThanOrEqual(2);
      expect(collectPart(root, "knot").length).toBeGreaterThanOrEqual(2);
      expect(collectPart(root, "bollard-cap").length).toBeGreaterThanOrEqual(12);

      const splices = collectPart(root, "splice");
      expect(splices.length).toBe(painters.length);

      for (const painter of painters) {
        const onLine = splices.filter((s) => {
          let p: THREE.Object3D | null = s.parent;
          while (p) {
            if (p === painter) return true;
            p = p.parent;
          }
          return false;
        });
        expect(onLine.length).toBe(1);
        const mesh = onLine[0] as THREE.Mesh;
        expect(mesh.userData.part).toBe("splice");
        expect(mesh.userData.mode).toBe("PAPER");
        expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
        const mat = mesh.material as THREE.MeshLambertMaterial;
        const hex = mat.color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(hex).toBe(0x8a6238);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.2);
        expect(height).toBeLessThan(0.2);
        expect(depth).toBeLessThan(0.3);
      }
    }
  });

  it("hangs a tiny kraft PAPER hook on the dinghy painter, knot and bollard-cap remain", () => {
    function collectPart(root: THREE.Object3D, name: string) {
      const out: THREE.Object3D[] = [];
      root.traverse((obj) => {
        if (obj.userData?.part === name) out.push(obj);
      });
      return out;
    }

    for (const id of ["north", "south"] as const) {
      const spec = ISLANDS[id];
      const added: THREE.Object3D[] = [];
      const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
      const root = makeQuay(spec, { scene, heightAt });

      const hooks = collectPart(root, "hook");
      expect(hooks.length).toBeGreaterThanOrEqual(1);
      expect(collectPart(root, "knot").length).toBeGreaterThanOrEqual(2);
      expect(collectPart(root, "bollard-cap").length).toBeGreaterThanOrEqual(12);

      for (const h of hooks) {
        const mesh = h as THREE.Mesh;
        expect(mesh.userData.part).toBe("hook");
        expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
        const mat = mesh.material as THREE.MeshLambertMaterial;
        const hex = mat.color.getHex();
        expect(isGrey(hex)).toBe(false);
        expect(hex).toBe(0x8a6238);
        const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
        expect(width).toBeLessThan(0.2);
        expect(height).toBeLessThan(0.2);
        expect(depth).toBeLessThan(0.2);
      }
    }
  });

  it("keeps spawn-readable sage dinghy hulls with kraft gunwales in the basin", () => {
    const spec = ISLANDS.north;
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeQuay(spec, { scene, heightAt });

    const boats = root.children.filter((c) => c.userData?.kind === "dinghy");
    expect(boats.length).toBe(2);
    for (const boat of boats) {
      expect(boat.position.y).toBeGreaterThan(1);
      expect(Math.abs(boat.position.x)).toBeLessThan(8);
      let hull: THREE.Mesh | null = null;
      let gunwale: THREE.Mesh | null = null;
      boat.traverse((obj) => {
        if (obj.userData?.part === "hull") hull = obj as THREE.Mesh;
        if (obj.userData?.part === "gunwale") gunwale = obj as THREE.Mesh;
      });
      expect(hull).not.toBeNull();
      expect(gunwale).not.toBeNull();
      const hg = (hull as THREE.Mesh).geometry as THREE.BoxGeometry;
      expect(hg.parameters.width).toBeGreaterThanOrEqual(6);
      expect(hg.parameters.height).toBeGreaterThanOrEqual(2);
      expect(hg.parameters.depth).toBeGreaterThanOrEqual(14);
      const hm = (hull as THREE.Mesh).material as THREE.MeshLambertMaterial;
      expect(hm.color.getHex()).toBe(0x5c6e52);
      const gm = (gunwale as THREE.Mesh).material as THREE.MeshLambertMaterial;
      expect(gm.color.getHex()).toBe(0xc4b496);
    }
  });

  it("keeps a spawn-readable kraft brow from the north pier toward the basin", () => {
    const spec = ISLANDS.north;
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeQuay(spec, { scene, heightAt });
    const brow = root.children.find((c) => c.userData?.dress === "brow");
    expect(brow).toBeTruthy();
    let plank: THREE.Mesh | null = null;
    brow!.traverse((obj) => {
      if (obj.userData?.part === "plank") plank = obj as THREE.Mesh;
    });
    expect(plank).not.toBeNull();
    const pg = (plank as THREE.Mesh).geometry as THREE.BoxGeometry;
    expect(pg.parameters.width).toBeGreaterThanOrEqual(6);
    expect(pg.parameters.height).toBeGreaterThanOrEqual(2);
    expect(pg.parameters.depth).toBeGreaterThanOrEqual(10);
    expect(pg.parameters.depth).toBeLessThan(16);
    const pm = (plank as THREE.Mesh).material as THREE.MeshLambertMaterial;
    expect(pm.color.getHex()).toBe(0x4a3220);
    expect(brow!.position.y).toBeGreaterThan(1.2);
    expect(Math.abs(brow!.position.x)).toBeLessThan(2);
    expect(brow!.position.z).toBeGreaterThan(-6872);
    expect(brow!.position.z).toBeLessThan(-6860);
  });

  it("stands a spawn-readable rust buoy in the north basin channel with the dinghies", () => {
    const spec = ISLANDS.north;
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeQuay(spec, { scene, heightAt });
    const buoy = root.children.find((c) => c.userData?.dress === "buoy");
    expect(buoy).toBeTruthy();
    let body: THREE.Mesh | null = null;
    buoy!.traverse((obj) => {
      if (obj.userData?.part === "body") body = obj as THREE.Mesh;
    });
    expect(body).not.toBeNull();
    const bg = (body as THREE.Mesh).geometry as THREE.BoxGeometry;
    expect(bg.parameters.width).toBeGreaterThanOrEqual(7);
    expect(bg.parameters.height).toBeGreaterThanOrEqual(6);
    const bm = (body as THREE.Mesh).material as THREE.MeshLambertMaterial;
    expect(bm.color.getHex()).toBe(0x6e2e22);
    expect(buoy!.position.y).toBeGreaterThan(4);
    expect(Math.abs(buoy!.position.x)).toBeLessThan(2);
    expect(buoy!.position.z).toBeGreaterThan(-6840);
    expect(buoy!.position.z).toBeLessThan(-6828);
  });

  it("hangs a spawn-readable kraft/rust life ring on the camera-facing hull, offset from the buoy", () => {
    const spec = ISLANDS.north;
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeQuay(spec, { scene, heightAt });
    const ring = root.children.find((c) => c.userData?.dress === "ring");
    const buoy = root.children.find((c) => c.userData?.dress === "buoy");
    expect(ring).toBeTruthy();
    expect(buoy).toBeTruthy();
    let body: THREE.Mesh | null = null;
    ring!.traverse((obj) => {
      if (obj.userData?.part === "body") body = obj as THREE.Mesh;
    });
    expect(body).not.toBeNull();
    const hexes: number[] = [];
    ring!.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mat?.color) hexes.push(mat.color.getHex());
    });
    expect(hexes).toContain(0x6e2e22);
    expect(hexes).toContain(0xc4b496);
    const bg = (body as THREE.Mesh).geometry as THREE.BoxGeometry;
    expect(bg.parameters.height).toBeGreaterThanOrEqual(6);
    expect(ring!.position.x).toBeGreaterThan(12);
    expect(ring!.position.y).toBeGreaterThan(4);
    expect(Math.abs(ring!.position.z - buoy!.position.z)).toBeLessThan(1);
  });

  it("stands a spawn-readable rust funnel above the held buoy on the camera-facing hull", () => {
    const spec = ISLANDS.north;
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeQuay(spec, { scene, heightAt });
    const funnel = root.children.find((c) => c.userData?.dress === "funnel");
    const buoy = root.children.find((c) => c.userData?.dress === "buoy");
    expect(funnel).toBeTruthy();
    expect(buoy).toBeTruthy();
    let body: THREE.Mesh | null = null;
    funnel!.traverse((obj) => {
      if (obj.userData?.part === "body") body = obj as THREE.Mesh;
    });
    expect(body).not.toBeNull();
    const hexes: number[] = [];
    funnel!.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mat?.color) hexes.push(mat.color.getHex());
    });
    expect(hexes).toContain(0x6e2e22);
    expect(hexes).toContain(0xc4b496);
    const bg = (body as THREE.Mesh).geometry as THREE.BoxGeometry;
    expect(bg.parameters.height).toBeGreaterThanOrEqual(30);
    expect(Math.abs(funnel!.position.x)).toBeLessThan(2);
    expect(funnel!.position.y).toBeGreaterThan(20);
    expect(Math.abs(funnel!.position.z - buoy!.position.z)).toBeLessThan(1);
  });

  it("parks a spawn-readable rust cargo cube on the north timber pier", () => {
    const spec = ISLANDS.north;
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeQuay(spec, { scene, heightAt });
    const cargo = root.children.find((c) => c.userData?.dress === "cargo");
    expect(cargo).toBeTruthy();
    let body: THREE.Mesh | null = null;
    cargo!.traverse((obj) => {
      if (obj.userData?.part === "body") body = obj as THREE.Mesh;
    });
    expect(body).not.toBeNull();
    const hexes: number[] = [];
    cargo!.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mat?.color) hexes.push(mat.color.getHex());
    });
    expect(hexes).toContain(0x6e2e22);
    expect(hexes).toContain(0xc4b496);
    const bg = (body as THREE.Mesh).geometry as THREE.BoxGeometry;
    expect(bg.parameters.height).toBeGreaterThanOrEqual(6);
    expect(bg.parameters.width).toBeGreaterThanOrEqual(10);
    expect(bg.parameters.depth).toBeGreaterThanOrEqual(14);
    expect(Math.abs(cargo!.position.x)).toBeLessThan(2);
    expect(cargo!.position.y).toBeGreaterThan(3);
    expect(cargo!.position.z).toBeGreaterThan(-6880);
    expect(cargo!.position.z).toBeLessThan(-6864);
  });

  it("paints a spawn-readable rust waterline on the camera-facing cream hull", () => {
    const spec = ISLANDS.north;
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeQuay(spec, { scene, heightAt });
    const plate = root.children.find((c) => c.userData?.dress === "plate");
    const buoy = root.children.find((c) => c.userData?.dress === "buoy");
    expect(plate).toBeTruthy();
    expect(buoy).toBeTruthy();
    let body: THREE.Mesh | null = null;
    plate!.traverse((obj) => {
      if (obj.userData?.part === "body") body = obj as THREE.Mesh;
    });
    expect(body).not.toBeNull();
    const hexes: number[] = [];
    plate!.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mat?.color) hexes.push(mat.color.getHex());
    });
    expect(hexes).toContain(0x6e2e22);
    expect(hexes).toContain(0xc4b496);
    const bg = (body as THREE.Mesh).geometry as THREE.BoxGeometry;
    expect(bg.parameters.width).toBeGreaterThanOrEqual(18);
    expect(bg.parameters.height).toBeGreaterThanOrEqual(4);
    expect(Math.abs(plate!.position.x)).toBeLessThan(2);
    expect(plate!.position.y).toBeGreaterThan(4);
    expect(Math.abs(plate!.position.z - buoy!.position.z)).toBeLessThan(1);
  });

  it("parks a spawn-readable teal crate on the north timber pier", () => {
    const spec = ISLANDS.north;
    const added: THREE.Object3D[] = [];
    const scene = { add(obj: THREE.Object3D) { added.push(obj); } };
    const root = makeQuay(spec, { scene, heightAt });
    const teal = root.children.find((c) => c.userData?.dress === "teal");
    expect(teal).toBeTruthy();
    let body: THREE.Mesh | null = null;
    teal!.traverse((obj) => {
      if (obj.userData?.part === "body") body = obj as THREE.Mesh;
    });
    expect(body).not.toBeNull();
    const hexes: number[] = [];
    teal!.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mat?.color) hexes.push(mat.color.getHex());
    });
    expect(hexes).toContain(0x2a7a72);
    expect(hexes.every((c) => c === 0x2a7a72)).toBe(true);
    const bg = (body as THREE.Mesh).geometry as THREE.BoxGeometry;
    expect(bg.parameters.height).toBeGreaterThanOrEqual(8);
    expect(teal!.position.x).toBeGreaterThan(3);
    expect(teal!.position.x).toBeLessThan(5.15);
    expect(teal!.position.y).toBeGreaterThan(8);
    expect(teal!.position.z).toBeGreaterThan(-6882);
    expect(teal!.position.z).toBeLessThan(-6868);
  });
});
