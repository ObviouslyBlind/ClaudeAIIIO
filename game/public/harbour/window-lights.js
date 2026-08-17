import * as THREE from "three";

/**
 * PAPER evening glow on existing building-shell window panes.
 * Warm kraft / lamp-shade amber — not CoD neon, not Capital Rift cyan.
 *
 * Reuse the glass boxes from buildings.js `windowPane`. One shared Lambert
 * pane material. A couple of street panes also get a tiny kraft sill planter
 * (trough, soil, leaf tuft, one extra leaf/coral bloom). No PointLights,
 * no post-process bloom, no extra lamps.
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
/** Same crate kraft as shop/warehouse boxes — original palette, not a new hex. */
const KRAFT = 0x8a6238;
/** Same window-frame wood as buildings.js WOOD. */
const SOIL = 0x5a3a22;
/** Same crop green as buildings.js CROP[0]. */
const LEAF = 0x5f8a32;
/** Same stall/shop coral already used in harbour — not a new hex. */
const CORAL = 0xc45c3a;

const paneMat = new THREE.MeshLambertMaterial({
  color: PANE,
  emissive: GLOW,
  emissiveIntensity: 0.56,
});
const kraftMat = new THREE.MeshLambertMaterial({ color: KRAFT });
const soilMat = new THREE.MeshLambertMaterial({ color: SOIL });
const leafMat = new THREE.MeshLambertMaterial({ color: LEAF });
const coralMat = new THREE.MeshLambertMaterial({ color: CORAL });

const troughGeo = new THREE.BoxGeometry(0.52, 0.1, 0.13);
const soilGeo = new THREE.BoxGeometry(0.4, 0.035, 0.08);
const leafGeo = new THREE.BoxGeometry(0.11, 0.13, 0.07);
const bloomGeo = new THREE.BoxGeometry(0.07, 0.09, 0.05);

function isShellGlass(mesh) {
  const mat = mesh.material;
  if (!mat || Array.isArray(mat) || !mat.color || !mat.color.getHex) return false;
  if (mat === paneMat) return true;
  return mat.color.getHex() === SHELL_GLASS;
}

function paperBox(geo, mat, part = "sill-planter") {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = false;
  m.receiveShadow = false;
  m.userData.kind = "window-box";
  m.userData.part = part;
  m.userData.mode = "PAPER";
  return m;
}

/** +z / +x street face from the frame sibling offset, not from world sign. */
function paneOutward(pane) {
  const geo = pane.geometry && pane.geometry.parameters;
  const alongZ = !geo || geo.depth <= geo.width;
  let n = 1;
  const parent = pane.parent;
  const kids = parent && parent.children;
  if (kids) {
    const p = pane.position;
    for (let i = 0; i < kids.length; i++) {
      const sib = kids[i];
      if (sib === pane || !sib.isMesh) continue;
      const s = sib.position;
      if (alongZ) {
        if (Math.abs(s.x - p.x) < 0.05 && Math.abs(s.y - p.y) < 0.05 && Math.abs(s.z - p.z) > 0.01 && Math.abs(s.z - p.z) < 0.12) {
          n = Math.sign(p.z - s.z) || 1;
          break;
        }
      } else if (Math.abs(s.z - p.z) < 0.05 && Math.abs(s.y - p.y) < 0.05 && Math.abs(s.x - p.x) > 0.01 && Math.abs(s.x - p.x) < 0.12) {
        n = Math.sign(p.x - s.x) || 1;
        break;
      }
    }
  }
  return { alongZ, n };
}

function pickStreetPanes(panes) {
  const scored = [];
  for (let i = 0; i < panes.length; i++) {
    const pane = panes[i];
    const geo = pane.geometry && pane.geometry.parameters;
    if (!geo) continue;
    const { alongZ, n } = paneOutward(pane);
    const span = alongZ ? geo.width : geo.depth;
    let score = span;
    if (alongZ && n > 0) score += 10;
    else if (alongZ) score += 5;
    scored.push({ pane, score, alongZ, n });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 2);
}

/** Kraft boxes on the stone sill — trough, soil, leaf tuft, one extra bloom. */
function addSillPlanter(pane, alongZ, n) {
  const parent = pane.parent;
  if (!parent || !parent.add) return;
  const geo = pane.geometry && pane.geometry.parameters;
  if (!geo) return;
  const h = geo.height;
  const g = new THREE.Group();
  g.name = "window-box";
  g.userData.kind = "window-box";
  g.userData.part = "sill-planter";
  g.userData.mode = "PAPER";
  const trough = paperBox(troughGeo, kraftMat);
  const soil = paperBox(soilGeo, soilMat);
  soil.position.y = 0.055;
  const leaf = paperBox(leafGeo, leafMat);
  leaf.position.set(-0.08, 0.12, 0.01);
  const bloom = paperBox(bloomGeo, coralMat, "sill-bloom");
  bloom.position.set(0.09, 0.1, 0.01);
  g.add(trough, soil, leaf, bloom);
  const y = pane.position.y - h / 2 - 0.03;
  if (alongZ) {
    g.position.set(pane.position.x, y, pane.position.z + n * 0.08);
  } else {
    g.position.set(pane.position.x + n * 0.08, y, pane.position.z);
    g.rotation.y = Math.PI / 2;
  }
  parent.add(g);
}

/**
 * Swap shell glass to the shared warm pane. Two street panes get a
 * kraft sill planter. No new lights.
 * @param {THREE.Object3D | null | undefined} buildingMesh
 * @returns {THREE.Object3D | null | undefined}
 */
export function dressWindowLights(buildingMesh) {
  if (!buildingMesh || !buildingMesh.traverse) return buildingMesh;
  if (buildingMesh.userData && buildingMesh.userData.windowLights) return buildingMesh;

  const panes = [];
  buildingMesh.traverse((obj) => {
    if (!obj.isMesh || !isShellGlass(obj)) return;
    const old = obj.material;
    obj.material = paneMat;
    obj.castShadow = false;
    obj.userData.windowLight = true;
    obj.userData.mode = "PAPER";
    if (old && old !== paneMat && typeof old.dispose === "function") old.dispose();
    panes.push(obj);
  });

  const picked = pickStreetPanes(panes);
  for (let i = 0; i < picked.length; i++) {
    addSillPlanter(picked[i].pane, picked[i].alongZ, picked[i].n);
  }

  if (!buildingMesh.userData) buildingMesh.userData = {};
  buildingMesh.userData.windowLights = true;
  buildingMesh.userData.mode = buildingMesh.userData.mode || "PAPER";
  return buildingMesh;
}
