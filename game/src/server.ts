import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GOOD_IDS, type GoodId } from "./goods.ts";
import { createLandBoard, developPlot, landSnapshot, leasePlot } from "./land.ts";
import { buyFromStall, createVisitor, createWorld, hud, tick } from "./sim.ts";
import { bustHarbourAssets, bustModuleImports } from "./cache-bust.ts";
import { confirmFerry, listFerryRoutes } from "./ferry-routes.ts";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const publicDir = join(root, "public");
const port = Number(process.env.PORT ?? 8787);

const world = createWorld(7);
const visitor = createVisitor(1_000);
const land = createLandBoard();
setInterval(() => tick(world), 1000);

function snapshot() {
  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: "Live sim HUD. Visitor cash is paper. Shared with harbour leases.",
    hud: hud(world),
    lastPrices: world.lastPrice,
    visitor: {
      cash: visitor.cash,
      stock: visitor.stock,
    },
    goods: GOOD_IDS,
  };
}

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function json(res: { writeHead: Function; end: Function }, code: number, body: unknown) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: { [Symbol.asyncIterator]: () => AsyncIterator<unknown> }) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/snapshot") {
    json(res, 200, snapshot());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/map") {
    json(res, 200, landSnapshot(land, visitor));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/lease") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json" });
      return;
    }
    const result = leasePlot(land, visitor, String(body.plotId ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, snapshot: landSnapshot(land, visitor) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/develop") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json" });
      return;
    }
    const use = body.use === "farm" ? "farm" : "stall";
    const result = developPlot(land, visitor, String(body.plotId ?? ""), use);
    json(res, result.ok ? 200 : 400, { ...result, snapshot: landSnapshot(land, visitor) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/ferry") {
    json(res, 200, {
      mode: "PAPER",
      provenance: "SIMULATED",
      note: "Quote only. Confirm deducts visitor cash, then the client spawnAt the other quay.",
      routes: listFerryRoutes(),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/ferry") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json" });
      return;
    }
    const result = confirmFerry(visitor, {
      routeId: body.routeId != null ? String(body.routeId) : undefined,
      from: body.from != null ? String(body.from) : undefined,
    });
    json(res, result.ok ? 200 : 400, { ...result, snapshot: landSnapshot(land, visitor) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/buy") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json" });
      return;
    }
    const good = body.good as GoodId;
    const qty = Number(body.qty ?? 1);
    const result = buyFromStall(world, visitor, good, qty);
    json(res, result.ok ? 200 : 400, { ...result, snapshot: snapshot() });
    return;
  }

  if (url.pathname.startsWith("/vendor/") && !url.pathname.includes("..")) {
    const name = url.pathname.slice("/vendor/".length);
    try {
      const data = await readFile(join(root, "node_modules/three/build", name));
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("three.js missing — run npm install in game/");
    }
    return;
  }

  let pathname = url.pathname;
  if (pathname === "/") pathname = "/harbour/index.html";
  if (pathname === "/harbour" || pathname === "/harbour/") pathname = "/harbour/index.html";
  if (pathname === "/market" || pathname === "/market/") pathname = "/market/index.html";
  if (pathname === "/play" || pathname === "/play/") pathname = "/harbour/index.html";

  let filePath = join(publicDir, pathname);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  try {
    let data: Buffer | string = await readFile(filePath);
    const ext = extname(filePath);
    const headers: Record<string, string> = {
      "content-type": types[ext] ?? "application/octet-stream",
    };
    if (ext === ".js" || ext === ".css" || ext === ".html") {
      headers["cache-control"] = "no-store";
    }
    if (ext === ".html") {
      data = bustHarbourAssets(data.toString("utf8"));
    }
    if (ext === ".js" && pathname.startsWith("/harbour/")) {
      data = bustModuleImports(data.toString("utf8"));
    }
    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Two Harbors harbour on http://0.0.0.0:${port}`);
});
