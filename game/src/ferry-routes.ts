import { ISLANDS, type IslandId } from "./land.ts";
import type { Visitor } from "./sim.ts";
import { createStatuteCatalog, ferryTicketCost, type Statute } from "./statutes.ts";

export type FerryPoint = { x: number; z: number };

/** One crossing. Add rows later; do not special-case v1 in callers. */
export type FerryRoute = {
  id: string;
  from: IslandId;
  to: IslandId;
  /** PAPER ticket, visitor cash. */
  cost: number;
  /** World metres, quay to quay. Drawn on the paper sheet. */
  points: FerryPoint[];
};

const northPort = ISLANDS.north.port;
const southPort = ISLANDS.south.port;

export const FERRY_ROUTES: FerryRoute[] = [
  {
    id: "north-south",
    from: "north",
    to: "south",
    cost: 15,
    points: [
      { x: northPort.x, z: northPort.z },
      { x: northPort.x + 220, z: (northPort.z + southPort.z) / 2 },
      { x: southPort.x, z: southPort.z },
    ],
  },
];

function liveTicketCost(catalog?: Statute[]): number {
  return ferryTicketCost(catalog ?? createStatuteCatalog());
}

/** Geometry from FERRY_ROUTES; fare from statute `ferry_ticket` slider `cost`. */
export function listFerryRoutes(catalog?: Statute[]): FerryRoute[] {
  const cost = liveTicketCost(catalog);
  return FERRY_ROUTES.map((r) => ({ ...r, cost }));
}

export function getFerryRoute(id: string): FerryRoute | undefined {
  return FERRY_ROUTES.find((r) => r.id === id);
}

export function ferryRouteLabel(route: FerryRoute): string {
  const cap = (id: string) => id.slice(0, 1).toUpperCase() + id.slice(1);
  return `${cap(route.from)} ↔ ${cap(route.to)}`;
}

export function ferryDestination(route: FerryRoute, from: IslandId): IslandId | null {
  if (from === route.from) return route.to;
  if (from === route.to) return route.from;
  return null;
}

export type FerryConfirmOk = {
  ok: true;
  paid: number;
  from: IslandId;
  to: IslandId;
  routeId: string;
};

export type FerryConfirmFail = { ok: false; reason: string };

/**
 * Deduct PAPER fare. Caller teleports with `to`. Does not move the body.
 */
export function confirmFerry(
  visitor: Visitor,
  body: { routeId?: string; from?: string },
  catalog?: Statute[],
): FerryConfirmOk | FerryConfirmFail {
  const from = body.from;
  if (from !== "north" && from !== "south") return { ok: false, reason: "bad_from" };

  const route = body.routeId
    ? getFerryRoute(String(body.routeId))
    : FERRY_ROUTES.find((r) => r.from === from || r.to === from);
  if (!route) return { ok: false, reason: "no_route" };

  const to = ferryDestination(route, from);
  if (!to) return { ok: false, reason: "wrong_port" };

  const cost = liveTicketCost(catalog);
  if (visitor.cash < cost) return { ok: false, reason: "no_cash" };
  visitor.cash = Math.round((visitor.cash - cost) * 10000) / 10000;
  return { ok: true, paid: cost, from, to, routeId: route.id };
}
