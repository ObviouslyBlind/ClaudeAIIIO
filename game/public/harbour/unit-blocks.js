import * as THREE from "three";
import { createKitMesh, KIT_FOOTPRINT } from "./unit-kit.js";

/**
 * Placeholder unit shells. Grey boxes for systems. Not Blender façades.
 * Kit is constructed furniture (unit-kit.js). Dirt under a building is just a lot —
 * no extra pad mesh. Property $ / YOURS signs sit way above the roof, same language
 * as lot tags, and only when the Properties toggle is on.
 * Dollhouse cutaway: open-top rooms on the viewed floor, hide floors above.
 */

export const ROOM_W = 6;
export const ROOM_D = 5;
export const ROOM_H = 3.2;
export const GAP = 0.45;
const VACANT = 0xc6c6c6;
const OWNED = 0xe8e8e8;
const TAG_W = 4.2;
const TAG_H = 1.15;
const TAG_ABOVE_M = 4.8;
const WALL_T = 0.12;

export function roomBoxCount(buildings) {
  let n = 0;
  for (const b of buildings || []) n += (b.rooms || []).length;
  return n;
}

function groundY(heightAt, x, z) {
  if (typeof heightAt !== "function") return 0;
  const y = Number(heightAt(x, z));
  return Number.isFinite(y) ? y : 0;
}

function paintLotTag(canvas, text, kind) {
  if (!canvas || typeof document === "undefined") return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const yours = kind === "yours";
  ctx.fillStyle = yours ? "rgba(47,138,76,0.94)" : "rgba(24,30,20,0.9)";
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.arcTo(w, 0, w, r, r);
  ctx.lineTo(w, h - r);
  ctx.arcTo(w, h, w - r, h, r);
  ctx.lineTo(r, h);
  ctx.arcTo(0, h, 0, h - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.fill();
  ctx.strokeStyle = yours ? "#5fe3a0" : "rgba(244,242,234,0.28)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#f4f2ea";
  ctx.font = "700 28px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 1);
}

function cheapestVacant(building) {
  let min = null;
  for (const r of building.rooms || []) {
    if (r.owner === "visitor") continue;
    const p = Number(r.price);
    if (!Number.isFinite(p)) continue;
    if (min == null || p < min) min = p;
  }
  return min;
}

function propertyOwned(building) {
  if (building.landOwner === "visitor") return true;
  return (building.rooms || []).some((r) => r.owner === "visitor");
}

function tagKindOf(building) {
  return propertyOwned(building) ? "yours" : "buy";
}

function tagLabelOf(building) {
  if (propertyOwned(building)) return "YOURS";
  const p = cheapestVacant(building);
  if (p == null) {
    const land = Number(building.landPrice);
    return Number.isFinite(land) ? "$" + Math.round(land).toLocaleString("en-US") : "PAPER";
  }
  return "$" + Math.round(p).toLocaleString("en-US");
}

function stampUnit(obj, building, r, part, floor) {
  obj.userData.kind = "unit-block";
  obj.userData.part = part;
  obj.userData.buildingId = building.id;
  obj.userData.buildingName = building.name;
  if (r) obj.userData.unitId = r.id;
  if (floor != null) obj.userData.floor = floor;
}

function stampTree(obj, building, r, part, floor) {
  stampUnit(obj, building, r, part, floor);
  for (const ch of obj.children || []) stampTree(ch, building, r, part, floor);
}

function addTag(group, building, x, y, z) {
  const kind = tagKindOf(building);
  const text = tagLabelOf(building);
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(TAG_W, TAG_H, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x181e14, transparent: true, opacity: 0.01 }),
  );
  hit.position.set(x, y, z);
  hit.name = "unit-label-" + building.id;
  stampUnit(hit, building, null, "tag");
  hit.userData.tagKind = kind;
  group.add(hit);
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 56;
  paintLotTag(canvas, text, kind);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      depthTest: true,
      depthWrite: false,
      transparent: true,
    }),
  );
  sprite.position.set(x, y, z);
  sprite.scale.set(TAG_W, TAG_H, 1);
  sprite.name = "unit-sprite-" + building.id;
  stampUnit(sprite, building, null, "tag");
  sprite.userData.tagKind = kind;
  sprite.userData.label = text;
  group.add(sprite);
}

