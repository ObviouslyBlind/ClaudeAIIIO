import * as THREE from "three";

/** Sky / horizon. Builder fills this — no OSM Earth, no photo textures. */
export function makeSky(scene) {
  scene.background = scene.background || new THREE.Color(0x7ec8d4);
}
