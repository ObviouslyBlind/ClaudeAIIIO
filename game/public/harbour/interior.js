import * as THREE from "three";

/** Player eye-height on the downstairs floor, metres. */
export const DOWNSTAIRS_Y = 1.15;
/** Player eye-height on the upstairs floor, metres. */
export const UPSTAIRS_Y = 3.85;
/** Interior room half-extents, metres. */
export const ROOM = { hw: 3.6, hd: 3.1 };

/**
 * Owned + developed only. NPC land, vacant lots, and unset use are SKIP.
 * @param {{ owner?: string | null, use?: string | null } | null | undefined} plot
 */
export function canEnter(plot) {
  if (!plot) return false;
  return plot.owner === "visitor" && Boolean(plot.use);
}

function box(w, h, d, color, x, y, z, kind, extra = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.kind = kind;
  Object.assign(m.userData, extra);
  return m;
}

/**
 * Placeholder PAPER interior: downstairs room, a stair flight, upstairs room.
 * Boxes only. No catalog meshes.
 */
export function makeInteriorScene() {
  const group = new THREE.Group();
  group.name = "interior";
  group.userData.kind = "interior";
  group.userData.mode = "PAPER";
  group.userData.provenance = "SIMULATED";

  const down = new THREE.Group();
  down.name = "downstairs";
  down.userData.kind = "downstairs";
  down.add(box(8.2, 0.16, 7.2, 0xc4a574, 0, 0.08, 0, "interior-floor", { level: "downstairs" }));
  down.add(box(8.2, 2.7, 0.16, 0xe8dcc8, 0, 1.43, -3.52, "interior-wall"));
  down.add(box(3.1, 2.7, 0.16, 0xe8dcc8, -2.55, 1.43, 3.52, "interior-wall"));
  down.add(box(3.1, 2.7, 0.16, 0xe8dcc8, 2.55, 1.43, 3.52, "interior-wall"));
  down.add(box(8.2, 0.7, 0.16, 0xe8dcc8, 0, 2.43, 3.52, "interior-wall"));
  down.add(box(0.16, 2.7, 7.2, 0xe4d4b8, -4.1, 1.43, 0, "interior-wall"));
  down.add(box(0.16, 2.7, 7.2, 0xe4d4b8, 4.1, 1.43, 0, "interior-wall"));
  down.add(box(1.4, 0.72, 0.9, 0x8a6238, -1.1, 0.52, -0.4, "interior-prop"));
  down.add(box(0.45, 0.85, 0.45, 0x6e4a32, -1.8, 0.5, 0.2, "interior-prop"));
  down.add(box(0.45, 0.85, 0.45, 0x6e4a32, -0.4, 0.5, 0.2, "interior-prop"));
  down.add(box(0.7, 0.55, 0.7, 0x7a5230, 2.4, 0.4, -2.2, "interior-prop"));
  const plaque = box(1.6, 0.55, 0.06, 0xf3efe4, 0, 1.85, 3.42, "interior-paper");
  plaque.userData.mode = "PAPER";
  down.add(plaque);
  const door = box(1.15, 2.05, 0.1, 0x4a3220, 0, 1.1, 3.58, "exit");
  down.add(door);
  group.add(down);

  const stairs = new THREE.Group();
  stairs.name = "stairs";
  stairs.userData.kind = "stairs";
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    stairs.add(
      box(1.35, 0.18, 0.42, 0x9a7a52, 3.15, 0.18 + t * 2.55, -2.35 + i * 0.38, "stairs", {
        level: t < 0.5 ? "downstairs" : "upstairs",
      }),
    );
  }
  group.add(stairs);

  const up = new THREE.Group();
  up.name = "upstairs";
  up.userData.kind = "upstairs";
  up.add(box(8.2, 0.16, 7.2, 0xb7a078, 0, 2.78, 0, "interior-floor", { level: "upstairs" }));
  up.add(box(8.2, 2.2, 0.16, 0xf0e6d4, 0, 3.96, -3.52, "interior-wall"));
  up.add(box(8.2, 2.2, 0.16, 0xf0e6d4, 0, 3.96, 3.52, "interior-wall"));
  up.add(box(0.16, 2.2, 7.2, 0xeadcc4, -4.1, 3.96, 0, "interior-wall"));
  up.add(box(0.16, 2.2, 7.2, 0xeadcc4, 4.1, 3.96, 0, "interior-wall"));
  up.add(box(2.1, 0.35, 1.15, 0x6e4a32, -1.6, 3.08, -1.6, "interior-prop"));
  up.add(box(0.9, 0.55, 0.7, 0xc45c3a, -1.6, 3.53, -1.6, "interior-prop"));
  up.add(box(0.8, 0.7, 0.55, 0x8a6238, 1.8, 3.25, 2.0, "interior-prop"));
  const upPlaque = box(1.4, 0.45, 0.06, 0xf3efe4, -2.2, 4.15, -3.42, "interior-paper");
  upPlaque.userData.mode = "PAPER";
  up.add(upPlaque);
  group.add(up);

  const lamp = new THREE.PointLight(0xfff1d0, 1.15, 18, 2);
  lamp.position.set(0, 2.4, 0);
  group.add(lamp);

  group.visible = false;
  return group;
}

/**
 * Reparent harbour meshes into a group so enter/exit can hide them
 * without deleting the world. Lights and `keep` stay on the scene.
 */
