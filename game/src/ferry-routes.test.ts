import { describe, expect, it } from "vitest";
import { createVisitor } from "./sim.ts";
import { createStatuteCatalog, setStatuteSlider } from "./statutes.ts";
import {
  confirmFerry,
  ferryDestination,
  ferryRouteLabel,
  FERRY_ROUTES,
  listFerryRoutes,
} from "./ferry-routes.ts";

describe("ferry routes", () => {
  it("lists one North–South crossing", () => {
    const routes = listFerryRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0]!.id).toBe(FERRY_ROUTES[0]!.id);
    const crossing = routes[0]!;
    expect(crossing.id).toBe("north-south");
    expect(crossing.from).toBe("north");
    expect(crossing.to).toBe("south");
    expect(crossing.cost).toBe(15);
    expect(crossing.points.length).toBeGreaterThanOrEqual(2);
    const a = crossing.points[0]!;
    const b = crossing.points[crossing.points.length - 1]!;
    expect(Math.abs(b.z - a.z)).toBeGreaterThan(12000);
    expect(ferryRouteLabel(crossing)).toBe("North ↔ South");
    expect(ferryDestination(crossing, "north")).toBe("south");
    expect(ferryDestination(crossing, "south")).toBe("north");
  });

  it("confirm without cash fails", () => {
    const visitor = createVisitor(0);
    const result = confirmFerry(visitor, { from: "north", routeId: "north-south" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("no_cash");
    expect(visitor.cash).toBe(0);
  });

  it("confirm with cash teleports conceptually", () => {
    const visitor = createVisitor(40);
    const result = confirmFerry(visitor, { from: "north" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paid).toBe(15);
    expect(result.from).toBe("north");
    expect(result.to).toBe("south");
    expect(result.routeId).toBe("north-south");
    expect(visitor.cash).toBeCloseTo(25, 4);

    const back = confirmFerry(visitor, { from: "south", routeId: "north-south" });
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.paid).toBe(15);
    expect(back.to).toBe("north");
    expect(visitor.cash).toBeCloseTo(10, 4);
  });

  it("listFerryRoutes reports the live ferry_ticket cost slider", () => {
    const catalog = createStatuteCatalog();
    expect(listFerryRoutes(catalog)[0]!.cost).toBe(15);
    expect(setStatuteSlider(catalog, "ferry_ticket", "cost", 30)).toBe(true);
    expect(listFerryRoutes(catalog)[0]!.cost).toBe(30);
  });

  it("raising the ferry_ticket cost slider changes what confirmFerry deducts", () => {
    const catalog = createStatuteCatalog();
    expect(setStatuteSlider(catalog, "ferry_ticket", "cost", 22)).toBe(true);
    const visitor = createVisitor(40);
    const result = confirmFerry(visitor, { from: "north" }, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paid).toBe(22);
    expect(visitor.cash).toBeCloseTo(18, 4);
  });
});
