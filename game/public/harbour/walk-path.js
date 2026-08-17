import * as THREE from "three";

/** Green tap-to-walk line. One Line, no per-frame allocations after setup. */

const GREEN = 0x3dcc6a;

export function createWalkPath(scene) {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(6);
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const line = new THREE.Line(
    geom,
    new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.92 }),
  );
  line.frustumCulled = false;
  line.visible = false;
  line.userData.kind = "walk-path";
  scene.add(line);

  function write(from, to, yFrom, yTo) {
    positions[0] = from.x;
    positions[1] = yFrom + 0.12;
    positions[2] = from.z;
    positions[3] = to.x;
    positions[4] = yTo + 0.12;
    positions[5] = to.z;
    geom.attributes.position.needsUpdate = true;
    geom.computeBoundingSphere();
  }

  return {
    show(from, to, yFrom, yTo) {
      write(from, to, yFrom, yTo);
      line.visible = true;
    },
    hide() {
      line.visible = false;
    },
    get visible() {
      return line.visible;
    },
  };
}
