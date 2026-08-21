import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GOOD_IDS } from "./goods.ts";
import { createLandBoard, developPlot, leasePlot, STARTER_CASH } from "./land.ts";
import { parseLandUse } from "./buildings.ts";
import { buyAtIsland } from "./buy.ts";
import { sellAtIsland } from "./sell.ts";
import { createVisitor, createWorld, hud, refreshWorldHud, tick } from "./sim.ts";
import { cancelOrder } from "./cancelOrder.ts";
import { listOpenOrders, placeAsk, placeBid } from "./orders.ts";
import { postStaff, staffMapSnapshot } from "./staff-http.ts";
import { bustFontUrls, bustHarbourAssets, bustModuleImports, harbourAssetNonce } from "./cache-bust.ts";
import { resolvePublicPath } from "./public-path.ts";
import { confirmFerry, listFerryRoutes } from "./ferry-routes.ts";
import { calendarHud } from "./calendar.ts";
import { createPresence, presenceQuery } from "./presence.ts";
import { walkSeededPresence } from "./presenceWalk.ts";
import { dumpCart } from "./visitorCart.ts";
import { startPersistLoop } from "./persistLoop.ts";
import { restoreLive } from "./persistRestore.ts";
import {
  KERNEL_VERSION,
  PLAYER_CAP,
  PLOT_CELL_M,
  VISITOR_ID,
  appendEvent,
  createEventLog,
  indexPlots,
  interestSnapshot,
  mineralsSnapshot,
} from "./kernel/index.ts";
import {
  hireStand,
  fireStand,
  markArrived,
  orderMarket,
  placeStand,
  pickupStand,
  playSnapshot,
  setStandPrice,
  stockStand,
  fuelStand,
  takeAll,
  upgradeStand,
  withdrawWarehouse,
  sellWarehouse,
  sellVisitorPlot,
  ensurePlay,
  isKnownSku,
  resetVisitorPlay,
  setVisitorLook,
  sellShiftBurst,
} from "./firstLoop.ts";
import { ALPHA_PLAY_WIPE, ALPHA_WIPE_NOTE, alphaRestoreRefuse } from "./alpha.ts";
import { footTrafficSnapshot } from "./footTraffic.ts";
import { completePackShift } from "./shiftBonus.ts";
import { salesTaxRate } from "./statutes.ts";
import { listingTape } from "./stocks.ts";
import {
  buyBuildingLand,
  buyRoom,
  fireUnitRole,
  fitUnitKit,
  hireUnitRole,
  isFurnitureKit,
  placeUnitKit,
  pickupUnitKit,
  scoutTenant,
  signLease,
} from "./units.ts";

function playPayload() {
  const islandHud = hud(world, visitor);
  return {
    ...playSnapshot(visitor, land, salesTaxRate(world.statutes), {
      moneySupply: islandHud.moneySupply,
      goodsProducedWindow: islandHud.goodsProducedWindow,
      priceIndex: islandHud.priceIndex,
      priceIndexNorth: islandHud.priceIndexNorth,
      priceIndexSouth: islandHud.priceIndexSouth,
      landPriceIndex: islandHud.landPriceIndex,
      ferrySpread: islandHud.ferrySpread,
      listings: listingTape(world.stocks),
    }),
    traffic: footTrafficSnapshot(land),
    cart: dumpCart(visitor.cart),
    lastPricesSouth: world.lastPriceSouth,
    goods: GOOD_IDS,
  };
}

function sinkCash(amount: number): void {
  if (!(amount > 0)) return;
  world.ledger.sink = Math.round((world.ledger.sink + amount) * 10000) / 10000;
}

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const publicDir = join(root, "public");
const port = Number(process.env.PORT ?? 8787);

let world = createWorld(7);
let visitor = createVisitor(STARTER_CASH);
let land = createLandBoard();
let events = createEventLog();
const presence = createPresence();
setInterval(() => tick(world, visitor, land), 1000);
setInterval(() => walkSeededPresence(presence), 1000);
const persist = startPersistLoop({
  getShard: () => ({ world, land, visitor, events }),
  intervalMs: 10_000,
});

