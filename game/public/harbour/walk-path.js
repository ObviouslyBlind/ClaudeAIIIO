import * as THREE from "three";

/**
 * Lime tap-to-walk ribbon + dest pin.
 * Unlit so it does not disappear into south grass (0x87bb60).
 * Index buffer is allocated once.
 */

export const WALK_MARK = 0xd8ff2a;
/** Metres above dirt. Tarmac sits ~0.23 m up; this keeps the dest disc on the road. */
export const DEST_LIFT_M = 0.55;
const EDGE = 0x143808;
const MAX_VERTS = 64;
const HALF_W = 0.34;

export function createWalkPath(scene) {
  const positions = new Float32Array(MAX_VERTS * 2 * 3);
  const indexArr = new Uint16Array((MAX_VERTS - 1) * 6);
  for (let i = 0; i < MAX_VERTS - 1; i++) {
    const a = i * 2;
    const o = i * 6;
    indexArr[o] = a;
    indexArr[o + 1] = a + 1;
    indexArr[o + 2] = a + 2;
    indexArr[o + 3] = a + 1;
    indexArr[o + 4] = a + 3;
    indexArr[o + 5] = a + 2;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setIndex(new THREE.BufferAttribute(indexArr, 1));
  geom.setDrawRange(0, 0);
  const ribbon = new THREE.Mesh(
    geom,
    new THREE.MeshBasicMaterial({
      color: WALK_MARK,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ribbon.frustumCulled = false;
  ribbon.visible = false;
  ribbon.renderOrder = 2;
  ribbon.userData.kind = "walk-path";
  scene.add(ribbon);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 28),
    new THREE.MeshBasicMaterial({
      color: WALK_MARK,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.visible = false;
  disc.frustumCulled = false;
  disc.renderOrder = 3;
  disc.userData.kind = "walk-dest";
  scene.add(disc);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.35, 28),
    new THREE.MeshBasicMaterial({
      color: EDGE,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.frustumCulled = false;
  ring.renderOrder = 3;
  ring.userData.kind = "walk-dest-edge";
  scene.add(ring);

  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8),
    new THREE.MeshBasicMaterial({ color: WALK_MARK }),
  );
  pin.visible = false;
  pin.frustumCulled = false;
  pin.userData.kind = "walk-pin";
  scene.add(pin);

  function placeDest(x, y, z) {
    disc.position.set(x, y + DEST_LIFT_M, z);
    ring.position.set(x, y + DEST_LIFT_M + 0.02, z);
    pin.position.set(x, y + DEST_LIFT_M + 0.9, z);
  }

  function writeRibbon(pts) {
    const n = Math.min(pts.length, MAX_VERTS);
    if (n < 2) {
      geom.setDrawRange(0, 0);
      return;
    }
    let o = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(n - 1, i + 1)];
      let dx = next.x - prev.x;
      let dz = next.z - prev.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      const nx = -dz * HALF_W;
      const nz = dx * HALF_W;
      const y = p.y + DEST_LIFT_M;
      positions[o++] = p.x + nx;
      positions[o++] = y;
      positions[o++] = p.z + nz;
      positions[o++] = p.x - nx;
      positions[o++] = y;
      positions[o++] = p.z - nz;
    }
    geom.setDrawRange(0, (n - 1) * 6);
    geom.attributes.position.needsUpdate = true;
    geom.computeBoundingSphere();
  }

  function pointsOf(from, waypoints, heightAt) {
    const hOf = typeof heightAt === "function" ? heightAt : () => 0;
    const pts = [
      {
        x: from.x,
        z: from.z,
        y: Number.isFinite(from.y) ? from.y - 1.15 : hOf(from.x, from.z),
      },
    ];
    const rest = Array.isArray(waypoints) ? waypoints : [];
    for (const w of rest) {
      if (!w) continue;
      pts.push({ x: w.x, z: w.z, y: hOf(w.x, w.z) });
    }
    return pts;
  }

  function showAll(from, waypoints, heightAt) {
    const pts = pointsOf(from, waypoints, heightAt);
    writeRibbon(pts);
    const last = pts[pts.length - 1];
    if (last) placeDest(last.x, last.y, last.z);
    ribbon.visible = pts.length >= 2;
    disc.visible = true;
    ring.visible = true;
    pin.visible = true;
  }

  return {
    show(from, to, yFrom, yTo) {
      writeRibbon([
        { x: from.x, z: from.z, y: yFrom },
        { x: to.x, z: to.z, y: yTo },
      ]);
      placeDest(to.x, yTo, to.z);
      ribbon.visible = true;
      disc.visible = true;
      ring.visible = true;
      pin.visible = true;
    },
    showPath(from, waypoints, heightAt) {
      showAll(from, waypoints, heightAt);
    },
    /** Keep the dest disc after arrival; hide the remaining ribbon. */
    showDest(x, z, y) {
      placeDest(x, y, z);
      ribbon.visible = false;
      disc.visible = true;
      ring.visible = true;
      pin.visible = true;
    },
    hide() {
      ribbon.visible = false;
      disc.visible = false;
      ring.visible = false;
      pin.visible = false;
    },
    get visible() {
      return ribbon.visible || disc.visible;
    },
    get destVisible() {
      return disc.visible;
    },
  };
}
