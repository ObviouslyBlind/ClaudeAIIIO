import * as THREE from "three";

/**
 * Placeholder unit blocks. Grey boxes for systems. Not Blender façades.
 * Kit is also grey boxes (shelf, fridge, till, bed, shower, sink, desk, cabinet).
 */

const ROOM_W = 6;
const ROOM_D = 5;
const ROOM_H = 3.2;
const GAP = 0.45;
const KIT = 0.7;
const VACANT = 0x7a7a7a;
const OWNED = 0xc4c4c4;
const KIT_GREY = 0xb0b0b0;
const TAG_W = 5.2;
const TAG_H = 1.35;

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
  ctx.arcTo(0, h, 0, h - r, r);
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

function addTag(group, building, x, y, z) {
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(TAG_W, TAG_H, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x181e14, transparent: true, opacity: 0.01 }),
  );
  hit.position.set(x, y, z);
  hit.name = "unit-label-" + building.id;
  hit.userData.kind = "unit-block";
  hit.userData.buildingId = building.id;
  hit.userData.buildingName = building.name;
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
  sprite.userData.kind = "unit-block";
  sprite.userData.buildingId = building.id;
  sprite.userData.buildingName = building.name;
  group.add(sprite);
}

export function mountUnitBlocks(opts) {
  const scene = opts.scene;
  const heightAt = opts.heightAt || (() => 0);
  const group = new THREE.Group();
  group.name = "unit-blocks";
  if (scene) scene.add(group);

  function sync(play) {
    while (group.children.length) {
      const ch = group.children[0];
      group.remove(ch);
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) {
        if (ch.material.map) ch.material.map.dispose();
        ch.material.dispose();
      }
    }
    const buildings = (play && play.units && play.units.buildings) || [];
    let rooms = 0;
    for (const b of buildings) {
      const y0 = groundY(heightAt, b.x, b.z);
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
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D),
            new THREE.MeshLambertMaterial({ color: r.owner === "visitor" ? OWNED : VACANT }),
          );
          mesh.position.set(b.x + xOff, y, b.z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.name = "unit-" + r.id;
          mesh.userData.kind = "unit-block";
          mesh.userData.buildingId = b.id;
          mesh.userData.buildingName = b.name;
          mesh.userData.unitId = r.id;
          group.add(mesh);
          rooms += 1;
          const kit = Array.isArray(r.kit) ? r.kit : [];
          kit.forEach((id, k) => {
            const bit = new THREE.Mesh(
              new THREE.BoxGeometry(KIT, KIT, KIT),
              new THREE.MeshLambertMaterial({ color: KIT_GREY }),
            );
            const kx = xOff + (k - (kit.length - 1) / 2) * (KIT + 0.15);
            bit.position.set(b.x + kx, y0 + floor * (ROOM_H + GAP) + KIT / 2 + 0.08, b.z + ROOM_D * 0.22);
            bit.name = "unit-kit-" + r.id + "-" + id;
            bit.userData.kind = "unit-block";
            bit.userData.buildingId = b.id;
            bit.userData.buildingName = b.name;
            bit.userData.unitId = r.id;
            bit.userData.kitId = id;
            group.add(bit);
          });
        });
      }
      addTag(group, b, b.x, roofY + 1.1, b.z);
    }
    return rooms;
  }

  return {
    group,
    sync,
    clickables() {
      const out = [];
      group.traverse((o) => {
        if (o.userData && o.userData.kind === "unit-block") out.push(o);
      });
      return out;
    },
  };
}
