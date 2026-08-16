import * as THREE from "three";

/**
 * Tap an NPC stall to buy 1 good at lastPrice (same /api/buy as the market).
 * PAPER mesh only. No wallet. Does not lease or develop.
 */

const WOOD = 0x5a3a22;
const WOOD_POST = 0x6a4a2a;
const DECK = 0xc4a574;
/** Original stall cloth: terracotta, kraft cream, harbour teal. */
const TERRACOTTA = 0xc45c3a;
const KRAFT = 0xf4ead8;
const TEAL = 0x2a7a72;
const CRATE_A = 0x8a6238;
const CRATE_B = 0x7a5230;
const CORN = 0xd4b83a;
const LEAF = 0x5f8a32;
const PLASTER = 0xe8d7b8;
const FRAME = 0x3d2a1c;

/** PAPER canvas pairs. Same three hexes, swapped per stall. */
const AWNING_PAIRS = [
  [TERRACOTTA, KRAFT],
  [TEAL, KRAFT],
  [TERRACOTTA, TEAL],
  [KRAFT, TEAL],
  [TEAL, TERRACOTTA],
];

/** Food goods a farm-stand can sell. Default is corn. */
export const FOOD_GOODS = ["corn", "potato", "lettuce", "beans"];

export const STALL_KIND = "npc-stall";

function paperBox(w, h, d, color, shadow = true) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

function hashId(id) {
  const s = String(id || "");
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n + s.charCodeAt(i) * (i + 1)) | 0;
  return Math.abs(n);
}

/** Stripe pair + count keyed to the plot, not a new palette. */
export function awningStyleFor(plot) {
  const h = hashId(plot && plot.id);
  const pair = AWNING_PAIRS[h % AWNING_PAIRS.length];
  return { a: pair[0], b: pair[1], n: 5 + (h % 3) };
}

/** Farm plots sell corn. Other NPC stalls sell a food good keyed to the plot. */
export function stallGoodFor(plot) {
  if (!plot) return "corn";
  if (plot.use === "farm" || plot.band === "field") return "corn";
  return FOOD_GOODS[hashId(plot.id) % FOOD_GOODS.length];
}

function objectWithKind(obj, kind) {
  let o = obj;
  while (o) {
    if (o.userData && o.userData.kind === kind) return o;
    o = o.parent;
  }
  return null;
}

function money(n) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function labelGood(g) {
  return String(g).replace(/_/g, " ");
}

