import * as THREE from "three";

/** Lagoon water. Builder fills this module — keep the tint 0x1d7a86. */
export const WATER_COLOR = 0x1d7a86;

export function makeWater(scene) {
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(80000, 80000),
    new THREE.MeshLambertMaterial({ color: WATER_COLOR }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  water.userData.kind = "water";
  scene.add(water);
  return water;
}
