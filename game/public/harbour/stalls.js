import * as THREE from "three";

/**
 * Tap an NPC stall to buy 1 good at lastPrice (same /api/buy as the market).
 * PAPER mesh only. No wallet. Does not lease or develop.
 */

const WOOD = 0x5a3a22;
const WOOD_POST = 0x6a4a2a;
const DECK = 0xc4a574;
const AWNING_A = 0xc45c3a;
const AWNING_B = 0xf4ead8;
const CRATE_A = 0x8a6238;
const CRATE_B = 0x7a5230;
const CORN = 0xd4b83a;
const LEAF = 0x5f8a32;
const PLASTER = 0xe8d7b8;
const FRAME = 0x3d2a1c;

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

/** Visible PAPER market stand: deck, posts, striped awning, counter, crates. */
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

  for (const x of [-1.85, 1.85]) {
    for (const z of [-1.05, 1.05]) {
      const post = paperBox(0.14, 2.2, 0.14, WOOD_POST, false);
      post.position.set(x, 1.18, z);
      post.userData.part = "post";
      g.add(post);
    }
  }

  const n = 6;
  const stripW = 3.8 / n;
  for (let i = 0; i < n; i++) {
    const strip = paperBox(stripW - 0.04, 0.08, 2.6, i % 2 ? AWNING_B : AWNING_A, false);
    strip.position.set(-1.9 + stripW * (i + 0.5), 2.35, 0.15);
    strip.rotation.x = 0.22;
    strip.userData.part = "awning";
    strip.userData.roof = true;
    g.add(strip);
  }

  const ridge = paperBox(4.0, 0.1, 0.18, FRAME, false);
  ridge.position.set(0, 2.52, -0.9);
  ridge.userData.part = "awning";
  g.add(ridge);

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
  const face = paperBox(1.55, 0.28, 0.04, AWNING_A, false);
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
