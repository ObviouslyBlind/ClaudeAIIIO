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
/** Metres from the shell centre onto the highway kerb / pad verge. */
export const KERB_DUMP_M = 16;
const VACANT = 0xc6c6c6;
const OWNED = 0xe8e8e8;
const SELECT = 0x3dcc6a;
const TAG_W = 4.2;
const TAG_H = 1.15;
/** Metres above the roof to the bottom of the $ bar. */
export const TAG_ABOVE_M = 4.8;
/** Shells must not eat the sign. Lot dirt tags still depth-test. */
export const TAG_DEPTH_TEST = false;
const TAG_CANVAS_W = 192;
const TAG_CANVAS_H = 64;
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
  const stroke = 4;
  const pad = stroke / 2 + 2;
  const r = 12;
  const x0 = pad;
  const y0 = pad;
  const x1 = w - pad;
  const y1 = h - pad;
  ctx.fillStyle = yours ? "rgba(47,138,76,0.94)" : "rgba(24,30,20,0.9)";
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0);
  ctx.lineTo(x1 - r, y0);
  ctx.arcTo(x1, y0, x1, y0 + r, r);
  ctx.lineTo(x1, y1 - r);
  ctx.arcTo(x1, y1, x1 - r, y1, r);
  ctx.lineTo(x0 + r, y1);
  ctx.arcTo(x0, y1, x0, y1 - r, r);
  ctx.lineTo(x0, y0 + r);
  ctx.arcTo(x0, y0, x0 + r, y0, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = yours ? "#5fe3a0" : "rgba(244,242,234,0.28)";
  ctx.lineWidth = stroke;
  ctx.stroke();
  ctx.fillStyle = "#f4f2ea";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 32;
  const label = String(text);
  const maxW = x1 - x0 - 16;
  ctx.font = "700 " + size + "px 'Segoe UI', system-ui, sans-serif";
  while (size > 18 && ctx.measureText && ctx.measureText(label).width > maxW) {
    size -= 2;
    ctx.font = "700 " + size + "px 'Segoe UI', system-ui, sans-serif";
  }
  ctx.fillText(label, w / 2, h / 2 + 1);
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
  obj.userData.owned = r ? r.owner === "visitor" : false;
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
    new THREE.MeshBasicMaterial({
      color: 0x181e14,
      transparent: true,
      opacity: 0.01,
      depthTest: TAG_DEPTH_TEST,
      depthWrite: false,
    }),
  );
  hit.position.set(x, y + TAG_H / 2, z);
  hit.name = "unit-label-" + building.id;
  hit.renderOrder = 2;
  hit.frustumCulled = false;
  stampUnit(hit, building, null, "tag");
  hit.userData.tagKind = kind;
  group.add(hit);
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = TAG_CANVAS_W;
  canvas.height = TAG_CANVAS_H;
  paintLotTag(canvas, text, kind);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      depthTest: TAG_DEPTH_TEST,
      depthWrite: false,
      transparent: true,
      sizeAttenuation: true,
    }),
  );
  sprite.center.set(0.5, 0);
  sprite.position.set(x, y, z);
  sprite.scale.set(TAG_W, TAG_H, 1);
  sprite.renderOrder = 2;
  sprite.frustumCulled = false;
  sprite.name = "unit-sprite-" + building.id;
  stampUnit(sprite, building, null, "tag");
  sprite.userData.tagKind = kind;
  sprite.userData.label = text;
  group.add(sprite);
}

export function localXZ(yaw, lx, lz) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: lx * c - lz * s, z: lx * s + lz * c };
}

export function roomOnFloor(building, room) {
  const floor = Number(room && room.floor) || 0;
  const floorRooms = (building.rooms || []).filter((r) => (Number(r.floor) || 0) === floor);
  const id = room && room.id;
  let i = floorRooms.findIndex((r) => r.id === id);
  if (i < 0) i = Math.max(0, Number(room && room.room) || 0);
  return { floorRooms, i, n: floorRooms.length || 1, floor };
}

export function roomWorldPose(building, room, heightAt) {
  const yaw = Number(building && building.yaw) || 0;
  const { i, n, floor } = roomOnFloor(building, room || {});
  const xOff = (i - (n - 1) / 2) * (ROOM_W + GAP);
  const at = localXZ(yaw, xOff, 0);
  const x = Number(building && building.x) + at.x;
  const z = Number(building && building.z) + at.z;
  const y0 = groundY(heightAt, x, z);
  return {
    x,
    z,
    yaw,
    y: y0 + floor * (ROOM_H + GAP) + ROOM_H * 0.42,
    floorY: y0 + floor * (ROOM_H + GAP),
    unitId: room && room.id,
    buildingId: building && building.id,
    floor,
  };
}

