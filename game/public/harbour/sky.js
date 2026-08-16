import * as THREE from "three";

/** Same cyan as spawn `scene.fog` / `scene.background` (0x7ec8d4). */
const HORIZON = 0x7ec8d4;
/** Slightly deeper daylight blue at zenith — same cyan family as 0x7ec8d4, not a CSS wall. */
const ZENITH = 0x348cbe;
/** Original PAPER kraft (signs, lamps). A little of this warms the cyan haze. */
const PAPER = 0xefe4c8;
/** Mix of original cyan toward PAPER — slight, not a sunset, not a new hex. */
const HAZE_PAPER = 0.22;
/** Inside CAMERA_FAR_M (52000) even from the far island rim (~12 km from origin). */
const SKY_RADIUS_M = 36000;

/**
 * Cheap gradient dome for Swiftshader: low-seg sphere, vertex colours,
 * unlit, no fog on the mesh (else linear fog paints the whole sky the
 * horizon colour and the gradient dies). Horizon verts match the warm
 * haze so the seam is not a hard cyan wall. Does not touch fog near/far.
 * PAPER haze so the channel does not read as empty CSS teal (#0e4a55).
 */
export function makeSky(scene) {
  const horizon = new THREE.Color(HORIZON);
  const paper = new THREE.Color(PAPER);
  const haze = horizon.clone().lerp(paper, HAZE_PAPER);
  scene.background = haze.clone();
  if (scene.fog) scene.fog.color.copy(haze);

  const geo = new THREE.SphereGeometry(SKY_RADIUS_M, 16, 10);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color(ZENITH);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ny = pos.getY(i) / SKY_RADIUS_M;
    const t = Math.max(0, ny);
    const k = t * t;
    c.copy(haze).lerp(zenith, k);
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
  dome.userData.mode = "PAPER";
  dome.renderOrder = -1000;
  dome.frustumCulled = false;
  scene.add(dome);
  return dome;
}
