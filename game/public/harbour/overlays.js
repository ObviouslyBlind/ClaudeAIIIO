import * as THREE from "three";

/**
 * Top-right viewers. Each one changes what you see and what a tap hits.
 * PAPER / SIMULATED.
 *
 *   world      — walk. Buildings / stands. Land does not steal the click.
 *   lots       — boundary outlines. Click a $ tag or the lot dirt to buy.
 *   foot       — High / Moderate / Low ribbons on each named paved road.
 *   logistics  — vans and roadside crates. Tap the crate.
 *   minerals   — ore catalog exists; overlay paint is next.
 */

export const VIEWERS = {
  world: {
    id: "world",
    label: "World",
    hint: "Walk. Land does not steal taps. PAPER.",
  },
  lots: {
    id: "lots",
    label: "Lots",
    hint: "Lots on. Nearby $ bars. Walk to see more. Click Lots again to hide.",
  },
  foot: {
    id: "foot",
    label: "Foot traffic",
    hint: "Foot traffic: High / Moderate / Low on each named road. PAPER.",
  },
  logistics: {
    id: "logistics",
    label: "Logistics",
    hint: "Tap the roadside crate. Vans drop on the kerb. PAPER.",
  },
  minerals: {
    id: "minerals",
    label: "Minerals",
    hint: "Minerals: ore catalog is in. Overlay paint comes next. PAPER.",
  },
};

/** Clicking an already-on viewer (Lots, Foot, …) hides it and returns to World. */
export function toggleViewer(current, clicked) {
  if (!clicked) return "world";
  if (clicked === current && clicked !== "world") return "world";
  return clicked;
}

const BAND_COLOR = {
  green: 0x3dcc6a,
  yellow: 0xe2c04a,
  red: 0xc45a3a,
};

/** What the player reads. Red is Low, not danger. */
export const BAND_LEVEL = {
  green: "High",
  yellow: "Moderate",
  red: "Low",
};

export function footLevel(band) {
  return BAND_LEVEL[band] || "Low";
}

const GREEN_PORT_M = 420;
const YELLOW_PORT_M = 1100;

function roadMid(road) {
  const pts = road.points || [];
  if (!pts.length) return { x: 0, z: 0 };
  return pts[Math.floor(pts.length / 2)];
}

function bandForRoad(road, specOf) {
  if (road.band) return road.band;
  if (road.kind && road.kind !== "paved") return "red";
  const spec = specOf(road.island);
  if (!spec) return "red";
  const mid = roadMid(road);
  const d = Math.hypot(mid.x - spec.port.x, mid.z - spec.port.z);
  if (d < GREEN_PORT_M) return "green";
  if (d < YELLOW_PORT_M) return "yellow";
  return "red";
}

function ribbonStations(points) {
  const pts = [];
  for (const p of points) {
    if (pts.length && Math.hypot(p.x - pts[pts.length - 1].x, p.z - pts[pts.length - 1].z) < 0.4) continue;
    pts.push(p);
  }
  return pts;
}

/** Thick coloured ribbon on a paved road — not a 1px Line. */
function bandRibbon(spec, road, heightAt, color) {
  const pts = ribbonStations(road.points || []);
  if (pts.length < 2) return null;
  const half = 4.6;
  const n = pts.length;
  const positions = new Float32Array(n * 6);
  const indices = [];
  for (let i = 0; i < n; i++) {
    let dx;
    let dz;
    if (i === 0) {
      dx = pts[1].x - pts[0].x;
      dz = pts[1].z - pts[0].z;
    } else if (i === n - 1) {
      dx = pts[i].x - pts[i - 1].x;
      dz = pts[i].z - pts[i - 1].z;
    } else {
      dx = pts[i + 1].x - pts[i - 1].x;
      dz = pts[i + 1].z - pts[i - 1].z;
    }
    const tlen = Math.hypot(dx, dz) || 1;
    const rx = dz / tlen;
    const rz = -dx / tlen;
    const y = heightAt(spec, pts[i].x, pts[i].z) + 0.9;
    const o = i * 6;
    positions[o] = pts[i].x - rx * half;
    positions[o + 1] = y;
    positions[o + 2] = pts[i].z - rz * half;
    positions[o + 3] = pts[i].x + rx * half;
    positions[o + 4] = y;
    positions[o + 5] = pts[i].z + rz * half;
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      depthTest: false,
      transparent: true,
      opacity: 0.92,
    }),
  );
  mesh.renderOrder = 8;
  const name = road.name || "Harbour Rd";
  const band = road.band || "yellow";
  const level = footLevel(band);
  mesh.name = `foot-road:${road.island}:${name}`;
  mesh.userData.kind = "foot-road";
  mesh.userData.label = `${name} · ${level}`;
  mesh.userData.layer = "foot";
  mesh.userData.island = road.island;
  mesh.userData.roadName = name;
  mesh.userData.band = band;
  mesh.userData.level = level;
  mesh.userData.mode = "PAPER";
  return mesh;
}

