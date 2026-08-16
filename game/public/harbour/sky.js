import * as THREE from "three";

/** Same cyan as spawn `scene.fog` / `scene.background` (0x7ec8d4). */
const HORIZON = 0x7ec8d4;
/** Deeper daylight blue at zenith — no textures, no Earth, no cloud photos. */
const ZENITH = 0x3f96c8;
/** Inside CAMERA_FAR_M (52000) even from the far island rim (~12 km from origin). */
const SKY_RADIUS_M = 36000;

/**
 * Cheap gradient dome for Swiftshader: low-seg sphere, vertex colours,
 * unlit, no fog on the mesh (else linear fog paints the whole sky the
 * horizon colour and the gradient dies). Horizon verts match fog so the
 * seam is not a hard cyan wall. Does not touch fog near/far.
 */
export function makeSky(scene) {
  const horizon = new THREE.Color(HORIZON);
  scene.background = scene.background || horizon.clone();

  const geo = new THREE.SphereGeometry(SKY_RADIUS_M, 16, 10);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color(ZENITH);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ny = pos.getY(i) / SKY_RADIUS_M;
    const t = Math.max(0, ny);
    const k = t * t;
    c.copy(horizon).lerp(zenith, k);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
    depthTest: false,
  });
  const dome = new THREE.Mesh(geo, mat);
  dome.name = "sky-dome";
  dome.userData.kind = "sky";
  dome.renderOrder = -1000;
  dome.frustumCulled = false;
  scene.add(dome);
  return dome;
}
