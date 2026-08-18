/**
 * One-shot audit of every South paved edge and join.
 * Run: cd game && npx tsx scripts/audit-roads.ts
 */
import { createLandBoard } from "../src/land.ts";
import { ROAD_TURN_DEG } from "../src/southGeom.ts";
import { isDirtClass, roadWidthM } from "../src/roadGraph.ts";
import { roadClassSpec } from "../public/harbour/roadclass.js";
import { junctionPad, trimPolylineForPads } from "../public/harbour/roadnet.js";
import { buildHubFootprint, multiContains } from "../public/harbour/roadfoot.js";

type XZ = { x: number; z: number };

function hypot(a: XZ, b: XZ) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function edgeLen(pts: XZ[]) {
  let n = 0;
  for (let i = 0; i < pts.length - 1; i++) n += hypot(pts[i]!, pts[i + 1]!);
  return n;
}

function nodeById(graph: { nodes: { id: string }[] }, id: string) {
  return graph.nodes.find((n) => n.id === id);
}

function armDir(node: XZ & { id: string }, edge: { a: string; points: XZ[] }) {
  const pts = edge.points;
  const fromA = edge.a === node.id;
  const a = fromA ? pts[0]! : pts[pts.length - 1]!;
  const b = fromA ? pts[1]! : pts[pts.length - 2]!;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len };
}

function angleDeg(a: XZ, b: XZ) {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.z * b.z));
  return (Math.acos(dot) * 180) / Math.PI;
}

const board = createLandBoard();
const graph = board.graph;
const southNodes = graph.nodes.filter((n) => n.island === "south");
const southEdges = graph.edges.filter((e) => e.island === "south");
const paved = southEdges.filter((e) => !isDirtClass(e.cls));
const dirt = southEdges.filter((e) => isDirtClass(e.cls));

const lines: string[] = [];
const fail: string[] = [];
function note(s: string) {
  lines.push(s);
}
function issue(s: string) {
  fail.push(s);
  lines.push("ISSUE  " + s);
}

note(`South nodes ${southNodes.length}  paved edges ${paved.length}  dirt ${dirt.length}`);
note(
  `point counts: ` +
    [2, 3, 4, 5]
      .map((n) => `${n}pt=${paved.filter((e) => e.points.length === n).length}`)
      .join(" ") +
      `  6+=${paved.filter((e) => e.points.length >= 6).length}`,
);

const twoPt = paved.filter((e) => e.points.length < 3);
note(`paved edges with <3 points (trim currently no-ops): ${twoPt.length}`);
for (const e of twoPt) {
  const a = nodeById(graph, e.a);
  const b = nodeById(graph, e.b);
  note(
    `  ${e.id} ${e.name} ${e.cls} pts=${e.points.length} len=${edgeLen(e.points).toFixed(1)}m  ${e.a}(${a?.kind})→${e.b}(${b?.kind})`,
  );
}

const skipTrim: string[] = [];
const trimOk: string[] = [];
for (const e of paved) {
  const a = nodeById(graph, e.a)!;
  const b = nodeById(graph, e.b)!;
  const padA = junctionPad(graph, a);
  const padB = junctionPad(graph, b);
  const wantA = padA ? padA.trim[e.id] || 0 : 0;
  const wantB = padB ? padB.trim[e.id] || 0 : 0;
  if (wantA <= 0.5 && wantB <= 0.5) continue;
  const trimmed = trimPolylineForPads(e.points, graph, e);
  const dA0 = hypot(e.points[0]!, a);
  const dB0 = hypot(e.points[e.points.length - 1]!, b);
  const dA1 = hypot(trimmed[0]!, a);
  const dB1 = hypot(trimmed[trimmed.length - 1]!, b);
  const movedA = wantA > 0.5 && dA1 > dA0 + 0.4;
  const movedB = wantB > 0.5 && dB1 > dB0 + 0.4;
  const label = `${e.name} ${e.id} pts=${e.points.length} wantA=${wantA.toFixed(2)} gotA=${dA1.toFixed(2)} wantB=${wantB.toFixed(2)} gotB=${dB1.toFixed(2)}`;
  if ((wantA > 0.5 && !movedA) || (wantB > 0.5 && !movedB)) skipTrim.push(label);
  else trimOk.push(label);
}
note(`joins that should trim: ${skipTrim.length + trimOk.length}  actually shortened: ${trimOk.length}  skipped: ${skipTrim.length}`);
for (const s of skipTrim) issue("trim skipped  " + s);

