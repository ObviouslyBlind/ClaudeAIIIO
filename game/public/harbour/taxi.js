import * as THREE from "three";

/** Metres. On the carriageway (paved width 6.2). */
const ON_PAVED = 6.5;
/** Metres. Player can board from the verge. */
const NEAR_PAVED = 12;
/** Metres. Dirt-track hit, not a taxi destination. */
const ON_DIRT = 5;
const SPEED = 42;
const TAXI_Y = 0.04;
/** Hailed cab leaves if nobody boards. */
export const TAXI_WAIT_MS = 60_000;

/**
 * Closest point on a polyline in XZ. Used to stay on paved points only.
 */
export function projectOnPolyline(points, x, z) {
  let best = { x, z, i: 0, t: 0, dist: Infinity, along: 0 };
  let acc = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len2 = vx * vx + vz * vz || 1;
    const len = Math.sqrt(len2);
    let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + vx * t;
    const pz = a.z + vz * t;
    const dist = Math.hypot(x - px, z - pz);
    if (dist < best.dist) {
      best = { x: px, z: pz, i, t, dist, along: acc + t * len };
    }
    acc += len;
  }
  return best;
}

function compactPath(path) {
  const out = [];
  for (const p of path) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.z - last.z) > 0.25) out.push(p);
  }
  return out;
}

/** Follow paved vertices from a projected start to a projected end. Never dirt. */
export function pathAlongPolyline(points, fromX, fromZ, toX, toZ) {
  if (!points || points.length < 2) return [];
  const from = projectOnPolyline(points, fromX, fromZ);
  const to = projectOnPolyline(points, toX, toZ);
  const path = [{ x: from.x, z: from.z }];
  if (from.i < to.i || (from.i === to.i && from.t <= to.t)) {
    for (let i = from.i + 1; i <= to.i; i++) path.push({ x: points[i].x, z: points[i].z });
  } else {
    for (let i = from.i; i > to.i; i--) path.push({ x: points[i].x, z: points[i].z });
  }
  path.push({ x: to.x, z: to.z });
  return compactPath(path);
}

/**
 * True when a hailed cab (coming / waiting) has waited long enough with no board.
 * Pass nowMs — do not sleep in tests.
 */
export function taxiWaitExpired(mode, startedAtMs, nowMs, limitMs = TAXI_WAIT_MS) {
  if (mode !== "coming" && mode !== "waiting") return false;
  if (startedAtMs == null) return false;
  return nowMs - startedAtMs >= limitMs;
}

/** Top-down island frame. +Z is south, so canvas Y grows south (north is up). */
export function islandMapBounds(spec, pad = 1.08) {
  return {
    minX: spec.cx - spec.rx * pad,
    maxX: spec.cx + spec.rx * pad,
    minZ: spec.cz - spec.rz * pad,
    maxZ: spec.cz + spec.rz * pad,
  };
}

export function worldToMapPx(bounds, x, z, w, h) {
  return {
    sx: ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * w,
    sy: ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * h,
  };
}

export function mapPxToWorld(bounds, sx, sy, w, h) {
  return {
    x: bounds.minX + (sx / w) * (bounds.maxX - bounds.minX),
    z: bounds.minZ + (sy / h) * (bounds.maxZ - bounds.minZ),
  };
}

/** Rough map tap → closest paved point. Dirt is never a destination. */
export function pavedDestFromMapClick(roads, islandId, spec, sx, sy, w, h) {
  const world = mapPxToWorld(islandMapBounds(spec), sx, sy, w, h);
  let best = null;
  for (const r of roads) {
    if (r.kind !== "paved" || r.roundabout || r.island !== islandId || !r.points || r.points.length < 2) continue;
    const proj = projectOnPolyline(r.points, world.x, world.z);
    if (!best || proj.dist < best.proj.dist) best = { road: r, proj };
  }
  return best;
}

/** Map tap → a named stop point, or null when the tap is not near one. */
export function stopFromMapClick(stops, spec, sx, sy, w, h, pickPx = 26) {
  const bounds = islandMapBounds(spec);
  let best = null;
  for (const s of stops || []) {
    const m = worldToMapPx(bounds, s.x, s.z, w, h);
    const d = Math.hypot(m.sx - sx, m.sy - sy);
    if (d <= pickPx && (!best || d < best.d)) best = { stop: s, d };
  }
  return best ? best.stop : null;
}

/**
 * Route across the paved network. Branch roads carry `joins` (their junction
 * with the trunk), so any trip is: branch → junction → trunk → junction →
 * branch. Same-road trips stay on that road. Data-driven: a new street on the
 * map routes with no taxi changes.
 */
