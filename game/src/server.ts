import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GOOD_IDS, type GoodId } from "./goods.ts";
import { buyFromStall, createVisitor, createWorld, hud, tick } from "./sim.ts";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const publicDir = join(root, "public");
const port = Number(process.env.PORT ?? 8787);

const world = createWorld(7);
const visitor = createVisitor(1_000);
setInterval(() => tick(world), 1000);

function snapshot() {
  return {
    mode: "PAPER",
    provenance: "SIMULATED",
    note: "Live sim HUD. Not the 3D harbour. Visitor cash is paper.",
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
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/snapshot") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(snapshot()));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/buy") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    let body: { good?: string; qty?: number } = {};
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, reason: "bad_json" }));
      return;
    }
    const good = body.good as GoodId;
    const qty = Number(body.qty ?? 1);
    const result = buyFromStall(world, visitor, good, qty);
    res.writeHead(result.ok ? 200 : 400, { "content-type": "application/json" });
    res.end(JSON.stringify({ ...result, snapshot: snapshot() }));
    return;
  }

  let filePath = join(publicDir, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "content-type": types[extname(filePath)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Two Harbors paper HUD on http://0.0.0.0:${port}`);
});
