import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import { roadsideDrop, SHOULDER_M } from "./roadside.ts";
import { KIND, VIEWERS } from "./labels.ts";

describe("roadside drop (PAPER)", () => {
  it("puts the crate on the verge of a named paved road, not on the plot centroid", () => {
    const land = createLandBoard();
    const plot = land.plots.find((p) => p.island === "south" && p.band === "street" && !p.owner);
    expect(plot).toBeTruthy();
    const drop = roadsideDrop(land.roads, "south", plot!.x, plot!.z);
    expect(drop).toBeTruthy();
    expect(drop!.roadName.length).toBeGreaterThan(2);
    expect(drop!.island).toBe("south");
    const offPlot = Math.hypot(drop!.x - plot!.x, drop!.z - plot!.z);
    expect(offPlot).toBeGreaterThan(2);
    const offCurb = Math.hypot(drop!.x - drop!.curbX, drop!.z - drop!.curbZ);
    expect(offCurb).toBeCloseTo(SHOULDER_M, 5);
    const away = Math.hypot(drop!.awayX - drop!.curbX, drop!.awayZ - drop!.curbZ);
    expect(away).toBeGreaterThan(20);
  });
});

describe("labelled kinds", () => {
  it("keeps viewer ids and mesh kinds stable for island redesign", () => {
    expect(VIEWERS).toEqual(["world", "lots", "foot", "logistics", "minerals"]);
    expect(KIND.crate).toBe("crate");
    expect(KIND.van).toBe("van");
    expect(KIND.parcelFill).toBe("parcel-fill");
    expect(KIND.footRoad).toBe("foot-road");
    expect(KIND.road).toBe("road");
  });
});