const legal = [...ROAD_TURN_DEG, 135, 150, 165, 180];
const badAng: string[] = [];
for (const node of southNodes) {
  if (node.kind === "circus") continue;
  const arms = paved.filter((e) => e.a === node.id || e.b === node.id);
  if (arms.length < 2) continue;
  const dirs = arms.map((e) => armDir(node, e));
  for (let i = 0; i < dirs.length; i++) {
    for (let j = i + 1; j < dirs.length; j++) {
      const deg = angleDeg(dirs[i]!, dirs[j]!);
      if (!legal.some((d) => Math.abs(deg - d) < 4)) {
        badAng.push(`${node.id} ${deg.toFixed(1)}°`);
      }
    }
  }
}
note(`illegal pairwise angles (>4° off 15/30/45/90/135/180): ${badAng.length}`);
for (const s of badAng) issue("angle  " + s);

const padNodes = southNodes.filter((n) => junctionPad(graph, n));
note(`junction pads: ${padNodes.length}`);
let hubGap = 0;
let sidewalkOnTarmac = 0;
let teeHairline = 0;
for (const node of padNodes) {
  const pad = junctionPad(graph, node)!;
  const foot = buildHubFootprint(graph, node, pad);
  if (!multiContains(foot.tarmac, node.x, node.z)) {
    issue(`hub tarmac misses node ${node.id}`);
  }
  const arms = paved.filter((e) => e.a === node.id || e.b === node.id);
  for (const e of arms) {
    const spec = roadClassSpec(e.cls);
    const trimM = pad.trim[e.id] || 0;
    const dir = armDir(node, e);
    if (trimM > 0.5) {
      const end = { x: node.x + dir.x * trimM, z: node.z + dir.z * trimM };
      const along = pad.along?.[e.id] ?? pad.side / 2 + 1.2;
      if (trimM > along + 0.05) {
        issue(`trim past hub ${node.id} ${e.name} trim=${trimM.toFixed(2)} along=${along.toFixed(2)}`);
      }
      if (!multiContains(foot.tarmac, end.x, end.z)) {
        hubGap += 1;
        issue(`hub misses trimmed ribbon end ${node.id} ${e.name} at ${trimM.toFixed(2)}m`);
      }
      const overlap = along - trimM;
      if (overlap < 1) {
        teeHairline += 1;
        issue(
          `ribbon/hub overlap only ${overlap.toFixed(2)}m at ${node.id} ${e.name} (trim ${trimM.toFixed(2)}, hub along ${along.toFixed(2)})`,
        );
      }
    }
    if (spec.sidewalkM > 0) {
      const walkR = spec.carriageM / 2 + 1.1 + spec.sidewalkM / 2;
      const alongM = pad.along?.[e.id] ?? pad.side / 2 + 1.2;
      const alongSample = Math.max(6, alongM - 0.8);
      const sample = {
        x: node.x + dir.x * alongSample + -dir.z * walkR,
        z: node.z + dir.z * alongSample + dir.x * walkR,
      };
      if (multiContains(foot.tarmac, sample.x, sample.z)) {
        sidewalkOnTarmac += 1;
        issue(`walk sample on hub tarmac ${node.id} ${e.name}`);
      }
    }
  }
}
note(`hub-miss-trim-end ${hubGap}  walk-on-tarmac ${sidewalkOnTarmac}  thin T overlap ${teeHairline}`);

const byName = new Map<string, typeof paved>();
for (const e of paved) {
  const list = byName.get(e.name) || [];
  list.push(e);
  byName.set(e.name, list);
}
note("named paved runs:");
for (const [name, list] of [...byName.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const m = list.reduce((n, e) => n + edgeLen(e.points), 0);
  note(`  ${name.padEnd(22)} n=${String(list.length).padStart(2)}  ${m.toFixed(0)}m  cls=${list[0]!.cls}`);
}

const streetPlots = board.plots.filter((p) => p.island === "south" && p.band === "street");
let onRoad = 0;
let farSetback = 0;
let flush = 0;
for (const plot of streetPlots) {
  const ring = plot.ring;
  if (!ring?.length) continue;
  let minD = Infinity;
  for (const e of paved) {
    const half = roadWidthM(e.cls) / 2;
    for (const [x, z] of ring) {
      for (let i = 0; i < e.points.length - 1; i++) {
        const a = e.points[i]!;
        const b = e.points[i + 1]!;
        const vx = b.x - a.x;
        const vz = b.z - a.z;
        const len2 = vx * vx + vz * vz || 1;
        let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
        t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t));
        minD = Math.min(minD, d - half);
      }
    }
  }
  if (minD < -0.4) onRoad += 1;
  else if (minD > 8) farSetback += 1;
  else flush += 1;
}
note(`south street lots ${streetPlots.length}: flush-ish ${flush}  overlap-tarmac ${onRoad}  setback>8m ${farSetback}`);
if (onRoad) issue(`${onRoad} street lots overlap tarmac`);

note("");
note(`ISSUES: ${fail.length}`);
for (const s of fail) note(" - " + s);
console.log(lines.join("\n"));
if (fail.length) process.exitCode = 1;
