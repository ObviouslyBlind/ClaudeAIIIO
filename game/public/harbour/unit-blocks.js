import * as THREE from "three";

/**
 * Placeholder unit blocks. Grey boxes for systems. Not Blender façades.
 * Kit is also grey boxes (shelf, fridge, till, bed, shower, sink, desk, cabinet).
 * Dollhouse cutaway: open-top rooms on the viewed floor, hide floors above.
 */

export const ROOM_W = 6;
export const ROOM_D = 5;
export const ROOM_H = 3.2;
export const GAP = 0.45;
const KIT = 0.7;
const VACANT = 0x7a7a7a;
const OWNED = 0xc4c4c4;
const KIT_GREY = 0xb0b0b0;
const TAG_W = 5.2;
const TAG_H = 1.35;
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

function paintTag(canvas, title, sub) {
  if (!canvas || typeof document === "undefined") return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(24,30,20,0.92)";
  const r = 12;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.arcTo(w, 0, w, r, r);
  ctx.lineTo(w, h - r);
  ctx.arcTo(w, h, w - r, h, r);
  ctx.lineTo(r, h);
  ctx.arcTo(0, h, 0, r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.fill();
  ctx.strokeStyle = "rgba(244,242,234,0.35)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#f4f2ea";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 26px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(String(title || ""), w / 2, h * 0.38);
  ctx.font = "700 22px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(String(sub || ""), w / 2, h * 0.72);
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

function tagSub(building) {
  const owned = (building.rooms || []).some((r) => r.owner === "visitor");
  if (owned) return "YOURS";
  const p = cheapestVacant(building);
  if (p == null) return "PAPER";
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

function addTag(group, building, x, y, z) {
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(TAG_W, TAG_H, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x181e14, transparent: true, opacity: 0.01 }),
  );
  hit.position.set(x, y, z);
  hit.name = "unit-label-" + building.id;
  stampUnit(hit, building, null, "tag");
  group.add(hit);
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 72;
  paintTag(canvas, building.name, tagSub(building));
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
  group.add(sprite);
}

function localXZ(yaw, lx, lz) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: lx * c - lz * s, z: lx * s + lz * c };
}

function wallMat(color) {
  return new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
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
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w.w, wallH, w.d), wallMat(color));
    mesh.position.set(w.x, wallY, w.z);
    stampUnit(mesh, building, r, "cutaway", Number(r.floor) || 0);
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

function applyCutawayToGroup(group, view) {
  group.traverse((o) => {
    const d = o.userData;
    if (!d || d.kind !== "unit-block") return;
    if (d.part === "pad") {
      o.visible = true;
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
    if (d.part === "tag") {
      o.visible = false;
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

export function mountUnitBlocks(opts) {
  const scene = opts.scene;
  const heightAt = opts.heightAt || (() => 0);
  const group = new THREE.Group();
  group.name = "unit-blocks";
  if (scene) scene.add(group);
  let cutaway = null;

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
      let maxSpan = ROOM_W;
      for (const [floor, floorRooms] of byFloor) {
        floorRooms.forEach((r, i) => {
          const n = floorRooms.length;
          const xOff = (i - (n - 1) / 2) * (ROOM_W + GAP);
          maxSpan = Math.max(maxSpan, Math.abs(xOff) * 2 + ROOM_W);
          const y = y0 + ROOM_H / 2 + floor * (ROOM_H + GAP);
          roofY = Math.max(roofY, y + ROOM_H / 2);
          const at = localXZ(yaw, xOff, 0);
          const color = r.owner === "visitor" ? OWNED : VACANT;
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D),
            new THREE.MeshLambertMaterial({ color }),
          );
          mesh.position.set(b.x + at.x, y, b.z + at.z);
          mesh.rotation.y = yaw;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.name = "unit-" + r.id;
          stampUnit(mesh, b, r, "shell", floor);
          group.add(mesh);
          addCutawayRoom(group, b, r, b.x + at.x, y, b.z + at.z, yaw, color);
          rooms += 1;
          const kit = Array.isArray(r.kit) ? r.kit : [];
          kit.forEach((id, k) => {
            const bit = new THREE.Mesh(
              new THREE.BoxGeometry(KIT, KIT, KIT),
              new THREE.MeshLambertMaterial({ color: KIT_GREY }),
            );
            const kx = xOff + (k - (kit.length - 1) / 2) * (KIT + 0.15);
            const kitAt = localXZ(yaw, kx, ROOM_D * 0.22);
            bit.position.set(b.x + kitAt.x, y0 + floor * (ROOM_H + GAP) + KIT / 2 + 0.08, b.z + kitAt.z);
            bit.rotation.y = yaw;
            bit.name = "unit-kit-" + r.id + "-" + id;
            stampUnit(bit, b, r, "kit", floor);
            bit.userData.kitId = id;
            group.add(bit);
          });
        });
      }
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(maxSpan + 1.2, 0.18, ROOM_D + 1.4),
        new THREE.MeshLambertMaterial({ color: 0x6a5e48 }),
      );
      pad.position.set(b.x, y0 + 0.08, b.z);
      pad.rotation.y = yaw;
      pad.receiveShadow = true;
      pad.name = "unit-pad-" + b.id;
      stampUnit(pad, b, null, "pad");
      group.add(pad);
      addTag(group, b, b.x, roofY + 1.1, b.z);
    }
    applyCutawayToGroup(group, cutaway);
    return rooms;
  }

  function applyCutaway(view) {
    cutaway = view && view.buildingId != null ? { buildingId: view.buildingId, floor: Number(view.floor) || 0 } : null;
    applyCutawayToGroup(group, cutaway);
    return cutaway;
  }

  return {
    group,
    sync,
    applyCutaway,
    getCutaway: () => cutaway,
    clickables() {
      const out = [];
      group.traverse((o) => {
        if (o.userData && o.userData.kind === "unit-block" && o.visible !== false) out.push(o);
      });
      return out;
    },
  };
}