function snapshot() {
  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: "Live sim HUD. Visitor cash is paper. Shared with harbour leases.",
    kernel: { version: KERNEL_VERSION, playerCap: PLAYER_CAP, plotCellM: PLOT_CELL_M },
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
    minerals: mineralsSnapshot(land.plots, visitor.stock),
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

  if (req.method === "GET" && url.pathname === "/api/kernel") {
    json(res, 200, {
      mode: "PAPER",
      provenance: "SIMULATED",
      note: "Shard kernel K.1. Player cap is a table size, not live sockets.",
      kernel: KERNEL_VERSION,
      playerCap: PLAYER_CAP,
      plotCellM: PLOT_CELL_M,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/minerals") {
    json(res, 200, mineralsSnapshot(land.plots, visitor.stock));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/interest") {
    const island = url.searchParams.get("island") === "south" ? "south" : "north";
    const x = Number(url.searchParams.get("x"));
    const z = Number(url.searchParams.get("z"));
    const radius = Number(url.searchParams.get("radius"));
    const byId = new Map(land.plots.map((p) => [p.id, p]));
    json(
      res,
      200,
      interestSnapshot({
        plotIndex: indexPlots(land.plots),
        plotsById: byId,
        presence,
        query: {
          island,
          x: Number.isFinite(x) ? x : 0,
          z: Number.isFinite(z) ? z : 0,
          radius: Number.isFinite(radius) && radius > 0 ? radius : PLOT_CELL_M * 2,
        },
      }),
    );
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
    if (ALPHA_PLAY_WIPE) {
      json(res, 400, alphaRestoreRefuse());
      return;
    }
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
      setEvents: (next) => {
        events = next;
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

  if (req.method === "GET" && url.pathname === "/api/play") {
    json(res, 200, playPayload());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/unit/buy") {
    const body = await readJsonBody(req);
    const result = buyRoom(visitor, String(body?.unitId ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/building/land") {
    const body = await readJsonBody(req);
    const result = buyBuildingLand(visitor, String(body?.buildingId ?? ""), land.plots);
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/unit/hire") {
    const body = await readJsonBody(req);
    const result = hireUnitRole(visitor, String(body?.unitId ?? ""), String(body?.role ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/unit/fire") {
    const body = await readJsonBody(req);
    const result = fireUnitRole(visitor, String(body?.unitId ?? ""), String(body?.role ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/unit/kit") {
    const body = await readJsonBody(req);
    const result = fitUnitKit(visitor, String(body?.unitId ?? ""), String(body?.kitId ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/unit/scout") {
    const body = await readJsonBody(req);
    const result = scoutTenant(visitor, String(body?.unitId ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/unit/lease") {
    const body = await readJsonBody(req);
    const result = signLease(visitor, String(body?.unitId ?? ""), String(body?.tenantId ?? ""), world.tick);
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/unit/place") {
    const body = await readJsonBody(req);
    const result = placeUnitKit(visitor, String(body?.unitId ?? ""), String(body?.kitId ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/unit/pickup") {
    const body = await readJsonBody(req);
    const result = pickupUnitKit(visitor, String(body?.unitId ?? ""), String(body?.kitId ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/market/order") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json", mode: "PAPER" });
      return;
    }
    const result = orderMarket(visitor, land, body);
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/delivery/arrive") {
    const body = await readJsonBody(req);
    const result = markArrived(visitor, String(body?.deliveryId ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/delivery/take") {
    const body = await readJsonBody(req);
    const result = takeAll(visitor, String(body?.deliveryId ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/inventory/place") {
    const body = await readJsonBody(req);
    const kitId = body?.kitId ? String(body.kitId) : "";
    const unitId = body?.unitId ? String(body.unitId) : "";
    const result =
      unitId || isFurnitureKit(kitId)
        ? placeUnitKit(visitor, unitId, kitId)
        : placeStand(visitor, land, String(body?.plotId ?? ""), {
            x: Number(body?.x),
            z: Number(body?.z),
            kitId: kitId || undefined,
            yaw: Number(body?.yaw),
          });
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/stand/stock") {
    const body = await readJsonBody(req);
    const result = stockStand(
      visitor,
      String(body?.standId ?? ""),
      Number(body?.qty ?? 0),
      body?.from ? String(body.from) : undefined,
    );
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/stand/fuel") {
    const body = await readJsonBody(req);
    const result = fuelStand(visitor, String(body?.standId ?? ""), body?.from ? String(body.from) : undefined);
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/stand/hire") {
    const body = await readJsonBody(req);
    const result = hireStand(visitor, String(body?.standId ?? ""), body?.personId ? String(body.personId) : undefined);
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/stand/fire") {
    const body = await readJsonBody(req);
    const result = fireStand(visitor, String(body?.standId ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/stand/price") {
    const body = await readJsonBody(req);
    const result = setStandPrice(visitor, String(body?.standId ?? ""), Number(body?.price));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/stand/upgrade") {
    const body = await readJsonBody(req);
    const result = upgradeStand(visitor, String(body?.standId ?? ""), body?.upgradeId ? String(body.upgradeId) : undefined);
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/shift/pack") {
    const body = await readJsonBody(req);
    const play = ensurePlay(visitor);
    if (!play.stands.length && !(play.workSites && play.workSites.length)) {
      json(res, 400, {
        ok: false,
        reason: "no_stand",
        mode: "PAPER",
        provenance: "SIMULATED",
        play: playPayload(),
      });
      return;
    }
    const standId = typeof body?.standId === "string" ? body.standId : "";
    const hiredSite =
      play.stands.find((s) => s.id === standId) || (play.workSites || []).find((s) => s.id === standId);
    if (hiredSite && hiredSite.hired) {
      json(res, 400, {
        ok: false,
        reason: "hired",
        mode: "PAPER",
        provenance: "SIMULATED",
        play: playPayload(),
      });
      return;
    }
    const tax0 = visitor.play?.salesTaxCollected ?? 0;
    const result = completePackShift(visitor, body || {});
    const burst =
      result.ok && standId ? sellShiftBurst(visitor, land, standId, result.hits) : { sold: 0, earned: 0, reason: result.ok ? "ok" : result.reason };
    sinkCash((visitor.play?.salesTaxCollected ?? tax0) - tax0);
    json(res, result.ok ? 200 : 400, {
      ...result,
      sold: burst.sold,
      earned: burst.earned,
      burstReason: burst.reason,
      play: playPayload(),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/warehouse/withdraw") {
    const body = await readJsonBody(req);
    const kind = String(body?.kind ?? "");
    if (!isKnownSku(kind)) {
      json(res, 400, { ok: false, reason: "unknown_sku", play: playPayload() });
      return;
    }
    const result = withdrawWarehouse(visitor, kind, Number(body?.qty ?? 0));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/warehouse/sell") {
    const body = await readJsonBody(req);
    const kind = String(body?.kind ?? "");
    if (!isKnownSku(kind)) {
      json(res, 400, { ok: false, reason: "unknown_sku", play: playPayload() });
      return;
    }
    const result = sellWarehouse(visitor, kind, Number(body?.qty ?? 0));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/stand/pickup") {
    const body = await readJsonBody(req);
    const result = pickupStand(visitor, land, String(body?.standId ?? ""));
    json(res, result.ok ? 200 : 400, { ...result, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/look") {
    const body = await readJsonBody(req);
    const look = setVisitorLook(visitor, body && typeof body === "object" ? body : {});
    json(res, 200, { ok: true, look, play: playPayload() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/play/reset") {
    resetVisitorPlay(land, visitor, "reset");
    persist.lastBlob = null;
    json(res, 200, { ok: true, play: playPayload(), note: ALPHA_WIPE_NOTE });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/play/delete") {
    resetVisitorPlay(land, visitor, "delete");
    persist.lastBlob = null;
    json(res, 200, { ok: true, play: playPayload(), note: ALPHA_WIPE_NOTE });
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
    if (result.ok) {
      sinkCash(result.paid);
      refreshWorldHud(world, visitor, land);
      appendEvent(events, {
        tick: world.tick,
        kind: "lease",
        playerId: VISITOR_ID,
        plotId: result.plot.id,
      });
    }
    json(res, result.ok ? 200 : 400, {
      ...result,
      snapshot: staffMapSnapshot(land, visitor),
      play: playPayload(),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/plot/sell") {
    const body = await readJsonBody(req);
    if (!body) {
      json(res, 400, { ok: false, reason: "bad_json" });
      return;
    }
    const result = sellVisitorPlot(visitor, land, String(body.plotId ?? ""));
    json(res, result.ok ? 200 : 400, {
      ...result,
      snapshot: staffMapSnapshot(land, visitor),
      play: playPayload(),
    });
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
    if (result.ok) {
      appendEvent(events, {
        tick: world.tick,
        kind: "develop",
        playerId: VISITOR_ID,
        plotId: result.plot.id,
        detail: use,
      });
    }
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
    if (result.ok && result.slot) {
      appendEvent(events, {
        tick: world.tick,
        kind: body.action === "fire" ? "fire" : "hire",
        playerId: VISITOR_ID,
        plotId: result.slot.plotId,
      });
    }
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
    if (ext === ".woff2") {
      headers["access-control-allow-origin"] = "*";
      headers["cache-control"] = "no-store, no-cache, must-revalidate";
    }
    if (ext === ".js" || ext === ".css" || ext === ".html") {
      headers["cache-control"] = "no-store, no-cache, must-revalidate";
      headers["pragma"] = "no-cache";
      headers["expires"] = "0";
    }
    const nonce = harbourAssetNonce(join(publicDir, "harbour"));
    if (ext === ".html") {
      data = bustHarbourAssets(data.toString("utf8"), nonce);
    }
    if (ext === ".css" && pathname.startsWith("/harbour/")) {
      data = bustFontUrls(data.toString("utf8"), nonce);
    }
    if (ext === ".js" && pathname.startsWith("/harbour/")) {
      data = bustModuleImports(data.toString("utf8"), nonce);
    }
    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`2Isles harbour on http://0.0.0.0:${port}`);
});