export function routeAcrossPaved(roads, islandId, fromX, fromZ, toX, toZ) {
  const paved = (roads || []).filter(
    (r) => r.kind === "paved" && !r.roundabout && r.island === islandId && r.points && r.points.length >= 2,
  );
  if (!paved.length) return null;
  const trunk = paved.find((r) => !r.joins) || paved[0];

  const nearest = (x, z) => {
    let best = null;
    for (const r of paved) {
      const proj = projectOnPolyline(r.points, x, z);
      if (!best || proj.dist < best.proj.dist) best = { road: r, proj };
    }
    return best;
  };
  const from = nearest(fromX, fromZ);
  const to = nearest(toX, toZ);
  if (!from || !to) return null;

  if (from.road === to.road) {
    const pts = pathAlongPolyline(from.road.points, from.proj.x, from.proj.z, to.proj.x, to.proj.z);
    return { points: pts, road: to.road };
  }

  const legs = [];
  let trunkStart = { x: from.proj.x, z: from.proj.z };
  if (from.road !== trunk) {
    legs.push(
      pathAlongPolyline(from.road.points, from.proj.x, from.proj.z, from.road.joins.x, from.road.joins.z),
    );
    trunkStart = from.road.joins;
  }
  let trunkEnd = { x: to.proj.x, z: to.proj.z };
  if (to.road !== trunk) trunkEnd = to.road.joins;
  legs.push(pathAlongPolyline(trunk.points, trunkStart.x, trunkStart.z, trunkEnd.x, trunkEnd.z));
  if (to.road !== trunk) {
    legs.push(pathAlongPolyline(to.road.points, to.road.joins.x, to.road.joins.z, to.proj.x, to.proj.z));
  }
  const points = [];
  for (const leg of legs) {
    for (const p of leg) {
      const last = points[points.length - 1];
      if (!last || Math.hypot(p.x - last.x, p.z - last.z) > 0.25) points.push(p);
    }
  }
  return points.length >= 2 ? { points, road: to.road } : null;
}

function taxiMat(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

function taxiBox(w, h, d, mat, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  m.frustumCulled = false;
  m.userData.mode = "PAPER";
  return m;
}

function tagPart(mesh, part) {
  mesh.userData.part = part;
  mesh.userData.mode = "PAPER";
  return mesh;
}

/**
 * Short kraft/black checker belt on the doors so the cab is not a yellow sedan.
 * Original kraft tan + the cab black. PAPER boxes only. Roof sign stays.
 */
function addTaxiCheckBand(g, kraftMat, blackMat) {
  const tileW = 0.07;
  const tileH = 0.16;
  const tileD = 0.24;
  const cols = 7;
  const rows = 2;
  const y0 = 1.12;
  const z0 = -0.22 - (cols * tileD) / 2;
  for (const side of [-1, 1]) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const mat = (row + col) % 2 ? blackMat : kraftMat;
        const tile = tagPart(taxiBox(tileW, tileH, tileD - 0.02, mat, false), "check");
        tile.position.set(side * 1.26, y0 + row * tileH, z0 + (col + 0.5) * tileD);
        g.add(tile);
      }
    }
  }
}

/** Four black tyres with a kraft cream hub box on the outer face so the cab is not a floating box. */
function addTaxiWheels(g, tyreMat, hubMat) {
  const tyreGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.36, 10);
  tyreGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [
    [1.28, 1.55],
    [-1.28, 1.55],
    [1.28, -1.55],
    [-1.28, -1.55],
  ]) {
    const tyre = new THREE.Mesh(tyreGeo, tyreMat);
    tyre.position.set(x, 0.48, z);
    tyre.castShadow = true;
    tyre.frustumCulled = false;
    g.add(tyre);
    const outward = x > 0 ? 1 : -1;
    const hub = tagPart(taxiBox(0.08, 0.32, 0.32, hubMat, false), "hub");
    hub.position.set(x + outward * 0.22, 0.48, z);
    g.add(hub);
  }
}

/**
 * Dark iron bumper strip on the nose (and tail) so the cab has a front edge.
 * Same 0x2a2a2e as the lamp ends — original palette, not chrome sedan bumpers.
 * PAPER boxes only. Roof sign and checker belt stay.
 */
function addTaxiBumpers(g, ironMat) {
  const front = tagPart(taxiBox(2.58, 0.2, 0.2, ironMat, false), "bumper");
  front.position.set(0, 0.54, 2.64);
  const rear = tagPart(taxiBox(2.58, 0.2, 0.2, ironMat, false), "bumper");
  rear.position.set(0, 0.54, -2.64);
  g.add(front, rear);
}

/**
 * Two tiny kraft bars on the doors so the cab reads as a cab, not a yellow slab.
 * Same 0xc4a574 as the checker tan — original palette. PAPER boxes only.
 */
function addTaxiDoorHandles(g, kraftMat) {
  for (const side of [-1, 1]) {
    const handle = tagPart(taxiBox(0.06, 0.07, 0.18, kraftMat, false), "handle");
    handle.position.set(side * 1.28, 1.18, 0.38);
    g.add(handle);
  }
}