export function wrapHarbourWorld(scene, { keep = [] } = {}) {
  const harbour = new THREE.Group();
  harbour.name = "harbour";
  harbour.userData.kind = "harbour";
  const keepSet = new Set(keep);
  const moving = [];
  for (const child of scene.children) {
    if (keepSet.has(child)) continue;
    if (child.isLight) continue;
    if (child.userData?.kind === "interior") continue;
    moving.push(child);
  }
  for (const child of moving) harbour.add(child);
  scene.add(harbour);
  return harbour;
}

export function objectWithKind(obj, kind) {
  let o = obj;
  while (o) {
    if (o.userData?.kind === kind) return o;
    o = o.parent;
  }
  return null;
}

function clampRoom(x, z) {
  return {
    x: Math.max(-ROOM.hw, Math.min(ROOM.hw, x)),
    z: Math.max(-ROOM.hd, Math.min(ROOM.hd, z)),
  };
}

/**
 * Enter/exit controller. Hides `harbourGroup`; never removes it from the scene.
 */
export function createInterior({ scene, player, setStatus, heightAt, specOf }) {
  const group = makeInteriorScene();
  scene.add(group);

  let harbourGroup = null;
  let inside = false;
  let plot = null;
  let floor = "downstairs";
  let walking = false;
  const walkTarget = new THREE.Vector3();
  const camTmp = new THREE.Vector3();
  let savedFog = null;
  let savedBg = null;
  const hiddenExtras = [];

  function setHarbour(g) {
    harbourGroup = g;
  }

  function isInside() {
    return inside;
  }

  function currentFloor() {
    return floor;
  }

  function currentPlot() {
    return plot;
  }

  function placePlayer(level) {
    floor = level;
    const y = level === "upstairs" ? UPSTAIRS_Y : DOWNSTAIRS_Y;
    if (level === "upstairs") player.position.set(-1.2, y, -0.4);
    else player.position.set(0, y, 1.6);
    walking = false;
  }

  function enter(p) {
    if (!canEnter(p)) return false;
    plot = p;
    inside = true;
    if (harbourGroup) harbourGroup.visible = false;
    hiddenExtras.length = 0;
    for (const child of scene.children) {
      if (child === group || child === player) continue;
      if (child.isLight) continue;
      if (child === harbourGroup) continue;
      if (!child.visible) continue;
      child.visible = false;
      hiddenExtras.push(child);
    }
    group.visible = true;
    savedFog = scene.fog;
    savedBg = scene.background;
    scene.fog = null;
    scene.background = new THREE.Color(0x2c241c);
    placePlayer("downstairs");
    if (setStatus) {
      setStatus("Inside downstairs (PAPER). Tap stairs for upstairs. Exit returns to your plot.");
    }
    return true;
  }

  function exit() {
    if (!inside) return null;
    const left = plot;
    inside = false;
    group.visible = false;
    if (harbourGroup) harbourGroup.visible = true;
    for (const child of hiddenExtras) child.visible = true;
    hiddenExtras.length = 0;
    if (savedFog !== null) scene.fog = savedFog;
    if (savedBg !== null) scene.background = savedBg;
    savedFog = null;
    savedBg = null;
    walking = false;
    if (left && player) {
      const spec = specOf ? specOf(left.island) : null;
      const y = heightAt && spec ? heightAt(spec, left.x, left.z) + 1.15 : left.y ?? 1.15;
      player.position.set(left.x, y, left.z);
    }
    plot = null;
    floor = "downstairs";
    if (setStatus) setStatus("Back at your plot (PAPER).");
    return left;
  }

  function goStairs() {
    if (floor === "downstairs") {
      placePlayer("upstairs");
      if (setStatus) setStatus("Upstairs (PAPER). Tap stairs to go down.");
    } else {
      placePlayer("downstairs");
      if (setStatus) setStatus("Downstairs (PAPER). Tap the door or Exit to leave.");
    }
  }

  function handleRay(raycaster) {
    if (!inside) return false;
    const hits = raycaster.intersectObjects(group.children, true);
    if (!hits.length) return true;
    const stair = hits.find((h) => objectWithKind(h.object, "stairs"));
    if (stair) {
      goStairs();
      return true;
    }
    const door = hits.find((h) => objectWithKind(h.object, "exit"));
    if (door) {
      exit();
      return true;
    }
    const floorHit = hits.find((h) => objectWithKind(h.object, "interior-floor"));
    if (floorHit) {
      const level = objectWithKind(floorHit.object, "interior-floor")?.userData.level || floor;
      const c = clampRoom(floorHit.point.x, floorHit.point.z);
      const y = level === "upstairs" ? UPSTAIRS_Y : DOWNSTAIRS_Y;
      floor = level;
      walkTarget.set(c.x, y, c.z);
      walking = true;
    }
    return true;
  }

  function tick(dt) {
    if (!inside || !walking) return;
    const dx = walkTarget.x - player.position.x;
    const dz = walkTarget.z - player.position.z;
    const dist = Math.hypot(dx, dz);
    const step = 8 * dt;
    if (dist <= step) {
      player.position.copy(walkTarget);
      walking = false;
    } else {
      player.position.x += (dx / dist) * step;
      player.position.z += (dz / dist) * step;
    }
  }

  function updateCamera(camera, dt) {
    if (!inside) return false;
    camTmp.set(player.position.x + 0.4, player.position.y + 3.1, player.position.z + 6.2);
    camera.position.lerp(camTmp, 1 - Math.pow(0.001, dt));
    camera.lookAt(player.position.x, player.position.y + 0.45, player.position.z);
    return true;
  }

  return {
    group,
    setHarbour,
    isInside,
    currentFloor,
    currentPlot,
    enter,
    exit,
    goStairs,
    handleRay,
    tick,
    updateCamera,
  };
}