/** Visible PAPER market stand: deck, posts, striped awning, counter, crates, hanging scale. */
export function makeStallMesh(plot) {
  const g = new THREE.Group();
  g.name = "npc-stall";
  g.userData.kind = STALL_KIND;
  g.userData.mode = "PAPER";
  g.userData.paper = true;
  g.userData.good = stallGoodFor(plot);
  if (plot) {
    g.userData.plotId = plot.id;
    g.userData.use = plot.use;
    g.userData.island = plot.island;
  }

  const deck = paperBox(4.2, 0.16, 2.8, DECK, false);
  deck.position.y = 0.08;
  deck.userData.part = "deck";
  g.add(deck);

  const counter = paperBox(3.6, 0.7, 0.55, WOOD);
  counter.position.set(0, 0.55, 1.05);
  counter.userData.part = "counter";
  g.add(counter);

  // One small kraft goods crate on the counter so the stall reads as a shop,
  // not an empty awning. Local offset only — stall world pose stays put.
  const goods = new THREE.Group();
  goods.name = "goods-crate";
  goods.userData.part = "goods-crate";
  goods.userData.mode = "PAPER";
  goods.userData.paper = true;
  goods.position.set(0.95, 0.9, 1.05);
  const crateBody = paperBox(0.36, 0.22, 0.34, CRATE_A, false);
  crateBody.position.y = 0.11;
  crateBody.userData.part = "goods-crate";
  const crateRim = paperBox(0.38, 0.03, 0.36, WOOD, false);
  crateRim.position.y = 0.205;
  crateRim.userData.part = "goods-crate";
  const crateGoods = paperBox(0.2, 0.1, 0.2, KRAFT, false);
  crateGoods.position.y = 0.27;
  crateGoods.userData.part = "goods-crate";
  goods.add(crateBody, crateRim, crateGoods);
  g.add(goods);

  for (const x of [-1.85, 1.85]) {
    for (const z of [-1.05, 1.05]) {
      const post = paperBox(0.14, 2.2, 0.14, WOOD_POST, false);
      post.position.set(x, 1.18, z);
      post.userData.part = "post";
      g.add(post);
    }
  }

  const { a: clothA, b: clothB, n } = awningStyleFor(plot);
  const stripW = 3.8 / n;
  for (let i = 0; i < n; i++) {
    const cloth = i % 2 ? clothB : clothA;
    const strip = paperBox(stripW - 0.04, 0.08, 2.6, cloth, false);
    strip.position.set(-1.9 + stripW * (i + 0.5), 2.35, 0.15);
    strip.rotation.x = 0.22;
    strip.userData.part = "awning";
    strip.userData.stripe = true;
    strip.userData.roof = true;
    g.add(strip);
  }

  const flapN = n + 1;
  const flapSpan = 3.6;
  for (let i = 0; i < flapN; i++) {
    const flap = paperBox(flapSpan / flapN - 0.06, 0.28, 0.08, i % 2 ? clothB : clothA, false);
    flap.position.set(-flapSpan / 2 + (flapSpan / (flapN - 1)) * i, 2.04, 1.38);
    flap.userData.part = "awning";
    flap.userData.stripe = true;
    g.add(flap);
  }

  const ridge = paperBox(4.0, 0.1, 0.18, FRAME, false);
  ridge.position.set(0, 2.52, -0.9);
  ridge.userData.part = "awning";
  g.add(ridge);

  // Brass/wood hanging scale under the awning so the counter reads as a
  // working stand, not an empty table. Left of the sign, over the counter.
  // Local offset only — stall world pose stays put.
  const scale = new THREE.Group();
  scale.name = "hanging-scale";
  scale.userData.part = "hanging-scale";
  scale.userData.mode = "PAPER";
  scale.userData.paper = true;
  scale.position.set(-1.12, 1.78, 0.86);
  const cord = paperBox(0.03, 0.28, 0.03, FRAME, false);
  cord.position.y = 0.16;
  cord.userData.part = "hanging-scale";
  const beam = paperBox(0.48, 0.04, 0.05, WOOD, false);
  beam.position.y = -0.02;
  beam.userData.part = "hanging-scale";
  const hangL = paperBox(0.02, 0.14, 0.02, FRAME, false);
  hangL.position.set(-0.2, -0.11, 0);
  hangL.userData.part = "hanging-scale";
  const hangR = paperBox(0.02, 0.14, 0.02, FRAME, false);
  hangR.position.set(0.2, -0.11, 0);
  hangR.userData.part = "hanging-scale";
  const panL = paperBox(0.14, 0.025, 0.14, DECK, false);
  panL.position.set(-0.2, -0.19, 0);
  panL.userData.part = "hanging-scale";
  const panR = paperBox(0.14, 0.025, 0.14, DECK, false);
  panR.position.set(0.2, -0.19, 0);
  panR.userData.part = "hanging-scale";
  const weight = paperBox(0.05, 0.04, 0.05, KRAFT, false);
  weight.position.set(-0.2, -0.158, 0);
  weight.userData.part = "hanging-scale";
  scale.add(cord, beam, hangL, hangR, panL, panR, weight);
  g.add(scale);

  const back = paperBox(3.9, 1.6, 0.12, PLASTER);
  back.position.set(0, 1.05, -1.28);
  back.userData.part = "back";
  g.add(back);

  for (let i = 0; i < 3; i++) {
    const crate = paperBox(0.7, 0.45, 0.7, i % 2 ? CRATE_A : CRATE_B, false);
    crate.position.set(-1.1 + i * 1.1, 1.08, 0.15);
    crate.userData.part = "crate";
    g.add(crate);
    const produce = paperBox(0.55, 0.22, 0.55, i % 2 ? CORN : LEAF, false);
    produce.position.set(-1.1 + i * 1.1, 1.4, 0.15);
    produce.userData.part = "produce";
    g.add(produce);
  }

  const sign = paperBox(1.8, 0.42, 0.06, FRAME, false);
  sign.position.set(0, 2.05, 1.2);
  sign.userData.part = "sign";
  const face = paperBox(1.55, 0.28, 0.04, clothA, false);
  face.position.set(0, 2.05, 1.25);
  face.userData.part = "sign";
  g.add(sign, face);

  return g;
}