/**
 * Small kraft cream PAPER door number plate on each cab door — checker belt
 * already exists, so this is the extra cab mark, not a second stripe.
 * Same 0xf4ead8 as the hubs. PAPER boxes only.
 */
function addTaxiDoorPlates(g, kraftCreamMat) {
  for (const side of [-1, 1]) {
    const plate = tagPart(taxiBox(0.04, 0.14, 0.18, kraftCreamMat, false), "door-plate");
    plate.position.set(side * 1.28, 0.86, 0.38);
    g.add(plate);
  }
}

/**
 * Two small kraft PAPER side mirrors on the A-pillars — tan housing + cream glass.
 * Same 0xc4a574 / 0xf4ead8 as handles and hubs. Not chrome sedan mirrors.
 */
function addTaxiMirrors(g, kraftMat, kraftCreamMat) {
  for (const side of [-1, 1]) {
    const housing = tagPart(taxiBox(0.18, 0.14, 0.22, kraftMat, false), "mirror");
    housing.position.set(side * 1.38, 1.5, 0.92);
    const face = tagPart(taxiBox(0.04, 0.1, 0.16, kraftCreamMat, false), "mirror");
    face.position.set(side * 1.48, 1.5, 0.92);
    g.add(housing, face);
  }
}

/**
 * Small kraft cream plate on the rear bumper — reads as a cab, not a yellow brick.
 * Same 0xf4ead8 as the hubs — original palette, not chrome grey. PAPER boxes only.
 */
function addTaxiPlate(g, kraftCreamMat) {
  const plate = tagPart(taxiBox(0.52, 0.14, 0.04, kraftCreamMat, false), "plate");
  plate.position.set(0, 0.62, -2.76);
  g.add(plate);
}

/**
 * Two thin kraft cream PAPER wipers on the windscreen — parked blades, not chrome.
 * Same 0xf4ead8 as the hubs and plate. PAPER boxes only.
 */
function addTaxiWipers(g, kraftCreamMat) {
  for (const x of [-0.42, 0.42]) {
    const wiper = tagPart(taxiBox(0.72, 0.03, 0.04, kraftCreamMat, false), "wiper");
    wiper.position.set(x, 1.32, 1.16);
    g.add(wiper);
  }
}

/**
 * Tiny kraft cream PAPER ball/cap on the roof aerial tip — same 0xf4ead8 as hubs.
 * PAPER box only. Aerial stem stays.
 */
function addTaxiAerialCap(g, kraftCreamMat, aerial) {
  const geo = aerial.geometry;
  const aerialH = geo.parameters?.height ?? 0.32;
  const capH = 0.08;
  const cap = tagPart(taxiBox(0.08, capH, 0.08, kraftCreamMat, false), "aerial-cap");
  cap.position.set(aerial.position.x, aerial.position.y + aerialH / 2 + capH / 2, aerial.position.z);
  g.add(cap);
}

/**
 * One tiny kraft PAPER fare card on the dash — standing rate card, not a second plate.
 * Same 0xc4a574 as the handles. PAPER box only. Plate and aerial cap stay.
 */
function addTaxiFare(g, kraftMat) {
  const fare = tagPart(taxiBox(0.18, 0.12, 0.02, kraftMat, false), "fare");
  fare.position.set(0.58, 1.48, 0.82);
  g.add(fare);
}

/**
 * One tiny kraft PAPER roof flag — standing pennant on the cabin, not a second lamp.
 * Same 0xc4a574 as the fare card. PAPER box only. Offset from fare, plate,
 * aerial-cap, mudflap, wiper.
 */
function addTaxiFlag(g, kraftMat) {
  const flag = tagPart(taxiBox(0.16, 0.12, 0.02, kraftMat, false), "flag");
  flag.position.set(0.78, 2.22, 0.58);
  g.add(flag);
}

/**
 * One tiny kraft PAPER sun visor — thin strip at the windscreen top, not a second flag.
 * Same 0xc4a574 as the fare card. PAPER box only. Offset from flag, fare, plate,
 * aerial-cap.
 */
function addTaxiVisor(g, kraftMat) {
  const visor = tagPart(taxiBox(0.32, 0.05, 0.1, kraftMat, false), "visor");
  visor.position.set(-0.48, 1.88, 0.96);
  g.add(visor);
}

/**
 * One tiny kraft PAPER hubcap on a front wheel — disc on the outer hub face,
 * not a second cream hub. Same 0xc4a574 as the visor. PAPER box only.
 * Visor, flag, fare, plate, mirror stay.
 */
function addTaxiHubcap(g, kraftMat) {
  const hubcap = tagPart(taxiBox(0.04, 0.16, 0.16, kraftMat, false), "hubcap");
  hubcap.position.set(1.56, 0.48, 1.55);
  g.add(hubcap);
}

