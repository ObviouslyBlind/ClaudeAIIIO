/**
 * Paint sky cyan and look at the north ferry berth before the rest of the
 * harbour graph loads. HUD <script type="module"> tags plus main.js static
 * imports otherwise block any WebGL frame past a 25s critic timeout
 * (`/?g=ferry31`–`ferry33` FAIL: body teal #0e4a55, status still Loading).
 *
 * BERTH_Z must stay in sync with ferry.js HOME_Z.
 */
import * as THREE from "three";

export const SKY_HEX = 0x7ec8d4;
export const BERTH_Z = -6835;
export const FOG_NEAR_M = 6000;
export const FOG_FAR_M = 42000;
export const CAMERA_FAR_M = 52000;
export const CAM = { x: 18, y: 22, z: -6888 };

export function paintFirstFrame(canvas) {
  if (!canvas) throw new Error("no canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_HEX);
  scene.fog = new THREE.Fog(SKY_HEX, FOG_NEAR_M, FOG_FAR_M);
  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.4,
    CAMERA_FAR_M,
  );
  camera.position.set(CAM.x, CAM.y, CAM.z);
  camera.lookAt(0, 1.2, BERTH_Z);
  renderer.render(scene, camera);
  return { renderer, scene, camera };
}

function bootFirstFrame() {
  const canvas = document.getElementById("c");
  if (!canvas) return;
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = "North port · PAPER";
  try {
    globalThis.__harbourFirst = paintFirstFrame(canvas);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (statusEl) statusEl.textContent = "BOOT FAIL: " + msg;
    console.error(err);
  }
  import("./main.js").catch((err) => {
    const msg = err && err.message ? err.message : String(err);
    if (statusEl) statusEl.textContent = "BOOT FAIL: " + msg;
    console.error(err);
  });
}

if (typeof document !== "undefined") bootFirstFrame();
