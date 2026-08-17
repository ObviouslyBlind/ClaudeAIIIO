import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GOOD_IDS } from "./goods.ts";
import { createLandBoard, developPlot, leasePlot } from "./land.ts";
import { parseLandUse } from "./buildings.ts";
import { buyAtIsland } from "./buy.ts";
import { sellAtIsland } from "./sell.ts";
import { createVisitor, createWorld, hud, tick } from "./sim.ts";
import { cancelOrder } from "./cancelOrder.ts";
import { listOpenOrders, placeAsk, placeBid } from "./orders.ts";
import { postStaff, staffMapSnapshot } from "./staff-http.ts";
import { ASSET_NONCE, bustHarbourAssets, bustModuleImports } from "./cache-bust.ts";
import { resolvePublicPath } from "./public-path.ts";
import { confirmFerry, listFerryRoutes } from "./ferry-routes.ts";
import { calendarHud } from "./calendar.ts";
import { createPresence, presenceQuery } from "./presence.ts";
import { walkSeededPresence } from "./presenceWalk.ts";
import { dumpCart } from "./visitorCart.ts";
import { startPersistLoop } from "./persistLoop.ts";
import { restoreLive } from "./persistRestore.ts";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const publicDir = join(root, "public");
const port = Number(process.env.PORT ?? 8787);

let world = createWorld(7);
let visitor = createVisitor(1_000);
let land = createLandBoard();
const presence = createPresence();
setInterval(() => tick(world, visitor, land), 1000);
setInterval(() => walkSeededPresence(presence), 1000);
const persist = startPersistLoop({
  getShard: () => ({ world, land, visitor }),
  intervalMs: 10_000,
});

function snapshot() {
  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: "Live sim HUD. Visitor cash is paper. Shared with harbour leases.",
    hud: hud(world, visitor),
    calendar: calendarHud(world.tick),
    lastPrices: world.lastPrice,
    lastPricesSouth: world.lastPriceSouth,
    arbSpread: world.arbSpread,
    visitor: {
      cash: visitor.cash,
      stock: visitor.stock,
      goods: visitor.goods,
      staffSlots: visitor.staffSlots,
      cart: dumpCart(visitor.cart),
    },
    staffSlots: visitor.staffSlots,
    visitorOrders: listOpenOrders(visitor),
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

  if (req.method === "GET" && url.pathname === "/api/statutes") {
    json(res, 200, {
      mode: "PAPER",
      provenance: "SIMULATED",
      note: "Starter catalog. Players amend rows. They do not author from blank paper.",
      statutes: world.statutes,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/snapshot") {
    json(res, 200, snapshot());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/persist") {
    if (!persist.lastBlob) {
      res.writeHead(204);
      res.end();
      return;
    }
    json(res, 200, persist.lastBlob);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/persist/restore") {
    const result = restoreLive(() => persist.lastBlob, {
      setWorld: (next) => {
        world = next;
      },
      setLand: (next) => {
        land = next;
      },
      setVisitor: (next) => {
        visitor = next;
      },
    });
    json(res, result.ok ? 200 : 400, result);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/presence") {
    json(res, 200, presenceQuery(presence, {
      x: url.searchParams.get("x"),
      z: url.searchParams.get("z"),
      radius: url.searchParams.get("radius"),
    }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/map") {
    json(res, 200, staffMapSnapshot(land, visitor));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/lease") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json" });
      return;
    }
    const result = leasePlot(land, visitor, String(body.plotId ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, snapshot: staffMapSnapshot(land, visitor) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/develop") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json" });
      return;
    }
    const use = parseLandUse(body.use);
    if (!use) {
      json(res, 400, { ok: false, reason: "bad_use", snapshot: staffMapSnapshot(land, visitor) });
      return;
    }
    const result = developPlot(land, visitor, String(body.plotId ?? ""), use);
    json(res, result.ok ? 200 : 400, { ...result, snapshot: staffMapSnapshot(land, visitor) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/staff") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json", mode: "PAPER" });
      return;
    }
    const result = postStaff(land, visitor, body);
    json(res, result.ok ? 200 : 400, result);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/ferry") {
    json(res, 200, {
      mode: "PAPER",
      provenance: "SIMULATED",
      note: "Quote only. Confirm deducts visitor cash, then the client spawnAt the other quay.",
      routes: listFerryRoutes(world.statutes),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/ferry") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json" });
      return;
    }
    const result = confirmFerry(
      visitor,
      {
        routeId: body.routeId != null ? String(body.routeId) : undefined,
        from: body.from != null ? String(body.from) : undefined,
      },
      world.statutes,
    );
    json(res, result.ok ? 200 : 400, { ...result, snapshot: staffMapSnapshot(land, visitor) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/order/cancel") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json", mode: "PAPER" });
      return;
    }
    const result = cancelOrder(world, visitor, body.orderId ?? body.id);
    json(res, result.ok ? 200 : 400, { ...result, snapshot: snapshot() });
    return;
  }

  const cancelMatch = /^\/api\/order\/([^/]+)$/.exec(url.pathname);
  if (req.method === "DELETE" && cancelMatch) {
    const result = cancelOrder(world, visitor, cancelMatch[1]);
    json(res, result.ok ? 200 : 400, { ...result, snapshot: snapshot() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/order") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json", mode: "PAPER" });
      return;
    }
    const intent = {
      island: body.island,
      goodId: body.goodId ?? body.good,
      price: Number(body.price),
      qty: Number(body.qty ?? 1),
    };
    const result =
      body.side === "ask"
        ? placeAsk(world, visitor, intent)
        : body.side === "bid"
          ? placeBid(world, visitor, intent)
          : { ok: false as const, reason: "bad_side", mode: "PAPER" as const, provenance: "SIMULATED" as const };
    json(res, result.ok ? 200 : 400, { ...result, snapshot: snapshot() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/buy") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json" });
      return;
    }
    const result = buyAtIsland(world, visitor, {
      island: body.island ?? "north",
      goodId: body.goodId ?? body.good,
      qty: body.qty ?? 1,
    });
    json(res, result.ok ? 200 : 400, { ...result, snapshot: snapshot() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/sell") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json" });
      return;
    }
    const result = sellAtIsland(world, visitor, {
      island: body.island ?? "north",
      goodId: body.goodId ?? body.good,
      qty: body.qty ?? 1,
    });
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

  const pathname = resolvePublicPath(url.pathname);

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
      headers["cache-control"] = "no-store, no-cache, must-revalidate";
      headers["pragma"] = "no-cache";
      headers["expires"] = "0";
    }
    if (ext === ".html") {
      data = bustHarbourAssets(data.toString("utf8"), ASSET_NONCE);
    }
    if (ext === ".js" && pathname.startsWith("/harbour/")) {
      data = bustModuleImports(data.toString("utf8"), ASSET_NONCE);
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
