import * as THREE from "three";

const BAND_COLOR = {
  green: 0x3dcc6a,
  yellow: 0xe2c04a,
  red: 0xc45a3a,
};

/**
 * World / foot-traffic / logistics / minerals overlays.
 * Cheap Line objects, rebuilt only when the overlay changes.
 */

function lineOf(points, color, yLift) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    pos[i * 3] = points[i].x;
    pos[i * 3 + 1] = (points[i].y ?? 0) + yLift;
    pos[i * 3 + 2] = points[i].z;
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const line = new THREE.Line(
    g,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }),
  );
  line.frustumCulled = false;
  return line;
}

export function createOverlays({ scene, heightAt, specOf }) {
  const group = new THREE.Group();
  group.name = "map-overlays";
  scene.add(group);
  let mode = "world";

  function clear() {
    while (group.children.length) {
      const ch = group.children[0];
      group.remove(ch);
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) ch.material.dispose();
    }
  }

  function drawFoot(play) {
    clear();
    const roads = (play && play.traffic && play.traffic.roads) || [];
    for (const road of roads) {
      const pts = (road.points || []).map((p) => ({
        x: p.x,
        y: heightAt(specOf(road.island), p.x, p.z),
        z: p.z,
      }));
      if (pts.length < 2) continue;
      const color = BAND_COLOR[road.band] || BAND_COLOR.yellow;
      group.add(lineOf(pts, color, 0.35));
    }
  }

  function drawLogistics(play) {
    clear();
    const deliveries = (play && play.deliveries) || [];
    for (const d of deliveries) {
      const lease = ((play && play.leases) || []).find((l) => l.id === d.plotId);
      if (!lease) continue;
      const y = heightAt(specOf(d.island), lease.x, lease.z);
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.2, 4),
        new THREE.MeshLambertMaterial({ color: 0xe2c04a }),
      );
      marker.position.set(lease.x, y + 0.2, lease.z);
      marker.userData.kind = "logistics-pad";
      group.add(marker);
    }
  }

  return {
    setMode(next, play) {
      mode = next;
      if (mode === "foot") drawFoot(play);
      else if (mode === "logistics") drawLogistics(play);
      else clear();
    },
    refresh(play) {
      if (mode === "foot") drawFoot(play);
      else if (mode === "logistics") drawLogistics(play);
    },
    get mode() {
      return mode;
    },
  };
}