/**
 * One tiny kraft PAPER headlamp on the cab front — small box, not chrome,
 * not a second visor. Same 0xc4a574 as the visor. PAPER box only.
 * Offset from visor, wiper, plate, fare, mirror, hubcap, mudflap, aerial.
 */
function addTaxiHeadlamp(g, kraftMat) {
  const headlamp = tagPart(taxiBox(0.18, 0.12, 0.08, kraftMat, false), "headlamp");
  headlamp.position.set(0, 0.86, 2.62);
  g.add(headlamp);
}

/**
 * One tiny kraft PAPER sidelight on the front fender — small box, not chrome,
 * not a second headlamp. Same 0xc4a574 as the visor. PAPER box only.
 * Offset from headlamp (0, 0.86, 2.62), visor, wiper, plate, fare, mirror,
 * hubcap, mudflap, aerial.
 */
function addTaxiSidelight(g, kraftMat) {
  const sidelight = tagPart(taxiBox(0.08, 0.1, 0.12, kraftMat, false), "sidelight");
  sidelight.position.set(1.26, 0.92, 2.28);
  g.add(sidelight);
}

/**
 * One tiny kraft PAPER reflector on the rear fender — small box, not chrome,
 * not a second sidelight. Same 0xc4a574 as the visor. PAPER box only.
 * Offset from sidelight (1.26, 0.92, 2.28), headlamp, visor, hubcap, flag,
 * fare, mudflap, wiper, spare, plate, mirror, aerial, handle, bumper, check.
 */
function addTaxiReflector(g, kraftMat) {
  const reflector = tagPart(taxiBox(0.08, 0.1, 0.12, kraftMat, false), "reflector");
  reflector.position.set(-1.26, 0.92, -2.28);
  g.add(reflector);
}

/**
 * One tiny kraft PAPER tail lamp on the rear fender — small box, not chrome,
 * not a second reflector. Same 0xc4a574 as the visor. PAPER box only.
 * Offset from reflector (-1.26, 0.92, -2.28), sidelight (1.26, 0.92, 2.28),
 * headlamp, visor, hubcap, flag, fare, mudflap, wiper, spare, plate, mirror,
 * aerial, handle, bumper, check.
 */
function addTaxiTailLamp(g, kraftMat) {
  const tailLamp = tagPart(taxiBox(0.08, 0.1, 0.12, kraftMat, false), "tail");
  tailLamp.position.set(1.26, 0.92, -2.28);
  g.add(tailLamp);
}

/**
 * One tiny kraft PAPER grille on the cab front — small box, not chrome,
 * not a second headlamp. Same 0xc4a574 as the visor. PAPER box only.
 * Offset from bumper (0, 0.54, 2.64), headlamp (0, 0.86, 2.62),
 * wiper, visor, hubcap, sidelight (1.26, 0.92, 2.28),
 * reflector (-1.26, 0.92, -2.28), tail (1.26, 0.92, -2.28).
 */
function addTaxiGrille(g, kraftMat) {
  const grille = tagPart(taxiBox(0.48, 0.12, 0.06, kraftMat, false), "grille");
  grille.position.set(0, 0.70, 2.58);
  g.add(grille);
}

/**
 * One tiny kraft PAPER foglamp on the cab front — small box, not chrome,
 * not a second grille. Same 0xc4a574 as the visor. PAPER box only.
 * Offset from grille (0, 0.70, 2.58), bumper (0, 0.54, 2.64),
 * headlamp (0, 0.86, 2.62), wiper, visor, hubcap,
 * sidelight (1.26, 0.92, 2.28), reflector (-1.26, 0.92, -2.28),
 * tail (1.26, 0.92, -2.28).
 */
function addTaxiFoglamp(g, kraftMat) {
  const foglamp = tagPart(taxiBox(0.12, 0.08, 0.08, kraftMat, false), "foglamp");
  foglamp.position.set(-0.92, 0.50, 2.66);
  g.add(foglamp);
}

/**
 * Tiny kraft cream PAPER mudflaps behind the rear wheels — small hanging boxes.
 * Same 0xf4ead8 as the hubs. PAPER boxes only. Door plates, aerial cap, wipers stay.
 */
function addTaxiMudflaps(g, kraftCreamMat) {
  for (const side of [-1, 1]) {
    const flap = tagPart(taxiBox(0.32, 0.28, 0.04, kraftCreamMat, false), "mudflap");
    flap.position.set(side * 1.28, 0.32, -2.12);
    g.add(flap);
  }
}

/**
 * One small kraft PAPER spare on the boot — short rubber cylinder + cream hub box.
 * Same 0x1a1a1e / 0xf4ead8 as the road wheels. Not a new grey. Roof aerial stays.
 */