/** Harbour kerb in front of a shell — toward the port, not inside the box. */
export function buildingKerbPose(building, heightAt) {
  const x0 = Number(building && building.x) || 0;
  const z0 = Number(building && building.z) || 0;
  const yaw = Number(building && building.yaw) || 0;
  const alongX = Math.cos(yaw);
  const alongZ = Math.sin(yaw);
  let px = -alongZ;
  let pz = alongX;
  const portX = -2280;
  const portZ = 7280;
  const toward = Math.hypot(x0 + px * KERB_DUMP_M - portX, z0 + pz * KERB_DUMP_M - portZ);
  const away = Math.hypot(x0 - px * KERB_DUMP_M - portX, z0 - pz * KERB_DUMP_M - portZ);
  if (toward > away) {
    px = -px;
    pz = -pz;
  }
  const x = x0 + px * KERB_DUMP_M;
  const z = z0 + pz * KERB_DUMP_M;
  return { x, y: groundY(heightAt, x, z), z };
}

export function roomFloorRing(pose) {
  const hw = ROOM_W / 2 - 0.16;
  const hd = ROOM_D / 2 - 0.16;
  const corners = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];
  return corners.map(([lx, lz]) => {
    const at = localXZ(pose.yaw, lx, lz);
    return [pose.x + at.x, pose.z + at.z];
  });
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

function addTenantBody() {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.18 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.62, 0.24), mat(0x3a5a48));
  torso.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), mat(0xe8d4b8));
  head.position.y = 1.4;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.7, 0.2), mat(0x2a2e32));
  legs.position.y = 0.35;
  g.add(torso, head, legs);
  g.userData.kind = "unit-block";
  g.userData.part = "tenant";
  return g;
}

export function mountUnitBlocks(opts) {
  const scene = opts.scene;
  const heightAt = opts.heightAt || (() => 0);
  const group = new THREE.Group();
  group.name = "unit-blocks";
  if (scene) scene.add(group);
  let cutaway = null;
  let propertiesOn = false;
  let propertiesMode = "off";
  let overlay = "world";
  let highlightId = "";

  function propertiesLive() {
    return propertiesMode === "sale" || propertiesMode === "yours" || propertiesOn;
  }

  function landlordLive() {
    return overlay === "landlord";
  }

  function tagsLive() {
    return propertiesLive() || landlordLive();
  }

  function tagShouldShow(d) {
    if (landlordLive()) return true;
    if (!propertiesLive()) return false;
    if (propertiesMode === "yours" || overlay === "yours") return d.tagKind === "yours";
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
      if (d.part === "tenant") {
        if (!view) {
          o.visible = false;
          return;
        }
        o.visible = d.buildingId === view.buildingId && (!view.unitId || d.unitId === view.unitId);
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
    if (next && next.propertiesMode) {
      propertiesMode = next.propertiesMode;
      propertiesOn = propertiesMode === "sale" || propertiesMode === "yours";
    }
    if (next && next.overlay) overlay = next.overlay;
    if (next && Object.prototype.hasOwnProperty.call(next, "highlightId")) {
      highlightId = next.highlightId || "";
    }
    applyCutawayToGroup(cutaway);
    paintHighlight();
    return { propertiesOn, overlay, propertiesMode, highlightId };
  }

  function paintHighlight() {
    group.traverse((o) => {
      const d = o.userData;
      if (!d || d.kind !== "unit-block") return;
      if (d.part !== "shell" && d.part !== "cutaway") return;
      if (!o.material || !o.material.color) return;
      if (d.part === "cutaway" && o.isLineSegments) return;
      const id = d.unitId;
      if (!id) return;
      const owned = d.owned;
      let hex = owned ? OWNED : VACANT;
      if (highlightId && id === highlightId) hex = SELECT;
      o.material.color.setHex(hex);
      if (o.material.emissive) o.material.emissive.setHex(hex);
    });
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
          if (r.lease) {
            const tenant = addTenantBody();
            tenant.position.set(b.x + at.x, y0 + floor * (ROOM_H + GAP) + 0.14, b.z + at.z);
            tenant.rotation.y = yaw;
            tenant.name = "unit-tenant-" + r.id;
            tenant.visible = false;
            stampTree(tenant, b, r, "tenant", floor);
            group.add(tenant);
          }
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
    paintHighlight();
    return rooms;
  }

  function applyCutaway(view) {
    cutaway = view && view.buildingId != null
      ? { buildingId: view.buildingId, floor: Number(view.floor) || 0, unitId: view.unitId || "" }
      : null;
    applyCutawayToGroup(cutaway);
    paintHighlight();
    return cutaway;
  }

  function highlight(unitId) {
    highlightId = unitId || "";
    paintHighlight();
    return highlightId;
  }

  return {
    group,
    sync,
    applyCutaway,
    setViewer,
    highlight,
    isPropertiesOn: () => propertiesOn,
    getCutaway: () => cutaway,
    getHighlight: () => highlightId,
    clickables() {
      if (!propertiesLive() && !landlordLive()) return [];
      const out = [];
      group.traverse((o) => {
        if (o.userData && o.userData.kind === "unit-block" && o.userData.part !== "tenant" && o.visible !== false) {
          out.push(o);
        }
      });
      return out;
    },
  };
}