function localXZ(yaw, lx, lz) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: lx * c - lz * s, z: lx * s + lz * c };
}

function shellMat(color) {
  return new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.22 });
}

function wallMat(color) {
  return new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.18, side: THREE.DoubleSide });
}

function addEdges(mesh, color = 0x2a2a2a) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color }),
  );
  edges.userData.kind = mesh.userData.kind;
  edges.userData.part = mesh.userData.part;
  edges.userData.buildingId = mesh.userData.buildingId;
  edges.userData.buildingName = mesh.userData.buildingName;
  edges.userData.unitId = mesh.userData.unitId;
  edges.userData.floor = mesh.userData.floor;
  mesh.add(edges);
}

function addCutawayRoom(group, building, r, worldX, worldY, worldZ, yaw, color) {
  const g = new THREE.Group();
  g.name = "unit-cutaway-" + r.id;
  g.position.set(worldX, worldY, worldZ);
  g.rotation.y = yaw;
  g.visible = false;
  stampUnit(g, building, r, "cutaway", Number(r.floor) || 0);

  const slab = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.14, ROOM_D), wallMat(color));
  slab.position.y = -ROOM_H / 2 + 0.07;
  stampUnit(slab, building, r, "cutaway", Number(r.floor) || 0);
  addEdges(slab);
  g.add(slab);

  const wallH = ROOM_H * 0.9;
  const wallY = -ROOM_H / 2 + 0.14 + wallH / 2;
  const walls = [
    { w: ROOM_W, d: WALL_T, x: 0, z: -ROOM_D / 2 + WALL_T / 2 },
    { w: ROOM_W, d: WALL_T, x: 0, z: ROOM_D / 2 - WALL_T / 2 },
    { w: WALL_T, d: ROOM_D, x: -ROOM_W / 2 + WALL_T / 2, z: 0 },
    { w: WALL_T, d: ROOM_D, x: ROOM_W / 2 - WALL_T / 2, z: 0 },
  ];
  for (const w of walls) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w.w, w.h || wallH, w.d), wallMat(color));
    mesh.position.set(w.x, wallY, w.z);
    stampUnit(mesh, building, r, "cutaway", Number(r.floor) || 0);
    addEdges(mesh);
    g.add(mesh);
  }
  group.add(g);
}