function addTaxiSpare(g, tyreMat, hubMat) {
  const tyreGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.14, 10);
  tyreGeo.rotateX(Math.PI / 2);
  const spare = new THREE.Mesh(tyreGeo, tyreMat);
  spare.position.set(0, 1.22, -2.6);
  spare.castShadow = true;
  spare.receiveShadow = true;
  spare.frustumCulled = false;
  tagPart(spare, "spare");
  const hub = tagPart(taxiBox(0.2, 0.2, 0.05, hubMat, false), "spare");
  hub.position.set(0, 1.22, -2.68);
  g.add(spare, hub);
}

/**
 * Yellow cab that reads from the quay: wheels with kraft cream hub boxes, glass, roof lamp, checker belt,
 * iron bumper, door handles, kraft cream door number plates, kraft side mirrors, short kraft roof aerial
 * with a kraft cream PAPER cap, kraft cream rear plate, kraft spare on the boot, two kraft cream PAPER
 * wipers on the windscreen, tiny kraft cream PAPER mudflaps behind the rear wheels,
 * one tiny kraft PAPER fare card on the dash, one tiny kraft PAPER roof flag,
 * one tiny kraft PAPER sun visor at the windscreen, one tiny kraft PAPER hubcap
 * on a front wheel, one tiny kraft PAPER headlamp on the cab front,
 * one tiny kraft PAPER sidelight on the front fender,
 * one tiny kraft PAPER reflector on the rear fender,
 * one tiny kraft PAPER tail lamp on the opposite rear fender,
 * one tiny kraft PAPER grille on the cab front,
 * one tiny kraft PAPER foglamp on the cab front.
 * Compact warm PAPER taxi-sign box — original cream lamp, not a sedan lid, not a debug mast, not a cop lightbar.
 */
export function makeTaxiMesh() {
  const g = new THREE.Group();
  g.frustumCulled = false;
  const yellow = taxiMat(0xf0c430, { emissive: 0xf0c430, emissiveIntensity: 0.18 });
  const cabin = taxiMat(0xf6d65a, { emissive: 0xf6d65a, emissiveIntensity: 0.12 });
  const dark = taxiMat(0x1a1a1e);
  /** Same kraft tan as quay decks / straw — original palette, not a new hex. */
  const kraft = taxiMat(0xc4a574);
  /** Same kraft cream as sedan hubs — original palette, not chrome grey. */
  const kraftHub = taxiMat(0xf4ead8);
  const glass = taxiMat(0x3a5a6c, { emissive: 0x1a3040, emissiveIntensity: 0.22 });
  /** Original taxi lamp cream. Warm PAPER glow, not neon. */
  const lamp = taxiMat(0xfff3a0, { emissive: 0xfff3a0, emissiveIntensity: 0.78 });
  const lampSide = taxiMat(0x2a2a2e);
  const head = taxiMat(0xfff4d2, { emissive: 0xffe9a8, emissiveIntensity: 0.4 });
  const tail = taxiMat(0xc42a22, { emissive: 0x8a1814, emissiveIntensity: 0.35 });

  const body = taxiBox(2.45, 1.05, 5.05, yellow);
  body.position.y = 0.92;
  g.add(body);

  addTaxiCheckBand(g, kraft, dark);
  addTaxiBumpers(g, lampSide);
  addTaxiDoorHandles(g, kraft);
  addTaxiDoorPlates(g, kraftHub);
  addTaxiMirrors(g, kraft, kraftHub);
  addTaxiPlate(g, kraftHub);
  addTaxiSpare(g, dark, kraftHub);
  addTaxiWipers(g, kraftHub);

  const roof = taxiBox(2.18, 0.92, 2.45, cabin);
  roof.position.set(0, 1.68, -0.22);
  g.add(roof);

  const wind = taxiBox(2.02, 0.72, 0.16, glass, false);
  wind.position.set(0, 1.62, 1.08);
  wind.rotation.x = -0.42;
  g.add(wind);

  const rearGlass = taxiBox(1.95, 0.58, 0.12, glass, false);
  rearGlass.position.set(0, 1.62, -1.42);
  rearGlass.rotation.x = 0.28;
  g.add(rearGlass);

  for (const z of [0.22, -0.55]) {
    const side = taxiBox(0.08, 0.48, 0.95, glass, false);
    side.position.set(1.12, 1.62, z);
    const sideB = side.clone();
    sideB.position.x = -1.12;
    g.add(side, sideB);
  }

  const roofTopY = 1.68 + 0.46;
  const lampZ = -0.12;
  const lampBase = tagPart(taxiBox(0.7, 0.08, 0.42, lampSide, false), "lamp");
  lampBase.position.set(0, roofTopY + 0.04, lampZ);
  const sign = tagPart(taxiBox(0.92, 0.5, 0.4, lamp), "lamp");
  sign.position.set(0, roofTopY + 0.33, lampZ);
  const cap = tagPart(taxiBox(0.98, 0.06, 0.44, lampSide, false), "lamp");
  cap.position.set(0, sign.position.y + 0.28, lampZ);
  g.add(lampBase, sign, cap);
  for (const x of [-0.48, 0.48]) {
    const end = tagPart(taxiBox(0.06, 0.52, 0.42, lampSide, false), "lamp");
    end.position.set(x, sign.position.y, lampZ);
    g.add(end);
  }

  /** Short kraft roof aerial — thin PAPER box behind the lamp, not a red debug mast. Under 0.4 m. */
  const aerialH = 0.32;
  const aerial = tagPart(taxiBox(0.04, aerialH, 0.04, kraft, false), "aerial");
  aerial.position.set(0, roofTopY + aerialH / 2, lampZ - 0.36);
  g.add(aerial);
  addTaxiAerialCap(g, kraftHub, aerial);

  for (const x of [-0.72, 0.72]) {
    const hl = taxiBox(0.42, 0.22, 0.12, head, false);
    hl.position.set(x, 0.78, 2.56);
    const tl = taxiBox(0.38, 0.18, 0.1, tail, false);
    tl.position.set(x, 0.78, -2.56);
    g.add(hl, tl);
  }

  addTaxiWheels(g, dark, kraftHub);
  addTaxiHubcap(g, kraft);
  addTaxiMudflaps(g, kraftHub);
  addTaxiFare(g, kraft);
  addTaxiFlag(g, kraft);
  addTaxiVisor(g, kraft);
  addTaxiHeadlamp(g, kraft);
  addTaxiSidelight(g, kraft);
  addTaxiReflector(g, kraft);
  addTaxiTailLamp(g, kraft);
  addTaxiGrille(g, kraft);
  addTaxiFoglamp(g, kraft);

  g.userData.kind = "taxi";
  g.userData.mode = "PAPER";
  return g;
}

