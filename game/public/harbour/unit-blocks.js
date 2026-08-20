import * as THREE from "three";

/**
 * Placeholder unit blocks. Grey boxes for systems. Not Blender façades.
 */

const ROOM_W = 6;
const ROOM_D = 5;
const ROOM_H = 3.2;
const GAP = 0.45;
const VACANT = 0x7a7a7a;
const OWNED = 0xc4c4c4;

export function roomBoxCount(buildings) {
  let n = 0;
  for (const b of buildings || []) n += (b.rooms || []).length;
  return n;
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
      if (ch.material) ch.material.dispose();
    }
    const buildings = (play && play.units && play.units.buildings) || [];
    for (const b of buildings) {
      const y0 = Number(heightAt(b.x, b.z)) || 0;
      const byFloor = new Map();
      for (const r of b.rooms || []) {
        const f = Number(r.floor) || 0;
        if (!byFloor.has(f)) byFloor.set(f, []);
        byFloor.get(f).push(r);
      }
      for (const [floor, rooms] of byFloor) {
        rooms.forEach((r, i) => {
          const n = rooms.length;
          const xOff = (i - (n - 1) / 2) * (ROOM_W + GAP);
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D),
            new THREE.MeshLambertMaterial({ color: r.owner === "visitor" ? OWNED : VACANT }),
          );
          mesh.position.set(b.x + xOff, y0 + ROOM_H / 2 + floor * (ROOM_H + GAP), b.z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.name = "unit-" + r.id;
          mesh.userData.kind = "unit-block";
          mesh.userData.buildingId = b.id;
          mesh.userData.unitId = r.id;
          group.add(mesh);
        });
      }
    }
    return group.children.length;
  }

  return {
    group,
    sync,
    clickables() {
      return group.children.slice();
    },
  };
}