function disposeObject(obj) {
  obj.traverse((ch) => {
    if (ch.geometry) ch.geometry.dispose();
    if (ch.material) {
      const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}

function kitSpread(ids) {
  const fps = ids.map((id) => KIT_FOOTPRINT[id] || KIT_FOOTPRINT.cabinet);
  const gap = 0.28;
  const total = fps.reduce((s, f) => s + f.w, 0) + gap * Math.max(0, ids.length - 1);
  let x = -total / 2;
  return ids.map((id, i) => {
    const fp = fps[i];
    const cx = x + fp.w / 2;
    x += fp.w + gap;
    return { id, lx: cx, lz: ROOM_D / 2 - fp.d / 2 - 0.28 };
  });
}

export function mountUnitBlocks(opts) {
  const scene = opts.scene;
  const heightAt = opts.heightAt || (() => 0);
  const group = new THREE.Group();
  group.name = "unit-blocks";
  if (scene) scene.add(group);
  let cutaway = null;
  let propertiesOn = false;
  let overlay = "world";

  function propertiesLive() {
    return propertiesOn || overlay === "lots" || overlay === "yours";
  }

  function tagShouldShow(d) {
    if (!propertiesLive()) return false;
    if (overlay === "yours") return d.tagKind === "yours";
    return true;
  }

  function applyCutawayToGroup(view) {
    group.traverse((o) => {
      const d = o.userData;
      if (!d || d.kind !== "unit-block") return;
      if (d.part === "tag") {
        o.visible = !view && tagShouldShow(d);
        return;
      }
      if (!view) {
        o.visible = d.part !== "cutaway";
        return;
      }
      if (d.buildingId !== view.buildingId) {
        o.visible = d.part !== "cutaway";
        return;
      }
      const f = Number(d.floor);
      if (Number.isFinite(f) && f > Number(view.floor)) {
        o.visible = false;
        return;
      }
      if (f === Number(view.floor)) {
        if (d.part === "shell") o.visible = false;
        else o.visible = true;
        return;
      }
      o.visible = d.part !== "cutaway";
    });
  }

  function setViewer(next) {
    if (next && typeof next.propertiesOn === "boolean") propertiesOn = next.propertiesOn;
    if (next && next.overlay) overlay = next.overlay;
    applyCutawayToGroup(cutaway);
    return { propertiesOn, overlay };
  }

  function sync(play) {
    while (group.children.length) {
      const ch = group.children[0];
      group.remove(ch);
      disposeObject(ch);
    }
    const buildings = (play && play.units && play.units.buildings) || [];
    let rooms = 0;
    for (const b of buildings) {
      const y0 = groundY(heightAt, b.x, b.z);
      const yaw = Number(b.yaw) || 0;
      const byFloor = new Map();
      for (const r of b.rooms || []) {
        const f = Number(r.floor) || 0;
        if (!byFloor.has(f)) byFloor.set(f, []);
        byFloor.get(f).push(r);
      }
      let roofY = y0;
      for (const [floor, floorRooms] of byFloor) {
        floorRooms.forEach((r, i) => {
          const n = floorRooms.length;
          const xOff = (i - (n - 1) / 2) * (ROOM_W + GAP);
          const y = y0 + ROOM_H / 2 + floor * (ROOM_H + GAP);
          roofY = Math.max(roofY, y + ROOM_H / 2);
          const at = localXZ(yaw, xOff, 0);
          const color = r.owner === "visitor" ? OWNED : VACANT;
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D),
            shellMat(color),
          );
          mesh.position.set(b.x + at.x, y, b.z + at.z);
          mesh.rotation.y = yaw;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.name = "unit-" + r.id;
          stampUnit(mesh, b, r, "shell", floor);
          addEdges(mesh);
          group.add(mesh);
          addCutawayRoom(group, b, r, b.x + at.x, y, b.z + at.z, yaw, color);
          rooms += 1;
          const kit = Array.isArray(r.kit) ? r.kit : [];
          const floorY = y0 + floor * (ROOM_H + GAP) + 0.14;
          kitSpread(kit).forEach((slot) => {
            const bit = createKitMesh(slot.id);
            const kitAt = localXZ(yaw, xOff + slot.lx, slot.lz);
            bit.position.set(b.x + kitAt.x, floorY, b.z + kitAt.z);
            bit.rotation.y = yaw;
            bit.name = "unit-kit-" + r.id + "-" + slot.id;
            stampTree(bit, b, r, "kit", floor);
            bit.userData.kitId = slot.id;
            group.add(bit);
          });
        });
      }
      addTag(group, b, b.x, roofY + TAG_ABOVE_M, b.z);
    }
    applyCutawayToGroup(cutaway);
    return rooms;
  }

  function applyCutaway(view) {
    cutaway = view && view.buildingId != null ? { buildingId: view.buildingId, floor: Number(view.floor) || 0 } : null;
    applyCutawayToGroup(cutaway);
    return cutaway;
  }

  return {
    group,
    sync,
    applyCutaway,
    setViewer,
    isPropertiesOn: () => propertiesOn,
    getCutaway: () => cutaway,
    clickables() {
      if (!propertiesLive()) return [];
      const out = [];
      group.traverse((o) => {
        if (o.userData && o.userData.kind === "unit-block" && o.visible !== false) out.push(o);
      });
      return out;
    },
  };
}
