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
/** Harbour field green — melon / squash on the counter. Same hex as main.js fields. */
const MELON = 0x6a8f44;
const PLASTER = 0xe8d7b8;
const FRAME = 0x3d2a1c;
/** Warm oil-glass. Same family as farm lamp bulb — not neon, not street-iron. */
const WARM_GLASS = 0xffd090;

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

/** Visible PAPER market stand: deck, posts, price board, striped awning, counter, crates, hanging scale, produce basket, oil lantern, melon, kraft cone, hanging fish, ground crate, kraft price slate, kraft stool, kraft cup, kraft knife, kraft napkin, kraft plate, kraft lemon, kraft lime, kraft orange. */
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

  // One small kraft melon / squash on the counter so the stall reads as a
  // farm stand, not only crate + scale. Local offset only — stall world pose
  // stays put. PAPER box. Harbour green (or terracotta squash).
  const melon = new THREE.Group();
  melon.name = "melon";
  melon.userData.part = "melon";
  melon.userData.mode = "PAPER";
  melon.userData.paper = true;
  melon.position.set(-0.88, 0.9, 1.05);
  const melonBody = paperBox(0.2, 0.14, 0.18, MELON, false);
  melonBody.position.y = 0.07;
  melonBody.userData.part = "melon";
  const melonStem = paperBox(0.04, 0.05, 0.04, TERRACOTTA, false);
  melonStem.position.y = 0.165;
  melonStem.userData.part = "melon";
  melon.add(melonBody, melonStem);
  g.add(melon);

  // One small kraft produce cone on the counter so the stall reads as a
  // farm stand with wrapped greens, not only melon + crate. Local offset
  // only — stall world pose stays put. PAPER boxes. Kraft wrap + leaf nub.
  const cone = new THREE.Group();
  cone.name = "cone";
  cone.userData.part = "cone";
  cone.userData.mode = "PAPER";
  cone.userData.paper = true;
  cone.position.set(-0.42, 0.9, 1.05);
  const coneBase = paperBox(0.14, 0.08, 0.14, KRAFT, false);
  coneBase.position.y = 0.04;
  coneBase.userData.part = "cone";
  const coneMid = paperBox(0.1, 0.08, 0.1, KRAFT, false);
  coneMid.position.y = 0.12;
  coneMid.userData.part = "cone";
  const coneNub = paperBox(0.05, 0.06, 0.05, LEAF, false);
  coneNub.position.y = 0.19;
  coneNub.userData.part = "cone";
  cone.add(coneBase, coneMid, coneNub);
  g.add(cone);

  for (const x of [-1.85, 1.85]) {
    for (const z of [-1.05, 1.05]) {
      const post = paperBox(0.14, 2.2, 0.14, WOOD_POST, false);
      post.position.set(x, 1.18, z);
      post.userData.part = "post";
      g.add(post);
    }
  }

  // Small kraft price board on each front stall post so the stand reads as a
  // shop, not only an awning. Wood frame + cream face. Local offset only —
  // stall world pose stays put. Buy API unchanged.
  for (const x of [-1.85, 1.85]) {
    const price = new THREE.Group();
    price.name = "price-board";
    price.userData.part = "price-board";
    price.userData.mode = "PAPER";
    price.userData.paper = true;
    price.position.set(x, 1.38, 1.16);
    const peg = paperBox(0.05, 0.05, 0.12, WOOD, false);
    peg.position.set(0, 0.14, -0.02);
    peg.userData.part = "price-board";
    const frame = paperBox(0.36, 0.48, 0.05, WOOD, false);
    frame.position.set(0, 0, 0.08);
    frame.userData.part = "price-board";
    const face = paperBox(0.28, 0.38, 0.03, KRAFT, false);
    face.position.set(0, 0, 0.12);
    face.userData.part = "price-board";
    price.add(peg, frame, face);
    g.add(price);
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

  // Kraft produce basket under the awning so the stall reads as a farm stand,
  // not only crate + scale. Wood body, terracotta / leaf goods. Right of the
  // sign, over the counter. Local offset only — stall world pose stays put.
  const basket = new THREE.Group();
  basket.name = "produce-basket";
  basket.userData.part = "produce-basket";
  basket.userData.mode = "PAPER";
  basket.userData.paper = true;
  basket.position.set(1.18, 1.76, 0.88);
  const basketCord = paperBox(0.025, 0.24, 0.025, FRAME, false);
  basketCord.position.y = 0.15;
  basketCord.userData.part = "produce-basket";
  const basketHandle = paperBox(0.2, 0.03, 0.03, WOOD, false);
  basketHandle.position.y = 0.02;
  basketHandle.userData.part = "produce-basket";
  const basketBody = paperBox(0.26, 0.12, 0.2, WOOD, false);
  basketBody.position.y = -0.07;
  basketBody.userData.part = "produce-basket";
  const basketRim = paperBox(0.28, 0.03, 0.22, CRATE_A, false);
  basketRim.position.y = 0.0;
  basketRim.userData.part = "produce-basket";
  const tomato = paperBox(0.09, 0.07, 0.09, TERRACOTTA, false);
  tomato.position.set(-0.05, 0.04, 0);
  tomato.userData.part = "produce-basket";
  const greens = paperBox(0.08, 0.08, 0.08, LEAF, false);
  greens.position.set(0.05, 0.045, 0.02);
  greens.userData.part = "produce-basket";
  basket.add(basketCord, basketHandle, basketBody, basketRim, tomato, greens);
  g.add(basket);

  // Small hanging oil lantern under the awning so the stand reads as a
  // dusk market stall, not a street-lamp post. Wood hood + warm kraft glass.
  // Local offset only — stall world pose stays put.
  const lantern = new THREE.Group();
  lantern.name = "lantern";
  lantern.userData.part = "lantern";
  lantern.userData.mode = "PAPER";
  lantern.userData.paper = true;
  lantern.position.set(0, 1.9, 0.42);
  const lanternCord = paperBox(0.025, 0.2, 0.025, FRAME, false);
  lanternCord.position.y = 0.16;
  lanternCord.userData.part = "lantern";
  const lanternBail = paperBox(0.1, 0.03, 0.03, WOOD, false);
  lanternBail.position.y = 0.05;
  lanternBail.userData.part = "lantern";
  const lanternHood = paperBox(0.16, 0.04, 0.16, WOOD, false);
  lanternHood.position.y = 0.02;
  lanternHood.userData.part = "lantern";
  const lanternGlass = paperBox(0.11, 0.13, 0.11, WARM_GLASS, false);
  lanternGlass.position.y = -0.07;
  lanternGlass.userData.part = "lantern";
  const lanternPane = paperBox(0.08, 0.1, 0.08, KRAFT, false);
  lanternPane.position.y = -0.07;
  lanternPane.userData.part = "lantern";
  const lanternBase = paperBox(0.14, 0.03, 0.14, WOOD, false);
  lanternBase.position.y = -0.15;
  lanternBase.userData.part = "lantern";
  lantern.add(lanternCord, lanternBail, lanternHood, lanternGlass, lanternPane, lanternBase);
  g.add(lantern);

  // One small kraft price slate hanging on the stall front — lantern already
  // hangs under the awning, so this is the cream ticket instead of a second
  // lamp. Wood frame + plaster cream face. Local offset only — stall world
  // pose stays put. PAPER boxes. Existing hexes. Melon, cone, lantern, fish,
  // and ground crate stay put.
  const slate = new THREE.Group();
  slate.name = "slate";
  slate.userData.part = "slate";
  slate.userData.mode = "PAPER";
  slate.userData.paper = true;
  slate.position.set(0, 1.52, 1.30);
  const slateCord = paperBox(0.02, 0.12, 0.02, WOOD, false);
  slateCord.position.y = 0.22;
  slateCord.userData.part = "slate";
  const slateFrame = paperBox(0.28, 0.34, 0.04, WOOD, false);
  slateFrame.userData.part = "slate";
  const slateFace = paperBox(0.22, 0.26, 0.03, PLASTER, false);
  slateFace.position.set(0, 0, 0.035);
  slateFace.userData.part = "slate";
  slate.add(slateCord, slateFrame, slateFace);
  g.add(slate);

  // One small kraft hanging fish under the awning, offset from the lantern,
  // so the stall reads as a harbour stand. PAPER body + tail boxes. Harbour
  // teal already in this file (silver-teal 0x8ec4d4 is not imported here).
  // Local offset only — stall world pose stays put. Melon, cone, lantern,
  // scale, and basket stay put.
  const fish = new THREE.Group();
  fish.name = "fish";
  fish.userData.part = "fish";
  fish.userData.mode = "PAPER";
  fish.userData.paper = true;
  fish.position.set(0.58, 1.86, 0.18);
  const fishCord = paperBox(0.02, 0.16, 0.02, FRAME, false);
  fishCord.position.y = 0.12;
  fishCord.userData.part = "fish";
  const fishBody = paperBox(0.2, 0.07, 0.1, TEAL, false);
  fishBody.position.set(0.02, -0.02, 0);
  fishBody.userData.part = "fish";
  const fishTail = paperBox(0.08, 0.06, 0.08, TEAL, false);
  fishTail.position.set(-0.12, -0.02, 0);
  fishTail.userData.part = "fish";
  fish.add(fishCord, fishBody, fishTail);
  g.add(fish);

  // One small kraft crate on the ground beside the stall so the stand reads
  // as a working market, not only counter goods. Local offset only — stall
  // world pose stays put. PAPER boxes. WOOD / CRATE hexes already in this
  // file. Not on the counter. Melon, cone, lantern, and fish stay put.
  const groundCrate = new THREE.Group();
  groundCrate.name = "ground-crate";
  groundCrate.userData.part = "ground-crate";
  groundCrate.userData.mode = "PAPER";
  groundCrate.userData.paper = true;
  groundCrate.position.set(2.42, 0, 1.05);
  const groundBody = paperBox(0.38, 0.24, 0.36, CRATE_A, false);
  groundBody.position.y = 0.12;
  groundBody.userData.part = "ground-crate";
  const groundRim = paperBox(0.4, 0.03, 0.38, WOOD, false);
  groundRim.position.y = 0.225;
  groundRim.userData.part = "ground-crate";
  const groundLid = paperBox(0.34, 0.04, 0.32, CRATE_B, false);
  groundLid.position.y = 0.26;
  groundLid.userData.part = "ground-crate";
  groundCrate.add(groundBody, groundRim, groundLid);
  g.add(groundCrate);

  // One small kraft stool on the ground beside the stall so the stand
  // reads as a working market, not only counter goods. WOOD seat + legs.
  // Local offset only — stall world pose stays put. PAPER boxes. Existing
  // hexes. Opposite the ground crate. Melon, cone, lantern, hanging fish,
  // ground crate, and price slate stay put.
  if (!g.children.some((c) => c.userData.part === "stool")) {
    const stool = new THREE.Group();
    stool.name = "stool";
    stool.userData.part = "stool";
    stool.userData.mode = "PAPER";
    stool.userData.paper = true;
    stool.position.set(-2.42, 0, 1.05);
    const seat = paperBox(0.28, 0.05, 0.28, WOOD, false);
    seat.position.y = 0.36;
    seat.userData.part = "stool";
    stool.add(seat);
    for (const [dx, dz] of [
      [-0.09, -0.09],
      [0.09, -0.09],
      [-0.09, 0.09],
      [0.09, 0.09],
    ]) {
      const leg = paperBox(0.05, 0.34, 0.05, WOOD, false);
      leg.position.set(dx, 0.17, dz);
      leg.userData.part = "stool";
      stool.add(leg);
    }
    g.add(stool);
  }

  // One tiny kraft PAPER cup on the counter so the stall reads as a
  // working stand, not only produce. WOOD handle + kraft body. Local
  // offset only — stall world pose stays put. PAPER boxes. Existing
  // hexes. Offset from melon, cone, lantern, fish, slate, stool, scale.
  if (!g.children.some((c) => c.userData.part === "cup")) {
    const cup = new THREE.Group();
    cup.name = "cup";
    cup.userData.part = "cup";
    cup.userData.mode = "PAPER";
    cup.userData.paper = true;
    cup.position.set(0.38, 0.9, 1.05);
    const cupBody = paperBox(0.08, 0.09, 0.08, KRAFT, false);
    cupBody.position.y = 0.045;
    cupBody.userData.part = "cup";
    const cupRim = paperBox(0.09, 0.02, 0.09, KRAFT, false);
    cupRim.position.y = 0.1;
    cupRim.userData.part = "cup";
    const cupHandle = paperBox(0.025, 0.05, 0.025, WOOD, false);
    cupHandle.position.set(0.055, 0.05, 0);
    cupHandle.userData.part = "cup";
    cup.add(cupBody, cupRim, cupHandle);
    g.add(cup);
  }

  // One tiny kraft PAPER knife on the counter so the stall reads as a
  // working stand, not only produce. WOOD handle + kraft blade. Local
  // offset only — stall world pose stays put. PAPER boxes. Existing
  // hexes. Offset from stool, cup, melon, cone, lantern, fish, slate,
  // scale, and ground crate.
  if (!g.children.some((c) => c.userData.part === "knife")) {
    const knife = new THREE.Group();
    knife.name = "knife";
    knife.userData.part = "knife";
    knife.userData.mode = "PAPER";
    knife.userData.paper = true;
    knife.position.set(-0.72, 0.9, 1.05);
    const blade = paperBox(0.14, 0.015, 0.03, KRAFT, false);
    blade.position.set(0.05, 0.015, 0);
    blade.userData.part = "knife";
    const handle = paperBox(0.06, 0.025, 0.03, WOOD, false);
    handle.position.set(-0.05, 0.018, 0);
    handle.userData.part = "knife";
    knife.add(blade, handle);
    g.add(knife);
  }

  // One tiny kraft PAPER napkin on the counter so the stall reads as a
  // working stand, not only produce. Kraft sheet + plaster fold. Local
  // offset only — stall world pose stays put. PAPER boxes. Existing
  // hexes. Offset from knife, cup, stool, melon, cone.
  if (!g.children.some((c) => c.userData.part === "napkin")) {
    const napkin = new THREE.Group();
    napkin.name = "napkin";
    napkin.userData.part = "napkin";
    napkin.userData.mode = "PAPER";
    napkin.userData.paper = true;
    napkin.position.set(0.64, 0.9, 1.05);
    const sheet = paperBox(0.11, 0.01, 0.09, KRAFT, false);
    sheet.position.y = 0.005;
    sheet.userData.part = "napkin";
    const fold = paperBox(0.08, 0.01, 0.07, PLASTER, false);
    fold.position.set(0.01, 0.013, 0.005);
    fold.userData.part = "napkin";
    napkin.add(sheet, fold);
    g.add(napkin);
  }

  // One tiny kraft PAPER plate on the counter so the stall reads as a
  // working stand, not only produce. Kraft rim + plaster well. Local
  // offset only — stall world pose stays put. PAPER boxes. Existing
  // hexes. Offset from napkin, knife, cup, stool.
  if (!g.children.some((c) => c.userData.part === "plate")) {
    const plate = new THREE.Group();
    plate.name = "plate";
    plate.userData.part = "plate";
    plate.userData.mode = "PAPER";
    plate.userData.paper = true;
    plate.position.set(1.36, 0.9, 1.05);
    const rim = paperBox(0.12, 0.012, 0.12, KRAFT, false);
    rim.position.y = 0.006;
    rim.userData.part = "plate";
    const well = paperBox(0.08, 0.01, 0.08, PLASTER, false);
    well.position.y = 0.014;
    well.userData.part = "plate";
    plate.add(rim, well);
    g.add(plate);
  }

  // One tiny kraft PAPER lemon on the counter so the stall reads as a
  // working stand, not only produce. Corn body + leaf stem. Local
  // offset only — stall world pose stays put. PAPER boxes. Existing
  // hexes. Offset from plate, napkin, knife, cup, stool.
  if (!g.children.some((c) => c.userData.part === "lemon")) {
    const lemon = new THREE.Group();
    lemon.name = "lemon";
    lemon.userData.part = "lemon";
    lemon.userData.mode = "PAPER";
    lemon.userData.paper = true;
    lemon.position.set(-0.08, 0.9, 1.05);
    const body = paperBox(0.09, 0.08, 0.08, CORN, false);
    body.position.y = 0.04;
    body.userData.part = "lemon";
    const stem = paperBox(0.025, 0.03, 0.025, LEAF, false);
    stem.position.y = 0.095;
    stem.userData.part = "lemon";
    lemon.add(body, stem);
    g.add(lemon);
  }

  // One tiny kraft PAPER lime on the counter so the stall reads as a
  // working stand, not only produce. Leaf body + terracotta stem. Local
  // offset only — stall world pose stays put. PAPER boxes. Existing
  // hexes. Offset from lemon, plate, napkin, knife, cup, stool.
  if (!g.children.some((c) => c.userData.part === "lime")) {
    const lime = new THREE.Group();
    lime.name = "lime";
    lime.userData.part = "lime";
    lime.userData.mode = "PAPER";
    lime.userData.paper = true;
    lime.position.set(1.64, 0.9, 1.05);
    const body = paperBox(0.08, 0.07, 0.07, LEAF, false);
    body.position.y = 0.035;
    body.userData.part = "lime";
    const stem = paperBox(0.02, 0.025, 0.02, TERRACOTTA, false);
    stem.position.y = 0.085;
    stem.userData.part = "lime";
    lime.add(body, stem);
    g.add(lime);
  }

  // One tiny kraft PAPER orange on the counter so the stall reads as a
  // working stand, not only produce. Terracotta body + leaf stem. Local
  // offset only — stall world pose stays put. PAPER boxes. Existing
  // hexes. Offset from lime, lemon, plate, napkin, knife, cup, stool.
  if (!g.children.some((c) => c.userData.part === "orange")) {
    const orange = new THREE.Group();
    orange.name = "orange";
    orange.userData.part = "orange";
    orange.userData.mode = "PAPER";
    orange.userData.paper = true;
    orange.position.set(-1.22, 0.9, 1.05);
    const body = paperBox(0.08, 0.07, 0.07, TERRACOTTA, false);
    body.position.y = 0.035;
    body.userData.part = "orange";
    const stem = paperBox(0.02, 0.025, 0.02, LEAF, false);
    stem.position.y = 0.085;
    stem.userData.part = "orange";
    orange.add(body, stem);
    g.add(orange);
  }

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