function roadLabelSprite(text, x, y, z) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(10, 22, 26, 0.86)";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#f3efe4";
  ctx.font = "700 22px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }),
  );
  sprite.position.set(x, y + 4.2, z);
  sprite.scale.set(22, 5.5, 1);
  sprite.name = `foot-label:${text}`;
  sprite.userData.kind = "foot-label";
  sprite.userData.label = text;
  sprite.userData.layer = "foot";
  sprite.userData.mode = "PAPER";
  sprite.renderOrder = 6;
  return sprite;
}

function footRoads(play, map) {
  if (play && play.traffic && play.traffic.roads && play.traffic.roads.length) {
    return play.traffic.roads;
  }
  return ((map && map.roads) || []).filter((r) => r.kind === "paved" && r.points && r.points.length >= 2);
}

export function createOverlays({ scene, heightAt, specOf, getMap }) {
  const group = new THREE.Group();
  group.name = "map-overlays";
  group.userData.kind = "overlays";
  group.userData.label = "viewers";
  scene.add(group);
  let mode = "world";

  function clear() {
    while (group.children.length) {
      const ch = group.children[0];
      group.remove(ch);
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) {
        if (ch.material.map) ch.material.map.dispose();
        ch.material.dispose();
      }
    }
  }

  function drawFoot(play, map) {
    clear();
    const roads = footRoads(play, map);
    for (const road of roads) {
      const spec = specOf(road.island);
      if (!spec) continue;
      const band = bandForRoad(road, specOf);
      const colored = { ...road, band };
      const ribbon = bandRibbon(spec, colored, heightAt, BAND_COLOR[band] || BAND_COLOR.yellow);
      if (ribbon) group.add(ribbon);
      const mid = roadMid(road);
      const name = road.name || "Harbour Rd";
      const spr = roadLabelSprite(
        `${name} · ${footLevel(band)}`,
        mid.x,
        heightAt(spec, mid.x, mid.z),
        mid.z,
      );
      if (spr) group.add(spr);
    }
  }

  const ZONE_INK = {
    commercial: 0xe2c04a,
    residential: 0x6aa8d8,
    high_commercial: 0x888888,
    high_residential: 0x666666,
  };

  function drawLots(play, map) {
    clear();
    const plots = ((map && map.plots) || []).filter((p) => p.island === "south" && p.ring && p.ring.length >= 3);
    const pos = [];
    const col = [];
    for (const plot of plots) {
      const spec = specOf(plot.island);
      if (!spec) continue;
      const ink = new THREE.Color(
        plot.owner === "visitor" ? 0x5dcc6a : ZONE_INK[plot.zone] || ZONE_INK.commercial,
      );
      const ring = plot.ring;
      for (let i = 0; i < ring.length; i++) {
        const [ax, az] = ring[i];
        const [bx, bz] = ring[(i + 1) % ring.length];
        const ay = heightAt(spec, ax, az) + 0.85;
        const by = heightAt(spec, bx, bz) + 0.85;
        pos.push(ax, ay, az, bx, by, bz);
        col.push(ink.r, ink.g, ink.b, ink.r, ink.g, ink.b);
      }
    }
    if (!pos.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const lines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        depthTest: false,
        transparent: true,
        opacity: 0.95,
      }),
    );
    lines.renderOrder = 8;
    lines.name = "lot-outlines";
    lines.userData.kind = "lot-outline";
    lines.userData.label = "lot outlines";
    lines.userData.layer = "lots";
    lines.userData.mode = "PAPER";
    lines.userData.plotCount = plots.length;
    group.add(lines);
  }

  function drawLogistics(play) {
    clear();
    const deliveries = (play && play.deliveries) || [];
    for (const d of deliveries) {
      const x = d.drop ? d.drop.x : null;
      const z = d.drop ? d.drop.z : null;
      if (x == null || z == null) continue;
      const y = heightAt(specOf(d.island), x, z);
      const marker = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 1.8, 0.12, 16),
        new THREE.MeshLambertMaterial({
          color: 0xe2c04a,
          emissive: 0xe2c04a,
          emissiveIntensity: 0.4,
        }),
      );
      marker.position.set(x, y + 0.12, z);
      marker.name = `logistics-pad:${d.id}`;
      marker.userData.kind = "logistics-pad";
      marker.userData.label = "crate drop";
      marker.userData.layer = "logistics";
      marker.userData.deliveryId = d.id;
      marker.userData.mode = "PAPER";
      group.add(marker);
    }
  }

  return {
    setMode(next, play, map) {
      mode = next;
      const board = map || (getMap && getMap());
      if (mode === "foot") drawFoot(play, board);
      else if (mode === "lots") drawLots(play, board);
      else if (mode === "logistics") drawLogistics(play);
      else clear();
    },
    refresh(play, map) {
      const board = map || (getMap && getMap());
      if (mode === "foot") drawFoot(play, board);
      else if (mode === "lots") drawLots(play, board);
      else if (mode === "logistics") drawLogistics(play);
    },
    get mode() {
      return mode;
    },
    get group() {
      return group;
    },
  };
}
