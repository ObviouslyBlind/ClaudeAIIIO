import * as THREE from "three";

/** Green tap-to-walk polyline + destination ring. No per-frame allocations after setup. */

const GREEN = 0x3dcc6a;
const MAX_VERTS = 64;

export function createWalkPath(scene) {
  const positions = new Float32Array(MAX_VERTS * 3);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setDrawRange(0, 0);
  const line = new THREE.Line(
    geom,
    new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.95 }),
  );
  line.frustumCulled = false;
  line.visible = false;
  line.userData.kind = "walk-path";
  scene.add(line);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.62, 28),
    new THREE.MeshBasicMaterial({
      color: GREEN,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.frustumCulled = false;
  ring.userData.kind = "walk-dest";
  scene.add(ring);

  function writeSegment(from, to, yFrom, yTo) {
    positions[0] = from.x;
    positions[1] = yFrom + 0.12;
    positions[2] = from.z;
    positions[3] = to.x;
    positions[4] = yTo + 0.12;
    positions[5] = to.z;
    geom.setDrawRange(0, 2);
    geom.attributes.position.needsUpdate = true;
    geom.computeBoundingSphere();
    ring.position.set(to.x, yTo + 0.08, to.z);
  }

  function writePath(from, waypoints, heightAt) {
    const hOf = typeof heightAt === "function" ? heightAt : () => 0;
    const pts = [{ x: from.x, z: from.z, y: (from.y != null ? from.y : hOf(from.x, from.z)) }];
    const rest = Array.isArray(waypoints) ? waypoints : [];
    for (const w of rest) {
      if (!w) continue;
      pts.push({ x: w.x, z: w.z, y: hOf(w.x, w.z) });
    }
    const n = Math.min(pts.length, MAX_VERTS);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y + 0.12;
      positions[i * 3 + 2] = p.z;
    }
    geom.setDrawRange(0, n);
    geom.attributes.position.needsUpdate = true;
    geom.computeBoundingSphere();
    const last = pts[n - 1];
    if (last) ring.position.set(last.x, last.y + 0.08, last.z);
  }

  return {
    show(from, to, yFrom, yTo) {
      writeSegment(from, to, yFrom, yTo);
      line.visible = true;
      ring.visible = true;
    },
    showPath(from, waypoints, heightAt) {
      writePath(from, waypoints, heightAt);
      line.visible = true;
      ring.visible = true;
    },
    hide() {
      line.visible = false;
      ring.visible = false;
    },
    get visible() {
      return line.visible;
    },
    get destVisible() {
      return ring.visible;
    },
  };
}