function stallFront(plot, spec) {
  let x = plot.x;
  let z = plot.z;
  let yaw = 0;
  if (spec && spec.port) {
    const dx = spec.port.x - plot.x;
    const dz = spec.port.z - plot.z;
    const len = Math.hypot(dx, dz) || 1;
    x = plot.x + (dx / len) * 6;
    z = plot.z + (dz / len) * 6;
    yaw = Math.atan2(dx, dz);
  }
  return { x, z, yaw };
}

export function createStalls({
  scene,
  getMap,
  specOf,
  heightAt,
  setStatus,
  applySnapshot,
  getPlayer,
  onNearStall,
} = {}) {
  const group = new THREE.Group();
  group.name = "npc-stalls";
  group.userData.kind = "npc-stalls";
  group.userData.mode = "PAPER";
  if (scene && typeof scene.add === "function") scene.add(group);

  let placed = false;
  let busy = false;
  let lastNearGood = undefined;
  const NEAR_STALL = 22;

  function markStallHint(good) {
    if (good === lastNearGood) return;
    lastNearGood = good;
    if (typeof onNearStall === "function") onNearStall(good || null);
    if (typeof document === "undefined" || !document.getElementById) return;
    const hint = document.getElementById("stall-hint");
    if (!hint) return;
    if (good) {
      hint.setAttribute("data-near", "1");
      hint.setAttribute("data-good", good);
    } else {
      hint.removeAttribute("data-near");
    }
  }

  function emitNear() {
    const player = getPlayer && getPlayer();
    const pos = player && player.position;
    if (!pos) {
      markStallHint("");
      return;
    }
    let best = "";
    let bestD = NEAR_STALL;
    for (const child of group.children) {
      const d = Math.hypot(child.position.x - pos.x, child.position.z - pos.z);
      if (d <= bestD) {
        bestD = d;
        best = child.userData.good || "corn";
      }
    }
    markStallHint(best);
  }

  function place() {
    if (placed) return;
    const map = getMap && getMap();
    if (!map || !Array.isArray(map.plots)) return;
    for (const p of map.plots) {
      if (p.owner !== "npc") continue;
      const spec = specOf ? specOf(p.island) : null;
      const mesh = makeStallMesh(p);
      const at = stallFront(p, spec);
      const y = heightAt && spec ? heightAt(spec, at.x, at.z) : 0;
      mesh.position.set(at.x, y, at.z);
      mesh.rotation.y = at.yaw;
      group.add(mesh);
    }
    placed = true;
  }

  function takeCash(snapshot) {
    if (typeof applySnapshot === "function") applySnapshot(snapshot);
    const map = getMap && getMap();
    if (!map || !map.visitor) return;
    const cash = snapshot && snapshot.visitor && snapshot.visitor.cash;
    if (typeof cash !== "number") return;
    map.visitor.cash = cash;
    if (typeof applySnapshot === "function" && map.plots) applySnapshot(map);
  }

  async function buyOne(good) {
    if (busy) return;
    busy = true;
    const id = FOOD_GOODS.includes(good) ? good : "corn";
    try {
      const res = await fetch("/api/buy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ good: id, qty: 1 }),
      });
      const body = await res.json();
      if (body.snapshot) takeCash(body.snapshot);
      if (!body.ok) {
        if (setStatus) setStatus("Could not buy: " + body.reason);
        return;
      }
      if (setStatus) {
        setStatus("Bought 1 " + labelGood(id) + " for $" + money(body.paid) + " (PAPER).");
      }
    } catch {
      if (setStatus) setStatus("Could not buy (PAPER).");
    } finally {
      busy = false;
    }
  }

  function handleRay(raycaster) {
    if (!raycaster || typeof raycaster.intersectObject !== "function") return false;
    place();
    if (!group.children.length) return false;
    group.updateMatrixWorld(true);
    const hits = raycaster.intersectObject(group, true);
    if (!hits.length) return false;
    const stall = objectWithKind(hits[0].object, STALL_KIND);
    if (!stall) return false;
    const good = stall.userData.good || "corn";
    markStallHint(good);
    if (!busy) buyOne(good);
    return true;
  }

  place();

  return {
    group,
    handleRay,
    tick() {
      place();
      emitNear();
    },
  };
}
