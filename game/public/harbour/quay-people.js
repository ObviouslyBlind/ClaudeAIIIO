/**
 * Outdoor quay people from PAPER presence. Not pedestrians.js. Not indoor broadcast.
 */

import * as THREE from "three";

function personMesh(name) {
  const g = new THREE.Group();
  g.name = "quay-person";
  g.userData.kind = "quay-person";
  g.userData.label = name;
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.16 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.28), mat(0x4a6a58));
  torso.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat(0xe8d4b8));
  head.position.y = 1.55;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.72, 0.22), mat(0x2a2e32));
  legs.position.y = 0.36;
  g.add(torso, head, legs);
  return g;
}

export function mountQuayPeople({ scene, heightAt, specOf, getPos }) {
  const group = new THREE.Group();
  group.name = "quay-people";
  if (scene) scene.add(group);
  const meshes = new Map();
  let timer = 0;

  function sync(actors) {
    const seen = new Set();
    for (const a of actors || []) {
      if (!a || !a.id) continue;
      seen.add(a.id);
      let mesh = meshes.get(a.id);
      if (!mesh) {
        mesh = personMesh(a.name || "Walker");
        meshes.set(a.id, mesh);
        group.add(mesh);
      }
      const spec = specOf && specOf(a.island);
      const y = typeof heightAt === "function" && spec ? heightAt(spec, a.x, a.z) : 0;
      mesh.position.set(a.x, y, a.z);
      mesh.visible = true;
    }
    for (const [id, mesh] of meshes) {
      if (!seen.has(id)) mesh.visible = false;
    }
  }

  async function refresh() {
    try {
      const pos = typeof getPos === "function" ? getPos() : null;
      const x = pos && Number.isFinite(pos.x) ? pos.x : "";
      const z = pos && Number.isFinite(pos.z) ? pos.z : "";
      const url =
        Number.isFinite(x) && Number.isFinite(z)
          ? `/api/presence?x=${encodeURIComponent(x)}&z=${encodeURIComponent(z)}`
          : "/api/presence";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      sync(data && data.actors);
    } catch {
      /* keep last */
    }
  }

  refresh();
  timer = setInterval(refresh, 1000);

  return {
    group,
    stop() {
      if (timer) clearInterval(timer);
      timer = 0;
    },
  };
}