export function createTaxi({
  scene,
  player,
  getMap,
  specOf,
  heightAt,
  getIslandId,
  setWalking,
  setStatus,
  button,
  onRide,
}) {
  const mesh = makeTaxiMesh();
  mesh.visible = false;
  scene.add(mesh);

  const overlayEl = typeof document !== "undefined" ? document.getElementById("taxi-map") : null;
  const overlayCanvas = typeof document !== "undefined" ? document.getElementById("taxi-map-canvas") : null;
  const overlayClose = typeof document !== "undefined" ? document.getElementById("taxi-map-close") : null;
  const overlayExit = typeof document !== "undefined" ? document.getElementById("taxi-map-exit") : null;

  /** idle | coming | waiting | boarded | hauling */
  let mode = "idle";
  let island = "north";
  let road = null;
  let path = [];
  let pi = 0;
  let waitStartedAtMs = null;
  let overlayOpen = false;

  function pavedRoads(islandId) {
    const map = getMap();
    if (!map) return [];
    return map.roads.filter((r) => r.kind === "paved" && r.island === islandId);
  }

  function closestPaved(x, z, islandId) {
    let best = null;
    for (const r of pavedRoads(islandId)) {
      if (!r.points || r.points.length < 2) continue;
      const proj = projectOnPolyline(r.points, x, z);
      if (!best || proj.dist < best.proj.dist) best = { road: r, proj };
    }
    return best;
  }

  function nearestDirt(x, z, islandId) {
    const map = getMap();
    if (!map) return Infinity;
    let best = Infinity;
    for (const r of map.roads) {
      if (r.kind !== "dirt" || r.island !== islandId || !r.points || r.points.length < 2) continue;
      best = Math.min(best, projectOnPolyline(r.points, x, z).dist);
    }
    return best;
  }

  function place(x, z, yaw) {
    const spec = specOf(island);
    const y = heightAt(spec, x, z);
    mesh.position.set(x, y + TAXI_Y, z);
    if (yaw != null) mesh.rotation.y = yaw;
  }

  function attachPlayer() {
    player.position.x = mesh.position.x;
    player.position.z = mesh.position.z;
    player.position.y = mesh.position.y + 1.35;
    player.rotation.y = mesh.rotation.y;
  }

  function setPath(pts) {
    path = pts;
    pi = 0;
  }

  function pathDone() {
    return path.length < 2 || pi >= path.length - 1;
  }

  function driveTo(x, z) {
    const map = getMap();
    const route = routeAcrossPaved(
      map ? map.roads : [],
      island,
      mesh.position.x,
      mesh.position.z,
      x,
      z,
    );
    if (!route || route.points.length < 2) return false;
    road = route.road;
    setPath(route.points);
    return true;
  }

  function islandStops() {
    const map = getMap();
    if (!map || !map.stops) return [];
    return map.stops.filter((s) => s.id.startsWith(island + "-"));
  }

  function parkOnPaved() {
    const hit = closestPaved(player.position.x, player.position.z, island);
    if (!hit) return false;
    road = hit.road;
    const { proj } = hit;
    const a = road.points[proj.i];
    const b = road.points[Math.min(proj.i + 1, road.points.length - 1)];
    place(proj.x, proj.z, Math.atan2(b.x - a.x, b.z - a.z));
    mesh.visible = true;
    return true;
  }

  function sizeOverlayCanvas() {
    if (!overlayCanvas) return;
    const r = overlayCanvas.getBoundingClientRect();
    overlayCanvas.width = Math.max(160, Math.floor(r.width) || 320);
    overlayCanvas.height = Math.max(120, Math.floor(r.height) || 220);
  }

  function drawMap() {
    if (!overlayCanvas || !overlayOpen) return;
    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;
    const spec = specOf(island);
    const w = overlayCanvas.width;
    const h = overlayCanvas.height;
    const bounds = islandMapBounds(spec);
    ctx.fillStyle = "#1d7a86";
    ctx.fillRect(0, 0, w, h);
    const c = worldToMapPx(bounds, spec.cx, spec.cz, w, h);
    const rxPx = (spec.rx / (bounds.maxX - bounds.minX)) * w;
    const rzPx = (spec.rz / (bounds.maxZ - bounds.minZ)) * h;
    ctx.fillStyle = spec.id === "north" ? "#4a7a3c" : "#3d8f4a";
    ctx.beginPath();
    ctx.ellipse(c.sx, c.sy, rxPx, rzPx, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a2a2e";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const r of pavedRoads(island)) {
      if (!r.points.length) continue;
      ctx.beginPath();
      r.points.forEach((p, i) => {
        const m = worldToMapPx(bounds, p.x, p.z, w, h);
        if (i === 0) ctx.moveTo(m.sx, m.sy);
        else ctx.lineTo(m.sx, m.sy);
      });
      ctx.stroke();
    }
    // Named stops: the taxi is point-to-point, so points are the interface.
    ctx.textAlign = "center";
    ctx.font = "700 11px 'Segoe UI', system-ui, sans-serif";
    for (const s of islandStops()) {
      const m = worldToMapPx(bounds, s.x, s.z, w, h);
      ctx.fillStyle = "#f4ead8";
      ctx.beginPath();
      ctx.arc(m.sx, m.sy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a2a2e";
      ctx.beginPath();
      ctx.arc(m.sx, m.sy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4ead8";
      ctx.fillText(s.name, m.sx, m.sy - 10);
    }
    const me = worldToMapPx(bounds, mesh.position.x, mesh.position.z, w, h);
    ctx.fillStyle = "#f0c430";
    ctx.beginPath();
    ctx.arc(me.sx, me.sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function openOverlay() {
    overlayOpen = true;
    if (overlayEl) overlayEl.hidden = false;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        sizeOverlayCanvas();
        drawMap();
      });
    } else {
      sizeOverlayCanvas();
      drawMap();
    }
  }

  function closeOverlay() {
    overlayOpen = false;
    if (overlayEl) overlayEl.hidden = true;
  }

  function tryCollect() {
    const px = player.position.x;
    const pz = player.position.z;
    const hit = road ? { proj: projectOnPolyline(road.points, px, pz) } : closestPaved(px, pz, island);
    if (!hit || hit.proj.dist > NEAR_PAVED) return false;
    if (Math.hypot(px - mesh.position.x, pz - mesh.position.z) > 16) return false;
    setWalking(false);
    mode = "boarded";
    waitStartedAtMs = null;
    attachPlayer();
    openOverlay();
    setRide(true);
    setStatus("Taxi collected you. Tap the map to ride..");
    return true;
  }

  function setRide(next) {
    if (typeof onRide === "function") onRide(next);
  }

  function hopOut() {
    if (mode === "idle") return;
    const riding = mode === "boarded" || mode === "hauling";
    mode = "idle";
    path = [];
    pi = 0;
    waitStartedAtMs = null;
    closeOverlay();
    if (riding) {
      const spec = specOf(island);
      player.position.y = heightAt(spec, player.position.x, player.position.z) + 1.15;
    }
    setRide(false);
  }

  function dismissUnboarded() {
    mode = "idle";
    path = [];
    pi = 0;
    road = null;
    waitStartedAtMs = null;
    mesh.visible = false;
    closeOverlay();
    setStatus("Taxi drove away..");
  }

  function call() {
    island = getIslandId();
    const px = player.position.x;
    const pz = player.position.z;
    const hit = closestPaved(px, pz, island);
    if (!hit) {
      setStatus("No paved road here..");
      return;
    }
    if (mode === "boarded" || mode === "hauling") {
      hopOut();
      setStatus("Out of the taxi..");
      return;
    }
    const sameIsland = mesh.visible && road && road.island === island;
    road = hit.road;
    if (!sameIsland) parkOnPaved();
    mesh.visible = true;
    driveTo(hit.proj.x, hit.proj.z);
    mode = "coming";
    waitStartedAtMs = Date.now();
    setStatus("Taxi coming along the paved road..");
  }

  /**
   * @returns {boolean} true if the tap is consumed (no walk)
   */
  function handleTap(x, z, tapIsland) {
    if (overlayOpen) return true;
    if (mode !== "boarded" && mode !== "hauling") return false;
    hopOut();
    const onDirt = nearestDirt(x, z, island) <= ON_DIRT;
    setStatus(
      onDirt ? "Taxi stays on paved. Dirt is forbidden. PAPER." : "Out of the taxi. PAPER.",
    );
    return false;
  }

  function pickMapDest(ev) {
    if (!overlayOpen || !overlayCanvas) return;
    const rect = overlayCanvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const sx = ((ev.clientX - rect.left) / rect.width) * overlayCanvas.width;
    const sy = ((ev.clientY - rect.top) / rect.height) * overlayCanvas.height;
    const spec = specOf(island);
    const map = getMap();
    // Stops first: tap a named point and the cab routes across the network.
    const stop = stopFromMapClick(islandStops(), spec, sx, sy, overlayCanvas.width, overlayCanvas.height);
    if (stop) {
      if (!driveTo(stop.x, stop.z)) {
        setStatus("No route to " + stop.name + "..");
        return;
      }
      mode = "hauling";
      setWalking(false);
      closeOverlay();
      setStatus("Taxi to " + stop.name + "..");
      return;
    }
    const hit = map ? pavedDestFromMapClick(map.roads, island, spec, sx, sy, overlayCanvas.width, overlayCanvas.height) : null;
    if (!hit) {
      setStatus("Tap a stop point..");
      return;
    }
    if (!driveTo(hit.proj.x, hit.proj.z)) {
      setStatus("Taxi stays on paved. Dirt is forbidden..");
      return;
    }
    mode = "hauling";
    setWalking(false);
    closeOverlay();
    setStatus("Taxi on paved..");
  }

  function tick(dt, nowMs = Date.now()) {
    if (taxiWaitExpired(mode, waitStartedAtMs, nowMs)) {
      dismissUnboarded();
      return;
    }
    if (mode === "idle" || !mesh.visible) return;

    if (!pathDone()) {
      let remain = SPEED * dt;
      while (remain > 0 && pi < path.length - 1) {
        const b = path[pi + 1];
        const dx = b.x - mesh.position.x;
        const dz = b.z - mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.08) {
          pi += 1;
          continue;
        }
        const yaw = Math.atan2(dx, dz);
        if (dist <= remain) {
          place(b.x, b.z, yaw);
          pi += 1;
          remain -= dist;
        } else {
          place(mesh.position.x + (dx / dist) * remain, mesh.position.z + (dz / dist) * remain, yaw);
          remain = 0;
        }
      }
    }

    if (mode === "coming" && pathDone()) {
      const px = player.position.x;
      const pz = player.position.z;
      const proj = road ? projectOnPolyline(road.points, px, pz) : null;
      if (proj && proj.dist <= NEAR_PAVED) {
        const d = Math.hypot(mesh.position.x - proj.x, mesh.position.z - proj.z);
        if (d > 4) {
          driveTo(proj.x, proj.z);
        } else if (!tryCollect()) {
          mode = "waiting";
          setStatus("Taxi waiting on paved. Walk to the road..");
        }
      } else if (!tryCollect()) {
        mode = "waiting";
        setStatus("Taxi waiting on paved. Walk to the road..");
      }
    }

    if (mode === "waiting") {
      if (!tryCollect() && road) {
        const proj = projectOnPolyline(road.points, player.position.x, player.position.z);
        if (proj.dist <= NEAR_PAVED) {
          const d = Math.hypot(mesh.position.x - proj.x, mesh.position.z - proj.z);
          if (d > 4) {
            driveTo(proj.x, proj.z);
            mode = "coming";
          }
        }
      }
    }

    if (mode === "hauling" && pathDone()) {
      mode = "boarded";
      setRide(true);
      setStatus("Taxi stopped. Tap Exit taxi or pick another stop..");
      openOverlay();
    }

    if (mode === "boarded" || mode === "hauling") {
      setWalking(false);
      attachPlayer();
    }
  }

  button.addEventListener("click", call);
  if (typeof getIslandId === "function") island = getIslandId() || island;
  parkOnPaved();
  if (overlayCanvas) {
    overlayCanvas.addEventListener("pointerup", (ev) => {
      ev.stopPropagation();
      pickMapDest(ev);
    });
  }
  if (overlayClose) {
    overlayClose.addEventListener("click", () => {
      closeOverlay();
      setStatus("Map closed. Exit taxi is on the dock..");
    });
  }
  if (overlayExit) {
    overlayExit.addEventListener("click", () => {
      hopOut();
      setStatus("Out of the taxi..");
    });
  }

  return {
    mesh,
    call,
    handleTap,
    hopOut,
    tick,
    mapOpen: () => overlayOpen,
    riding: () => mode === "boarded" || mode === "hauling",
  };
}
