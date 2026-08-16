import * as THREE from "three";

/**
 * PAPER evening glow on existing building-shell window panes.
 * Warm kraft / lamp-shade amber — not CoD neon, not Capital Rift cyan.
 *
 * No extra meshes (phones): reuse the glass boxes from buildings.js
 * `windowPane`. One shared Lambert material. No PointLights, no bloom.
 *
 * Hook from buildings.js `meshForUse` only. Do not import from main.js.
 *
 * Call dressWindowLights(buildingMesh). Idempotent.
 */

/** Same hex as buildings.js GLASS — the only glass `windowPane` uses. */
const SHELL_GLASS = 0x8ec4d4;
/** Kraft cream pane — original street-lamp glass, distinct from cottage 0xf4ead8. */
const PANE = 0xf3d6a0;
/** Interior lamp-shade — original PAPER SHADE, warmer kraft at dusk than 0xe8a45a. */
const GLOW = 0xf0c878;

const paneMat = new THREE.MeshLambertMaterial({
  color: PANE,
  emissive: GLOW,
  emissiveIntensity: 0.56,
});

function isShellGlass(mesh) {
  const mat = mesh.material;
  if (!mat || Array.isArray(mat) || !mat.color || !mat.color.getHex) return false;
  if (mat === paneMat) return true;
  return mat.color.getHex() === SHELL_GLASS;
}

/**
 * Swap shell glass to the shared warm pane. Zero new meshes.
 * @param {THREE.Object3D | null | undefined} buildingMesh
 * @returns {THREE.Object3D | null | undefined}
 */
export function dressWindowLights(buildingMesh) {
  if (!buildingMesh || !buildingMesh.traverse) return buildingMesh;
  if (buildingMesh.userData && buildingMesh.userData.windowLights) return buildingMesh;

  buildingMesh.traverse((obj) => {
    if (!obj.isMesh || !isShellGlass(obj)) return;
    const old = obj.material;
    obj.material = paneMat;
    obj.castShadow = false;
    obj.userData.windowLight = true;
    obj.userData.mode = "PAPER";
    if (old && old !== paneMat && typeof old.dispose === "function") old.dispose();
  });

  if (!buildingMesh.userData) buildingMesh.userData = {};
  buildingMesh.userData.windowLights = true;
  buildingMesh.userData.mode = buildingMesh.userData.mode || "PAPER";
  return buildingMesh;
}
